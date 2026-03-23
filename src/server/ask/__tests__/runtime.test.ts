import { describe, expect, it } from 'vitest';
import { toDirectiveFromToolCall } from '../runtime';

describe('toDirectiveFromToolCall', () => {
	it('uses the explicit theme from a directive tool call and strips it from directive data', () => {
		const directive = toDirectiveFromToolCall(
			'showProjectsView',
			{
				variant: 'grid',
				theme: 'elegant',
				highlights: ['proj_codebots_modeler'],
			},
			'cold',
		);

		expect(directive).toEqual({
			mode: 'projects',
			theme: 'elegant',
			data: {
				variant: 'grid',
				highlights: ['proj_codebots_modeler'],
			},
		});
	});

	it('falls back to the current theme when the directive tool call omits theme', () => {
		const directive = toDirectiveFromToolCall(
			'showSkillsView',
			{
				variant: 'technical',
				highlights: ['skill_typescript'],
			},
			'vibrant',
		);

		expect(directive).toMatchObject({
			mode: 'skills',
			theme: 'vibrant',
			data: {
				variant: 'technical',
				highlights: ['skill_typescript'],
			},
		});
	});
});
