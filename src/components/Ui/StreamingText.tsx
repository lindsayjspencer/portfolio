'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

type ExecutionUnit =
	| { type: 'text_stream'; content: string }
	| { type: 'instant_render'; content: React.ReactElement }
	| { type: 'nested_stream'; component: React.ReactElement };

interface StreamingTextProps {
	as?: keyof JSX.IntrinsicElements;
	children: React.ReactNode;
	speed?: number; // words per tick
	interval?: number; // ms per tick
	autoStart?: boolean;
	onComplete?: () => void;
	className?: string;
	// Ungarbling effect props
	ungarble?: boolean;
	ungarbleChars?: 'binary' | 'latin' | 'cjk' | 'mixed';
	ungarbleDuration?: number; // total duration in ms
	ungarbleCompleteDelay?: number; // delay before calling onComplete
	ungarbleInterval?: number; // ms between character updates (min 200ms)
	ungarbleMonospace?: boolean; // force monospace font during ungarbling
	ungarbleCjkScale?: number; // font-size scale for CJK characters (default: 0.85)
	ungarblePerCharMs?: number; // ms per character for duration (overrides ungarbleDuration)
	ungarbleLeftBias?: number; // left-to-right bias strength (0-1, default: 0.3)
	[key: string]: any;
}

/* ----- stable ids (no Date.now) ----- */
let __seq = 0;
const newInstanceId = () => `st-${++__seq}`;

/* ----- ungarbling character sets ----- */
const GIBBERISH_SETS = {
	binary: '01',
	latin: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
	// Use a mix of full-width and regular CJK characters that work better in monospace
	cjk: '我你他它们这那里哪什么时候地方工作技术开发测试系统网络数据安全性能优化设计架构前端后端全栈应用程序界面用户体验算法机器学习人工智能',
	mixed: '', // will be combination of latin + cjk
};
GIBBERISH_SETS.mixed = GIBBERISH_SETS.latin + GIBBERISH_SETS.cjk;

const getRandomChar = (charset: keyof typeof GIBBERISH_SETS): string => {
	const chars = GIBBERISH_SETS[charset];
	return chars[Math.floor(Math.random() * chars.length)] || '?';
};

const preserveSpacing = (char: string): boolean => {
	return char === ' ' || char === '\n' || char === '\t';
};

