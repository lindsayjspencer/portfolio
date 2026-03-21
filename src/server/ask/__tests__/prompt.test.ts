import { describe, expect, it } from 'vitest';
import { ASK_CONTEXT_PROMPT, ASK_SYSTEM_PROMPT, buildAskMessages } from '../prompt';

describe('buildAskMessages', () => {
	it('prepends the static context message and inserts the current directive immediately before the latest user message', () => {
		const messages = buildAskMessages(
			[
				{ role: 'user', content: 'Show me your projects' },
				{ role: 'assistant', content: 'Sure, here are some of my projects.' },
				{ role: 'user', content: 'Show me the latest ones.' },
			],
			{
				mode: 'projects',
				theme: 'cold',
				data: {
					variant: 'grid',
					highlights: [],
					confidence: 0.7,
					showMetrics: true,
				},
			},
		);

		expect(messages[0]).toMatchObject({ role: 'system' });
		expect(messages[1]).toMatchObject({ role: 'user', content: 'Show me your projects' });
		expect(messages[2]).toMatchObject({ role: 'assistant', content: 'Sure, here are some of my projects.' });
		expect(messages[3]).toMatchObject({ role: 'system' });
		expect(messages[4]).toMatchObject({ role: 'user', content: 'Show me the latest ones.' });
	});

	it('builds a compact behavior prompt and a separate context prompt', () => {
		expect(ASK_SYSTEM_PROMPT).toContain('You ARE Lindsay Spencer');
		expect(ASK_SYSTEM_PROMPT).toContain('Every assistant turn MUST emit exactly one primary visual directive tool call');
		expect(ASK_CONTEXT_PROMPT).toContain('## Portfolio Index');
	});
});
