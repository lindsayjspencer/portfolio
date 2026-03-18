import React from 'react';

/** Marker symbol placed on the component function to detect wrappers. */
export const STREAMING_MARKER = Symbol.for('react-tree-stream/TreeStream');

/**
 * isTreeStreamElement
 *
 * Detect whether a React element is a TreeStream component, even if wrapped
 * by React.memo or forwardRef. We check the function itself, .type for memo,
 * and .render for forwardRef. As a fallback we also check displayName.
 */
export function isTreeStreamElement(el: React.ReactElement): boolean {
	const t = el.type as unknown as {
		[STREAMING_MARKER]?: boolean;
		type?: { [STREAMING_MARKER]?: boolean };
		render?: { [STREAMING_MARKER]?: boolean };
		displayName?: string;
	};
	return Boolean(
		t?.[STREAMING_MARKER] ||
			t?.type?.[STREAMING_MARKER] || // React.memo
			t?.render?.[STREAMING_MARKER] || // forwardRef
			t?.displayName === 'TreeStream',
	);
}
