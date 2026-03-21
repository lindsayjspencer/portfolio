import { describe, expect, it } from 'vitest';
import { getClarifyFallbackToolCall, toDirectiveFromToolCall } from '../runtime';

describe('toDirectiveFromToolCall', () => {
	it('uses the explicit theme from a directive tool call and strips it from directive data', () => {
		const directive = toDirectiveFromToolCall(
			'projectsDirective',
			{
				variant: 'grid',
				theme: 'elegant',
				highlights: ['proj_codebots_modeler'],
				confidence: 0.9,
			},
			'cold',
		);

		expect(directive).toEqual({
			mode: 'projects',
			theme: 'elegant',
			data: {
				variant: 'grid',
				highlights: ['proj_codebots_modeler'],
				confidence: 0.9,
			},
		});
	});

	it('falls back to the current theme when the directive tool call omits theme', () => {
		const directive = toDirectiveFromToolCall(
			'skillsDirective',
			{
				variant: 'technical',
				highlights: ['skill_typescript'],
				confidence: 0.85,
			},
			'vibrant',
		);

		expect(directive).toMatchObject({
			mode: 'skills',
			theme: 'vibrant',
			data: {
				variant: 'technical',
				highlights: ['skill_typescript'],
				confidence: 0.85,
			},
		});
	});

	it('adds an explore fallback when a clarify turn has no primary directive', () => {
		const fallbackToolCall = getClarifyFallbackToolCall({
			toolCalls: [
				{
					toolName: 'clarify',
					input: {
						slot: 'experience_type',
						kind: 'choice',
						options: ['Career Timeline', 'Technical Skills', 'Project Work'],
					},
				},
			],
			currentDirective: {
				mode: 'landing',
				theme: 'elegant',
				data: {
					highlights: [],
					confidence: 0.7,
				},
			},
		});

		expect(fallbackToolCall).toEqual({
			toolName: 'exploreDirective',
			input: {
				highlights: [],
				confidence: 0.7,
			},
		});
	});
});
