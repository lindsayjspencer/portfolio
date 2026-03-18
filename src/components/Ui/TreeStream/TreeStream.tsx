'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, useId, useReducer } from 'react';
import { STREAMING_MARKER } from './nested';
import { buildPlan, planSignature, type ExecutionUnit } from './plan';
import { useSequentialScheduler } from './useSequentialScheduler';
import { initialStreamState, streamReducer } from './reducer';

/**
 * TreeStream
 *
 * A client-only React component that renders its children incrementally over time.
 * It walks the provided React node tree into a linear execution plan of units:
 *  - text units (streamed by word or character)
 *  - instant units (regular React elements rendered immediately)
 *  - nested stream units (child TreeStream elements, coordinated by onComplete)
 *
 * Contract (inputs/outputs):
 *  - Props:
 *    - as: optional polymorphic element type; use 'fragment' for no wrapper
 *    - children: any renderable React nodes; fragments/arrays are flattened
 *    - speed: number of tokens per tick (tokens are words or characters)
 *    - interval: ms between ticks
 *    - streamBy: 'word' | 'character' determines tokenization of text units
 *    - autoStart: start streaming automatically when inputs/signature change
 *    - onComplete: called after the final unit completes (including nested)
 *  - DOM: adds data attributes for observability:
 *    - data-tree-stream, data-streaming, data-complete
 *  - SSR: client-only ('use client'); streaming occurs in the browser
 *
 * Notes:
 *  - Nested TreeStream children have autoStart forced to true, and their
 *    onComplete is composed so the parent resumes after the child completes.
 *  - A stable "plan signature" is used to reset the stream only when structure
 *    or text content changes; this limits unnecessary restarts.
 */

// ExecutionUnit is now imported from ./plan

/**
 * Props for TreeStream.
 * - speed: tokens per tick (>= 1). Tokens are words or characters per streamBy.
 * - interval: delay between ticks in ms.
 * - streamBy: tokenization strategy for text nodes.
 * - autoStart: if false, the component initializes idle until inputs change again or programmatically started in a future version.
 */
type OwnProps = {
	speed?: number;
	interval?: number;
	streamBy?: 'word' | 'character';
	autoStart?: boolean;
	onComplete?: () => void;
};

type AsProp<E extends React.ElementType> = { as?: E };
type PropsToOmit<E extends React.ElementType> = keyof (AsProp<E> & OwnProps);
type PolymorphicProps<E extends React.ElementType> = AsProp<E> &
	OwnProps &
	Omit<React.ComponentPropsWithoutRef<E>, PropsToOmit<E>>;
type FragmentPropsGuard<E extends React.ElementType> = E extends typeof React.Fragment
	? { className?: never; style?: never }
	: {};

export type TreeStreamProps<E extends React.ElementType = 'div'> = PolymorphicProps<E> & FragmentPropsGuard<E>;

// Stable instance id for keys (SSR-friendly and deterministic)
// Prefer useId over custom counters for readability and testability

// Helper to detect fragment usage
function isFragmentElementType(as: React.ElementType | undefined): as is typeof React.Fragment {
	return as === React.Fragment;
}

// buildPlan and planSignature are imported from ./plan

