import { describe, expect, it } from 'vitest';
import { runAskSizePolicy } from '../policy';

describe('ask size policy', () => {
	it('allows normal short questions', () => {
		expect(
			runAskSizePolicy([
				{
					role: 'user',
					content: 'What are you strongest at as a frontend engineer?',
				},
			]),
		).toMatchObject({
			decision: 'allow',
			category: 'safe',
			source: 'policy',
		});
	});

	it('asks the user to shorten very long messages', () => {
		const result = runAskSizePolicy([
			{
				role: 'user',
				content: `Please review this:\n${'A'.repeat(3_000)}`,
			},
		]);

		expect(result).toMatchObject({
			decision: 'ask_to_shorten',
			category: 'too_long',
			source: 'policy',
		});
	});

	it('asks the user to shorten large structured blobs', () => {
		const lines = Array.from({ length: 35 }, (_, index) => `{"index": ${index}, "value": "abc"}`).join('\n');
		const result = runAskSizePolicy([
			{
				role: 'user',
				content: lines,
			},
		]);

		expect(result).toMatchObject({
			decision: 'ask_to_shorten',
			category: 'too_long',
			source: 'policy',
		});
	});

	it('does not reject based on total conversation length when the latest user message is small', () => {
		const messages = Array.from({ length: 30 }, (_, index) => ({
			role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
			content: `short message ${index}`,
		}));

		expect(runAskSizePolicy(messages)).toMatchObject({
			decision: 'allow',
			category: 'safe',
			source: 'policy',
		});
	});
});
