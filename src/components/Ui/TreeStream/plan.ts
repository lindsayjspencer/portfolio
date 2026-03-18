import React from 'react';
import { isTreeStreamElement } from './nested';

/**
 * Execution units produced from children to drive the streaming executor.
 * - text_stream: a text node that will be tokenized and streamed
 * - instant_render: any non-stream Tree element rendered immediately
 * - nested_stream: a nested TreeStream element coordinated by onComplete
 */
export type ExecutionUnit =
	| { type: 'text_stream'; content: string }
	| { type: 'instant_render'; content: React.ReactElement }
	| { type: 'nested_stream'; component: React.ReactElement };

/**
 * buildPlan
 *
 * Convert an arbitrary React node tree into a flat execution plan.
 *
 * Inputs:
 * - node: any React renderable input (string/number/elements/arrays/fragments)
 *
 * Outputs:
 * - Array of ExecutionUnit preserving in-order appearance from the tree
 *
 * Rules:
 * - Strings/numbers become text stream units (empty strings are skipped)
 * - Fragments/arrays are flattened recursively
 * - Elements marked as TreeStream become nested stream units
 * - All other elements are instant render units
 *
 * Notes/edge cases:
 * - null/undefined/boolean nodes are ignored
 * - For strings we keep original content (including whitespace), but empty
 *   strings after trim() are ignored to avoid no-op streaming units
 */
export function buildPlan(node: React.ReactNode): ExecutionUnit[] {
	if (node == null || node === false || node === true) return [];
	if (typeof node === 'string') return node.trim() ? [{ type: 'text_stream', content: node }] : [];
	if (typeof node === 'number') return [{ type: 'text_stream', content: String(node) }];
	if (Array.isArray(node)) return node.flatMap(buildPlan);
	if (React.isValidElement(node)) {
		if (node.type === React.Fragment) return buildPlan(node.props?.children);
		if (isTreeStreamElement(node)) return [{ type: 'nested_stream', component: node }];
		return [{ type: 'instant_render', content: node }];
	}
	return [];
}

/**
 * planSignature
 *
 * Create a stable string signature for a plan that captures structural shape
 * and text content for text units. This is used to decide when to reset/run.
 *
 * Implementation detail:
 * - text_stream includes its content to re-run when text changes
 * - instant_render and nested_stream capture only their type (not identity)
 */
export function planSignature(plan: ExecutionUnit[]): string {
	return JSON.stringify(
		plan.map((u) => {
			switch (u.type) {
				case 'text_stream':
					return ['T', u.content];
				case 'nested_stream':
					return ['N'];
				case 'instant_render':
					return ['I'];
			}
		}),
	);
}
