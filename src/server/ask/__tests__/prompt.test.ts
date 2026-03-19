import { describe, expect, it } from 'vitest';
import { buildAskMessages, ASK_SYSTEM_PROMPT } from '../prompt';

describe('buildAskMessages', () => {
	it('prepends the current directive as a system message and preserves chat roles', () => {
		const messages = buildAskMessages(
			[
				{ role: 'user', content: 'Show me your projects' },
				{ role: 'assistant', content: 'Sure, here are some of my projects.' },
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
	});

	it('builds a populated system prompt once', () => {
		expect(ASK_SYSTEM_PROMPT).toContain('You ARE Lindsay Spencer');
		expect(ASK_SYSTEM_PROMPT).toContain('Portfolio context:');
	});
});
