import React from 'react';

export interface StreamState {
	unitIndex: number;
	waitingNested: boolean;
	rendered: Map<number, React.ReactNode>;
	text: {
		tokens: string[];
		index: number;
		activeUnit: number | null;
		streaming: boolean;
	};
	complete: boolean;
}

export type StreamAction =
	| { type: 'RESET' }
	| { type: 'START' }
	| { type: 'BEGIN_TEXT'; unitIndex: number; tokens: string[] }
	| { type: 'TEXT_TICK'; nextIndex: number; content: string }
	| { type: 'END_TEXT' }
	| { type: 'ADVANCE' }
	| { type: 'INSTANT_RENDER'; unitIndex: number; node: React.ReactNode }
	| { type: 'NESTED_START'; unitIndex: number; node: React.ReactNode }
	| { type: 'NESTED_DONE' }
	| { type: 'COMPLETE' };

export const initialStreamState: StreamState = {
	unitIndex: 0,
	waitingNested: false,
	rendered: new Map(),
	text: { tokens: [], index: 0, activeUnit: null, streaming: false },
	complete: false,
};

export function streamReducer(state: StreamState, action: StreamAction): StreamState {
	switch (action.type) {
		case 'RESET':
			return initialStreamState;
		case 'START':
			return { ...state };
		case 'BEGIN_TEXT': {
			const rendered = new Map(state.rendered);
			if (!rendered.has(action.unitIndex)) rendered.set(action.unitIndex, '');
			return {
				...state,
				text: {
					tokens: action.tokens,
					index: 0,
					activeUnit: action.unitIndex,
					streaming: true,
				},
				rendered,
			};
		}
		case 'TEXT_TICK': {
			const rendered = new Map(state.rendered);
			const u = state.text.activeUnit;
			if (u != null) rendered.set(u, action.content);
			return { ...state, text: { ...state.text, index: action.nextIndex }, rendered };
		}
		case 'END_TEXT': {
			return { ...state, text: { ...state.text, streaming: false } };
		}
		case 'ADVANCE': {
			return { ...state, unitIndex: state.unitIndex + 1 };
		}
		case 'INSTANT_RENDER': {
			const rendered = new Map(state.rendered);
			rendered.set(action.unitIndex, action.node);
			return { ...state, rendered };
		}
		case 'NESTED_START': {
			const rendered = new Map(state.rendered);
			rendered.set(action.unitIndex, action.node);
			return { ...state, waitingNested: true, rendered };
		}
		case 'NESTED_DONE': {
			return { ...state, waitingNested: false };
		}
		case 'COMPLETE':
			return { ...state, complete: true };
	}
}