export function TreeStream<E extends React.ElementType = 'div'>({
	as,
	children,
	speed = 5,
	interval = 50,
	streamBy = 'word',
	autoStart = true,
	onComplete,
	...rest
}: TreeStreamProps<E>) {
	const instanceId = useId();

	// Keep latest onComplete in a ref to avoid effect resubscribes
	const onCompleteRef = useRef<(() => void) | undefined>(onComplete);
	useEffect(() => {
		onCompleteRef.current = onComplete;
	}, [onComplete]);

	// Build plan & a stable signature
	const plan = useMemo(() => buildPlan(children), [children]);
	const signature = useMemo(() => planSignature(plan), [plan]);

	// Store latest plan in a ref for the executor (avoids callback deps churn)
	const latestPlanRef = useRef<ExecutionUnit[]>(plan);
	useEffect(() => {
		latestPlanRef.current = plan;
	}, [plan]);

	// Centralized scheduler for timers and run guards
	const { schedule: scheduleNext, cancelAll, nextRunToken } = useSequentialScheduler();

	// Internal state managed via reducer
	const [state, dispatch] = useReducer(streamReducer, initialStreamState);
	const {
		unitIndex: currentUnit,
		waitingNested: isWaitingForNested,
		rendered: renderedMap,
		text,
		complete: isComplete,
	} = state;
	const activeTextUnitRef = useRef<number | null>(text.activeUnit);

	// Executor (reads latest plan from ref; stable callback)
	const runUnit = useCallback((unitIndex: number) => {
		const currentPlan = latestPlanRef.current;
		if (unitIndex >= plan.length) {
			dispatch({ type: 'COMPLETE' });
			onCompleteRef.current?.();
			return;
		}
		const unit = currentPlan[unitIndex];
		if (!unit) return;
		switch (unit.type) {
			case 'text_stream': {
				const units = streamBy === 'character' ? unit.content.split('') : unit.content.split(/(\s+)/);
				activeTextUnitRef.current = unitIndex;
				dispatch({ type: 'BEGIN_TEXT', unitIndex, tokens: units });
				break;
			}
			case 'instant_render': {
				dispatch({ type: 'INSTANT_RENDER', unitIndex, node: unit.content });
				const next = unitIndex + 1;
				dispatch({ type: 'ADVANCE' });
				scheduleNext(() => runUnit(next), 0);
				break;
			}
			case 'nested_stream': {
				// Compose child's onComplete with parent advance
				const child = unit.component;
				const childExisting = (child.props as { onComplete?: () => void })?.onComplete as
					| (() => void)
					| undefined;
				const composed = () => {
					try {
						childExisting?.();
					} finally {
						dispatch({ type: 'NESTED_DONE' });
						const next = unitIndex + 1;
						dispatch({ type: 'ADVANCE' });
						scheduleNext(() => runUnit(next), 0);
					}
				};
				const nestedWithCb = React.cloneElement(child, {
					...child.props,
					autoStart: true,
					onComplete: composed,
				});
				dispatch({ type: 'NESTED_START', unitIndex, node: nestedWithCb });
				break; // wait for nested to call back
			}
		}
	}, []);

	// Text tick
	useEffect(() => {
		if (!text.streaming || text.tokens.length === 0) return;
		if (text.index >= text.tokens.length) {
			dispatch({ type: 'END_TEXT' });
			const next = currentUnit + 1;
			dispatch({ type: 'ADVANCE' });
			scheduleNext(() => runUnit(next), 0);
			return;
		}
		scheduleNext(
			() => {
				const step = Math.max(1, speed ?? 1);
				const nextIndex = Math.min(text.index + step, text.tokens.length);
				const textContent = text.tokens.slice(0, nextIndex).join('');
				dispatch({ type: 'TEXT_TICK', nextIndex, content: textContent });
			},
			Math.max(0, interval ?? 0),
		);
	}, [text.streaming, text.tokens, text.index, speed, interval, currentUnit, runUnit, scheduleNext]);

	// Reset ONLY when the signature or autoStart change
	useEffect(() => {
		nextRunToken();
		activeTextUnitRef.current = null;
		dispatch({ type: 'RESET' });

		const planLen = latestPlanRef.current.length;
		if (planLen === 0) {
			dispatch({ type: 'COMPLETE' });
			onCompleteRef.current?.();
			return;
		}
		if (autoStart) runUnit(0);

		return () => {
			cancelAll();
		};
	}, [signature, autoStart, runUnit, nextRunToken, cancelAll]);

	// Memoise element creation
	const element = useMemo(() => {
		const children = Array.from(renderedMap.entries()).map(([unitIndex, content]) => (
			<React.Fragment key={`${instanceId}:u${unitIndex}`}>{content}</React.Fragment>
		));

		if (isFragmentElementType(as)) {
			return <React.Fragment>{children}</React.Fragment>;
		}

		// The type guard ensures `as` is not Fragment here.
		const Element = (as || 'div') as React.ElementType;
		const { className, style, ...elementProps } = rest as {
			className?: string;
			style?: React.CSSProperties;
			[key: string]: unknown;
		};
		const props = {
			...elementProps,
			className,
			style,
			'data-tree-stream': true,
			'data-streaming': text.streaming || isWaitingForNested,
			'data-complete': isComplete,
		};

		return <Element {...props}>{children}</Element>;
	}, [as, rest, text.streaming, isWaitingForNested, isComplete, renderedMap, instanceId]);

	return element;
}

/* mark component for wrapped detection */
(TreeStream as unknown as Record<string | symbol, unknown>)[STREAMING_MARKER] = true;
TreeStream.displayName = 'TreeStream';

export default TreeStream;
