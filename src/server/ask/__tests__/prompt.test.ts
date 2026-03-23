import { describe, expect, it } from 'vitest';
import {
	ASK_NARRATION_CONTEXT_PROMPT,
	ASK_NARRATION_SYSTEM_PROMPT,
	ASK_PLANNER_CONTEXT_PROMPT,
	ASK_PLANNER_SYSTEM_PROMPT,
	buildNarrationMessages,
	buildPlannerMessages,
} from '../prompt';

describe('planner prompt', () => {
	it('prepends static context and inserts planning state immediately before the latest user message', () => {
		const messages = buildPlannerMessages(
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
				},
			},
		);

		expect(messages[0]).toMatchObject({ role: 'system' });
		expect(messages[1]).toMatchObject({ role: 'user', content: 'Show me your projects' });
		expect(messages[2]).toMatchObject({ role: 'assistant', content: 'Sure, here are some of my projects.' });
		expect(messages[3]).toMatchObject({ role: 'system' });
		expect(messages[4]).toMatchObject({ role: 'user', content: 'Show me the latest ones.' });
	});

	it('builds a planner prompt that requires one tool and a reason', () => {
		expect(ASK_PLANNER_SYSTEM_PROMPT).toContain('Your only job is to select exactly one supporting view');
		expect(ASK_PLANNER_SYSTEM_PROMPT).toContain('Always include a short plain-English "reason"');
		expect(ASK_PLANNER_SYSTEM_PROMPT).toContain('Do not use suggestAnswers in this planner step');
		expect(ASK_PLANNER_CONTEXT_PROMPT).toContain('## Portfolio Index');
		expect(ASK_PLANNER_CONTEXT_PROMPT).toContain('skill_typescript');
	});
});

describe('narration prompt', () => {
	it('injects a sanitized visible-view context immediately before the latest user message', () => {
		const messages = buildNarrationMessages({
			messages: [
				{ role: 'user', content: 'Tell me about your frontend strengths' },
				{ role: 'assistant', content: 'I spend a lot of time on React and TypeScript-heavy frontend work.' },
				{ role: 'user', content: 'What specifically makes you strong there?' },
			],
			directive: {
				mode: 'skills',
				theme: 'cold',
				data: {
					variant: 'technical',
					highlights: ['skill_typescript'],
				},
			},
			plannerReason: 'A technical skills view best supports the answer.',
		});
		const viewContextContent = messages[3]?.content;

		expect(typeof viewContextContent).toBe('string');
		if (typeof viewContextContent !== 'string') {
			throw new Error('Expected narration view context content to be a string');
		}

		expect(messages[0]).toMatchObject({ role: 'system' });
		expect(messages[3]).toMatchObject({ role: 'system' });
		expect(viewContextContent).toContain('Visible view summary');
		expect(viewContextContent).toContain('technical skills map');
		expect(viewContextContent).toContain('TypeScript');
		expect(viewContextContent).not.toContain('skill_typescript');
		expect(messages[4]).toMatchObject({ role: 'user', content: 'What specifically makes you strong there?' });
	});

	it('builds a narration prompt that forbids UI-mechanics leakage', () => {
		expect(ASK_NARRATION_SYSTEM_PROMPT).toContain('The UI has already been updated');
		expect(ASK_NARRATION_SYSTEM_PROMPT).toContain('Never narrate the act of changing');
		expect(ASK_NARRATION_SYSTEM_PROMPT).toContain('Never mention tool names, tool calls');
		expect(ASK_NARRATION_SYSTEM_PROMPT).toContain('keep the reply to 1-3 short sentences');
		expect(ASK_NARRATION_SYSTEM_PROMPT).toContain('Prefer one short paragraph over multiple paragraphs');
		expect(ASK_NARRATION_CONTEXT_PROMPT).toContain('## Portfolio Reference');
		expect(ASK_NARRATION_CONTEXT_PROMPT).toContain('TypeScript');
		expect(ASK_NARRATION_CONTEXT_PROMPT).not.toContain('skill_typescript');
	});
});
