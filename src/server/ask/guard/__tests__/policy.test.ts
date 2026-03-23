import { describe, expect, it } from 'vitest';
import { runAskGuardPolicy } from '../policy';

describe('ask guard policy', () => {
	it('allows normal short questions', () => {
		expect(
			runAskGuardPolicy([
				{
					role: 'user',
					content: 'What are you strongest at as a frontend engineer?',
				},
			]),
		).toBeNull();
	});

	it('asks the user to shorten very long messages', () => {
		const result = runAskGuardPolicy([
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
		const result = runAskGuardPolicy([
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
});
