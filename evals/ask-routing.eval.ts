import { evalite } from 'evalite';
import { createDefaultLandingDirective, type Directive } from '~/lib/ai/directiveTools';
import { normalizeAskToolCalls, runAskEvalTurn, type AskEvalOutput } from './helpers/runAskEval';
import {
	scoreExactlyOneViewTool,
	scoreExpectedPrimaryDirective,
	scoreNarrationPresent,
	scoreNoRawJsonInNarration,
	type ExpectedPrimaryDirective,
} from './helpers/askEvalScorers';

type AskRoutingInput = {
	caseName: string;
	userMessage: string;
	currentDirective: Directive;
};

type AskRoutingExpected = {
	primaryDirective: ExpectedPrimaryDirective | ExpectedPrimaryDirective[];
};

const defineAskRoutingEval = process.env.OPENAI_API_KEY ? evalite : evalite.skip;

defineAskRoutingEval<AskRoutingInput, AskEvalOutput, AskRoutingExpected>('Ask Prompt Routing', {
	data: [
		{
			input: {
				caseName: 'Resume requests open the resume view',
				userMessage: 'Can I see your resume?',
				currentDirective: createDefaultLandingDirective(),
			},
			expected: {
				primaryDirective: { toolName: 'showResumeView' },
			},
		},
		{
			input: {
				caseName: 'Projects overview goes to grid view',
				userMessage: 'What have you built?',
				currentDirective: createDefaultLandingDirective(),
			},
			expected: {
				primaryDirective: { toolName: 'showProjectsView', variant: 'grid' },
			},
		},
		{
			input: {
				caseName: 'Explicit technical expertise requests use the skills view',
				userMessage: 'Do you have experience in TypeScript?',
				currentDirective: createDefaultLandingDirective(),
			},
			expected: {
				primaryDirective: { toolName: 'showSkillsView', variant: 'technical' },
			},
		},
		{
			input: {
				caseName: 'Portfolio mechanics questions use the explore view',
				userMessage: 'How does this portfolio app work?',
				currentDirective: createDefaultLandingDirective(),
			},
			expected: {
				primaryDirective: { toolName: 'showExploreView' },
			},
		},
	],
	task: async ({ userMessage, currentDirective }) =>
		runAskEvalTurn({
			currentDirective,
			messages: [{ role: 'user', content: userMessage }],
		}),
	scorers: [
		{
			name: 'Expected Primary View',
			scorer: async ({ output, expected }) =>
				scoreExpectedPrimaryDirective({
					output,
					expected: expected.primaryDirective,
				}),
		},
		{
			name: 'Exactly One View Tool',
			scorer: async ({ output }) => scoreExactlyOneViewTool({ output }),
		},
		{
			name: 'Narration Present',
			scorer: async ({ output }) => scoreNarrationPresent({ output }),
		},
		{
			name: 'No Raw JSON In Narration',
			scorer: async ({ output }) => scoreNoRawJsonInNarration({ output }),
		},
	],
	columns: ({ input, output, expected }) => [
		{ label: 'Case', value: input.caseName },
		{ label: 'User Message', value: input.userMessage },
		{
			label: 'Actual Tool Calls',
			value: JSON.stringify(normalizeAskToolCalls(output.toolCalls), null, 2),
		},
		{
			label: 'Expected Primary View',
			value: JSON.stringify(expected?.primaryDirective ?? null, null, 2),
		},
		{
			label: 'Text Preview',
			value: output.text.slice(0, 240),
		},
	],
});
