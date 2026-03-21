import { evalite } from 'evalite';
import { toolCallAccuracy } from 'evalite/scorers/deterministic';
import { createDefaultLandingDirective, type Directive } from '~/lib/ai/directiveTools';
import { normalizeAskToolCalls, runAskEvalTurn, type AskEvalOutput, type NormalizedToolCall } from './helpers/runAskEval';

type AskRoutingInput = {
	caseName: string;
	userMessage: string;
	currentDirective: Directive;
};

type AskRoutingExpected = {
	toolCalls: NormalizedToolCall[];
};

const PRIMARY_DIRECTIVE_TOOL_NAMES = new Set([
	'timelineDirective',
	'projectsDirective',
	'skillsDirective',
	'valuesDirective',
	'compareDirective',
	'exploreDirective',
	'resumeDirective',
]);

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
				toolCalls: [{ toolName: 'resumeDirective' }],
			},
		},
		{
			input: {
				caseName: 'Projects overview goes to grid view',
				userMessage: 'What have you built?',
				currentDirective: createDefaultLandingDirective(),
			},
			expected: {
				toolCalls: [{ toolName: 'projectsDirective', input: { variant: 'grid' } }],
			},
		},
		{
			input: {
				caseName: 'Ambiguous experience request triggers clarify',
				userMessage: 'Show me your experience',
				currentDirective: createDefaultLandingDirective(),
			},
			expected: {
				toolCalls: [
					{
						toolName: 'clarify',
						input: {
							slot: 'experience_type',
							kind: 'choice',
							options: ['Career Timeline', 'Technical Skills', 'Project Work'],
						},
					},
					{
						toolName: 'exploreDirective',
					},
				],
			},
		},
		{
			input: {
				caseName: 'Portfolio mechanics question uses the special clarify flow',
				userMessage: 'How does this portfolio app work?',
				currentDirective: createDefaultLandingDirective(),
			},
			expected: {
				toolCalls: [
					{
						toolName: 'clarify',
						input: {
							slot: 'next_answer',
							kind: 'choice',
							options: ['Show me the projects', 'Just put the resume in the bag'],
						},
					},
					{
						toolName: 'exploreDirective',
					},
				],
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
			name: 'Normalized Tool Routing',
			scorer: async ({ output, expected }) =>
				toolCallAccuracy({
					actualCalls: normalizeAskToolCalls(output.toolCalls),
					expectedCalls: expected.toolCalls,
					mode: 'flexible',
				}),
		},
		{
			name: 'Primary Directive Present',
			scorer: async ({ output }) => {
				const normalizedToolCalls = normalizeAskToolCalls(output.toolCalls);
				const hasPrimaryDirective = normalizedToolCalls.some((call) =>
					PRIMARY_DIRECTIVE_TOOL_NAMES.has(call.toolName),
				);

				return {
					score: hasPrimaryDirective ? 1 : 0,
					metadata: {
						actualToolCalls: normalizedToolCalls,
					},
				};
			},
		},
		{
			name: 'Narration Present',
			scorer: async ({ output }) => {
				const text = output.text.trim();
				return {
					score: text.length > 0 ? 1 : 0,
					metadata: {
						text,
					},
				};
			},
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
			label: 'Expected Tool Calls',
			value: JSON.stringify(expected?.toolCalls ?? [], null, 2),
		},
		{
			label: 'Text Preview',
			value: output.text.slice(0, 240),
		},
	],
});
