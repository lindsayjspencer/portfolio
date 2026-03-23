import { describe, expect, it } from 'vitest';
import { askRequestBodySchema } from '../ask-contract';

describe('askRequestBodySchema', () => {
	it('accepts simple user and assistant messages', () => {
		const parsed = askRequestBodySchema.parse({
			messages: [
				{ role: 'user', content: 'Tell me about React' },
				{ role: 'assistant', content: 'I have built a lot with React.' },
			],
			currentDirective: {
				mode: 'skills',
				theme: 'cold',
				data: {
					variant: 'technical',
					highlights: ['skill_react'],
				},
			},
		});

		expect(parsed.messages).toHaveLength(2);
		expect(parsed.currentDirective?.mode).toBe('skills');
	});

	it('rejects invalid roles', () => {
		const parsed = askRequestBodySchema.safeParse({
			messages: [{ role: 'system', content: 'nope' }],
			currentDirective: null,
		});

		expect(parsed.success).toBe(false);
	});

	it('rejects invalid directives', () => {
		const parsed = askRequestBodySchema.safeParse({
			messages: [{ role: 'user', content: 'hi' }],
			currentDirective: {
				mode: 'projects',
				theme: 'cold',
				data: {
					variant: 'broken',
				},
			},
		});

		expect(parsed.success).toBe(false);
	});
});
