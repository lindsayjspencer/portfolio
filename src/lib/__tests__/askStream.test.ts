import { describe, expect, it } from 'vitest';
import { parseAskSseBlock } from '../askStream';

describe('parseAskSseBlock', () => {
	it('parses text events', () => {
		const parsed = parseAskSseBlock('event: text\ndata: {"delta":"Hello"}');

		expect(parsed).toEqual({ type: 'text', delta: 'Hello' });
	});

	it('parses done events with explicit status', () => {
		const parsed = parseAskSseBlock('event: done\ndata: {"ok":false}');

		expect(parsed).toEqual({ type: 'done', ok: false });
	});

	it('parses suggestAnswers events', () => {
		const parsed = parseAskSseBlock('event: suggestAnswers\ndata: {"answers":["Career Timeline","Project Work"]}');

		expect(parsed).toEqual({
			type: 'suggestAnswers',
			payload: { answers: ['Career Timeline', 'Project Work'] },
		});
	});

	it('rejects invalid directive payloads', () => {
		const parsed = parseAskSseBlock(
			'event: directive\ndata: {"mode":"projects","theme":"cold","data":{"variant":"broken"}}',
		);

		expect(parsed).toBeNull();
	});
});
