import { describe, expect, it } from 'vitest';
import { projectsDirectiveToolInputSchema } from '~/lib/ai/directiveTools';
import {
	buildNarrationCallOptions,
	buildPlannerCallOptions,
	toDirectiveFromToolCall,
} from '../runtime';

describe('directive planner runtime', () => {
	it('requires a reason in planner tool inputs', () => {
		const parsed = projectsDirectiveToolInputSchema.safeParse({
			variant: 'grid',
			highlights: ['proj_codebots_modeler'],
		});

		expect(parsed.success).toBe(false);
	});

	it('uses the explicit theme from a directive tool call and strips planner-only fields from directive data', () => {
		const directive = toDirectiveFromToolCall(
			'showProjectsView',
			{
				variant: 'grid',
				theme: 'elegant',
				reason: 'Project context best supports the answer',
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
				reason: 'Technical skills are the best support',
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

	it('builds planner call options with required tool use and directive-only tools', () => {
		const options = buildPlannerCallOptions({
			model: {} as never,
			messages: [{ role: 'user', content: 'Show me your React projects' }],
			currentDirective: null,
		});

		expect(options.toolChoice).toBe('required');
		expect(Object.keys(options.tools)).toEqual([
			'showTimelineView',
			'showProjectsView',
			'showSkillsView',
			'showValuesView',
			'showCompareView',
			'showExploreView',
			'showResumeView',
		]);
	});

	it('builds narration call options without tools', () => {
		const options = buildNarrationCallOptions({
			model: {} as never,
			messages: [{ role: 'user', content: 'What are you best at?' }],
			directive: {
				mode: 'skills',
				theme: 'cold',
				data: {
					variant: 'technical',
					highlights: ['skill_typescript'],
				},
			},
			plannerReason: 'A technical skills view best supports this answer.',
		});

		expect(options).not.toHaveProperty('tools');
		expect(options.system).toContain('The UI has already been updated');
	});
});