// Detect CJK (Chinese, Japanese, Korean) characters
const isCjkChar = (char: string): boolean => {
	const codePoint = char.codePointAt(0);
	if (!codePoint) return false;

	return (
		// CJK Unified Ideographs
		(codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
		// CJK Extension A
		(codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
		// CJK Extension B
		(codePoint >= 0x20000 && codePoint <= 0x2a6df) ||
		// CJK Symbols and Punctuation
		(codePoint >= 0x3000 && codePoint <= 0x303f) ||
		// Hiragana
		(codePoint >= 0x3040 && codePoint <= 0x309f) ||
		// Katakana
		(codePoint >= 0x30a0 && codePoint <= 0x30ff) ||
		// Hangul Syllables (Korean)
		(codePoint >= 0xac00 && codePoint <= 0xd7af)
	);
};

// Create character spans with selective CJK scaling
const createCharacterSpans = (text: string, cjkScale: number): React.ReactElement[] => {
	return text.split('').map((char, index) => {
		if (preserveSpacing(char)) {
			// Preserve spacing characters as-is
			return <React.Fragment key={index}>{char}</React.Fragment>;
		}

		const isCjk = isCjkChar(char);
		return (
			<span
				key={index}
				style={
					isCjk
						? {
								fontSize: `${cjkScale}em`,
								display: 'inline-block',
								textAlign: 'center',
								minWidth: '1ch', // ensure consistent spacing
							}
						: undefined
				}
			>
				{char}
			</span>
		);
	});
};

/* ----- nested detection (handles memo/forwardRef) ----- */
const STREAMING_MARKER = Symbol.for('app/StreamingText');
function isStreamingTextElement(el: React.ReactElement): boolean {
	const t: any = el.type;
	return Boolean(
		t?.[STREAMING_MARKER] ||
			t?.type?.[STREAMING_MARKER] || // React.memo
			t?.render?.[STREAMING_MARKER] || // forwardRef
			t?.displayName === 'StreamingText',
	);
}

/* ----- plan builder (recurse fragments/arrays) ----- */
function buildPlan(node: React.ReactNode): ExecutionUnit[] {
	if (node == null || node === false || node === true) return [];
	if (typeof node === 'string') return node.trim() ? [{ type: 'text_stream', content: node }] : [];
	if (typeof node === 'number') return [{ type: 'text_stream', content: String(node) }];
	if (Array.isArray(node)) return node.flatMap(buildPlan);
	if (React.isValidElement(node)) {
		if (node.type === React.Fragment) return buildPlan(node.props?.children);
		if (isStreamingTextElement(node)) return [{ type: 'nested_stream', component: node }];
		return [{ type: 'instant_render', content: node }];
	}
	return [];
}

/* Create a **stable signature** that ignores element identity but captures structure. */
function planSignature(plan: ExecutionUnit[]): string {
	return JSON.stringify(
		plan.map((u) => {
			switch (u.type) {
				case 'text_stream':
					return ['T', u.content]; // include text so content changes re-run
				case 'nested_stream':
					return ['N']; // structure only
				case 'instant_render':
					return ['I']; // structure only
			}
		}),
	);
}

export function StreamingText({
	as = 'div',
	children,
	speed = 5,
	interval = 50,
	autoStart = true,
	onComplete,
	className = '',
	// Ungarbling props
	ungarble = false,
	ungarbleChars = 'latin',
	ungarbleDuration = 2500,
	ungarbleCompleteDelay = 0,
	ungarbleInterval = 80,
	ungarbleMonospace = false,
	ungarbleCjkScale = 0.5,
	ungarblePerCharMs = 50,
	ungarbleLeftBias = 0.3,
	...elementProps
}: StreamingTextProps) {
	const Element = as;
	const instanceIdRef = useRef<string>(newInstanceId());

	/* Keep latest onComplete in a ref to avoid effect resubscribes */
	const onCompleteRef = useRef<(() => void) | undefined>(onComplete);
	useEffect(() => {
		onCompleteRef.current = onComplete;
	}, [onComplete]);

	/* Build plan & a stable signature */
	const computedPlan = useMemo(() => buildPlan(children), [children]);
	const signature = useMemo(() => planSignature(computedPlan), [computedPlan]);

	/* Check if content can be ungarbled (single text stream unit) */
	const canUngarble = useMemo(() => {
		return (
			ungarble &&
			computedPlan.length === 1 &&
			computedPlan[0]?.type === 'text_stream' &&
			typeof computedPlan[0].content === 'string'
		);
	}, [ungarble, computedPlan]);

	/* Store plan in a ref for the executor */
	const planRef = useRef<ExecutionUnit[]>(computedPlan);
	useEffect(() => {
		planRef.current = computedPlan;
	}, [computedPlan]);

	/* scheduling / run guards */
	const runIdRef = useRef(0);
	const timersRef = useRef<number[]>([]);
	const schedule = useCallback((fn: () => void, delay = 0) => {
		const thisRun = runIdRef.current;
		const t = window.setTimeout(() => {
			if (runIdRef.current === thisRun) fn();
		}, delay);
		timersRef.current.push(t);
	}, []);

	/* render state */
	const [currentUnit, setCurrentUnit] = useState(0);
	const [isWaitingForNested, setIsWaitingForNested] = useState(false);
	const [renderedContent, setRenderedContent] = useState<Array<{ key: string; content: React.ReactNode }>>([]);

	/* text streaming */
	const [currentTextWords, setCurrentTextWords] = useState<string[]>([]);
	const [currentWordIndex, setCurrentWordIndex] = useState(0);
	const [isStreamingText, setIsStreamingText] = useState(false);
	const [isComplete, setIsComplete] = useState(false);

	/* ungarbling state */
	const [isUngarbling, setIsUngarbling] = useState(false);
	const [ungarbledText, setUngarbledText] = useState<string>('');
	const [targetText, setTargetText] = useState<string>('');

	/* only patch the active streamed node */
	const activeTextKeyRef = useRef<string | null>(null);

	/* stable keys */
	const textKey = (u: number) => `${instanceIdRef.current}:u${u}:t`;
	const instKey = (u: number) => `${instanceIdRef.current}:u${u}:i`;
	const nestKey = (u: number) => `${instanceIdRef.current}:u${u}:n`;

	/* executor (reads plan from ref; no deps) */
	const executeUnit = useCallback((unitIndex: number) => {
		const plan = planRef.current;
		if (unitIndex >= plan.length) {
			setIsComplete(true);
			onCompleteRef.current?.();
			return;
		}
		const unit = plan[unitIndex];
		if (!unit) return;
		switch (unit.type) {
			case 'text_stream': {
				const words = unit.content.split(/(\s+)/); // keep whitespace
				const k = textKey(unitIndex);
				activeTextKeyRef.current = k;
				setCurrentTextWords(words);
				setCurrentWordIndex(0);
				setIsStreamingText(true);
				setRenderedContent((prev) =>
					prev.some((p) => p.key === k) ? prev : [...prev, { key: k, content: '' }],
				);
				break;
			}
			case 'instant_render': {
				setRenderedContent((prev) => [...prev, { key: instKey(unitIndex), content: unit.content }]);
				const next = unitIndex + 1;
				setCurrentUnit(next);
				schedule(() => executeUnit(next), 0);
				break;
			}
			case 'nested_stream': {
				setIsWaitingForNested(true);
				/* compose child's onComplete with parent advance */
				const child = unit.component;
				const childExisting = (child.props as any)?.onComplete as (() => void) | undefined;
				const composed = () => {
					try {
						childExisting?.();
					} finally {
						setIsWaitingForNested(false);
						const next = unitIndex + 1;
						setCurrentUnit(next);
						schedule(() => executeUnit(next), 0);
					}
				};
				const nestedWithCb = React.cloneElement(child, {
					...child.props,
					autoStart: true,
					onComplete: composed,
				});
				setRenderedContent((prev) => [...prev, { key: nestKey(unitIndex), content: nestedWithCb }]);
				break; // wait for nested to call back
			}
		}
	}, []);

	/* text tick */
	useEffect(() => {
		if (!isStreamingText || currentTextWords.length === 0) return;
		if (currentWordIndex >= currentTextWords.length) {
			setIsStreamingText(false);
			const next = currentUnit + 1;
			setCurrentUnit(next);
			schedule(() => executeUnit(next), 0);
			return;
		}
		const t = window.setTimeout(
			() => {
				const step = Math.max(1, speed ?? 1);
				const nextIndex = Math.min(currentWordIndex + step, currentTextWords.length);
				const textContent = currentTextWords.slice(0, nextIndex).join('');
				const k = activeTextKeyRef.current;
				setRenderedContent((prev) => {
					if (!k) return prev;
					const idx = prev.findIndex((p) => p.key === k);
					if (idx === -1) return [...prev, { key: k, content: textContent }];
					const clone = prev.slice();
					clone[idx] = { key: k, content: textContent };
					return clone;
				});
				setCurrentWordIndex(nextIndex);
			},
			Math.max(0, interval ?? 0),
		);
		timersRef.current.push(t);
		return () => clearTimeout(t);
	}, [isStreamingText, currentTextWords, currentWordIndex, speed, interval, currentUnit, executeUnit, schedule]);

	/* reset ONLY when the **signature** or autoStart change (not raw children / onComplete) */
	useEffect(() => {
		runIdRef.current += 1;
		timersRef.current.forEach(clearTimeout);
		timersRef.current = [];
		activeTextKeyRef.current = null;

		setCurrentUnit(0);
		setIsWaitingForNested(false);
		setRenderedContent([]);
		setCurrentTextWords([]);
		setCurrentWordIndex(0);
		setIsStreamingText(false);
		setIsComplete(false);

		// Reset ungarbling state
		setIsUngarbling(false);
		setUngarbledText('');
		setTargetText('');

		const planLen = planRef.current.length;
		if (planLen === 0) {
			setIsComplete(true);
			onCompleteRef.current?.();
			return;
		}
		// Start ungarbling or normal execution
		if (autoStart) {
			if (canUngarble) {
				// Start ungarbling immediately
				console.log('[StreamingText] Starting ungarbling for:', computedPlan[0]);
				const text = (computedPlan[0] as { type: 'text_stream'; content: string }).content;
				setTargetText(text);
				setIsUngarbling(true);

				// Create initial gibberish text preserving spaces
				const initialGibberish = text
					.split('')
					.map((char) => (preserveSpacing(char) ? char : getRandomChar(ungarbleChars)))
					.join('');

				setUngarbledText(initialGibberish);

				// Add to rendered content immediately (with character spans)
				const k = textKey(0);
				const initialSpans = createCharacterSpans(initialGibberish, ungarbleCjkScale);
				setRenderedContent([{ key: k, content: <>{initialSpans}</> }]);

				// Mark as complete immediately and call onComplete after delay
				setIsComplete(true);
				if (ungarbleCompleteDelay > 0) {
					schedule(() => onCompleteRef.current?.(), ungarbleCompleteDelay);
				} else {
					onCompleteRef.current?.();
				}

				// Start ungarbling process
				const textChars = text.split('');

				// Calculate duration: use per-character if provided, otherwise fixed duration
				const effectiveDuration = ungarblePerCharMs
					? Math.max(textChars.length * ungarblePerCharMs, 500) // minimum 500ms
					: ungarbleDuration;

				const totalSteps = Math.ceil(effectiveDuration / Math.max(20, ungarbleInterval));
				const settledChars = new Array(textChars.length).fill(false); // Track which chars are settled
				let currentStep = 0;

				const ungarbleTimer = setInterval(() => {
					currentStep++;
					const progress = currentStep / totalSteps;

					const newText = textChars
						.map((targetChar, index) => {
							if (preserveSpacing(targetChar)) return targetChar;

							// If this character is already settled, keep it settled
							if (settledChars[index]) {
								return targetChar;
							}

							// Calculate position bias: earlier characters (left) get higher chance
							const positionBias = ungarbleLeftBias * (1 - index / textChars.length);

							// Each character has a chance to "settle" based on progress and position
							const baseProgress = Math.max(0, progress - index * 0.02); // stagger reveals
							const biasedProgress = Math.min(1, baseProgress + positionBias);
							const settleChance = Math.pow(biasedProgress, 1.5); // exponential curve

							if (Math.random() < settleChance) {
								settledChars[index] = true; // Mark as permanently settled
								return targetChar;
							} else {
								return getRandomChar(ungarbleChars);
							}
						})
						.join('');

					setUngarbledText(newText);
					const newSpans = createCharacterSpans(newText, ungarbleCjkScale);
					setRenderedContent([{ key: k, content: <>{newSpans}</> }]);

					// Complete when done
					if (currentStep >= totalSteps) {
						clearInterval(ungarbleTimer);
						setUngarbledText(text);
						const finalSpans = createCharacterSpans(text, ungarbleCjkScale);
						setRenderedContent([{ key: k, content: <>{finalSpans}</> }]);
						setIsUngarbling(false);
						// Note: isComplete and onComplete already called above
					}
				}, ungarbleInterval);

				timersRef.current.push(ungarbleTimer as any);
			} else {
				// Normal streaming execution
				executeUnit(0);
			}
		}

		return () => {
			timersRef.current.forEach(clearTimeout);
			timersRef.current = [];
		};
	}, [
		signature,
		autoStart,
		executeUnit,
		canUngarble,
		ungarbleChars,
		ungarbleDuration,
		ungarbleInterval,
		ungarbleCompleteDelay,
		ungarbleCjkScale,
		ungarblePerCharMs,
		ungarbleLeftBias,
	]); // <-- critical change

	// Memoize the element creation to ensure it updates when props change
	const element = useMemo(() => (
		<Element
			{...elementProps}
			className={className}
			style={{
				...((elementProps as any)?.style || {}),
				...(isUngarbling && ungarbleMonospace
					? {
							fontFamily:
								'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
							letterSpacing: '0.05em',
						}
					: {}),
			}}
			data-streaming-text
			data-streaming={isStreamingText || isWaitingForNested || isUngarbling}
			data-complete={isComplete}
			data-ungarbling={isUngarbling}
		>
			{renderedContent.map((item) => (
				<React.Fragment key={item.key}>{item.content}</React.Fragment>
			))}
		</Element>
	), [Element, elementProps, className, isUngarbling, ungarbleMonospace, isStreamingText, isWaitingForNested, isComplete, renderedContent]);

	return element;
}

/* mark component for wrapped detection */
(StreamingText as any)[STREAMING_MARKER] = true;
StreamingText.displayName = 'StreamingText';

export default StreamingText;
