import { evalite } from 'evalite';
import { createDefaultLandingDirective } from '~/lib/ai/directiveTools';
import {
	LANDING_SUGGESTION_CHIP_QUESTIONS,
	type LandingSuggestionChipQuestion,
} from '~/components/SuggestionChips/questions';
import { normalizeAskToolCalls, runAskEvalTurn, type AskEvalOutput } from './helpers/runAskEval';
import {
	scoreAskBehavior,
	scoreNarrationPresent,
	type AskBehaviorExpectation,
} from './helpers/askEvalScorers';

type LandingSuggestionChipInput = {
	caseName: string;
	userMessage: LandingSuggestionChipQuestion;
};

type LandingSuggestionChipExpected = AskBehaviorExpectation;

const EXPECTED_BY_CHIP: Record<LandingSuggestionChipQuestion, LandingSuggestionChipExpected> = {
	"What's your experience with modern web frameworks?": {
		primaryDirective: { toolName: 'skillsDirective', variant: 'technical' },
	},
	'Why should we hire you over an AI?': {
		primaryDirective: [
			{ toolName: 'exploreDirective' },
			{ toolName: 'valuesDirective', variant: 'evidence' },
		],
	},
	'Why should we hire you in this economy': {
		primaryDirective: [
			{ toolName: 'exploreDirective' },
			{ toolName: 'valuesDirective', variant: 'evidence' },
		],
	},
	'What makes you unique?': {
		primaryDirective: [
			{ toolName: 'valuesDirective', variant: 'evidence' },
			{ toolName: 'exploreDirective' },
		],
	},
	'What are you most proud of in your career?': {
		primaryDirective: [
			{ toolName: 'projectsDirective', variant: 'case-study' },
			{ toolName: 'exploreDirective' },
		],
	},
	'Do you have experience in Typescript?': {
		primaryDirective: { toolName: 'skillsDirective', variant: 'technical' },
	},
	'Are you just another programmer?': {
		primaryDirective: [
			{ toolName: 'valuesDirective', variant: 'evidence' },
			{ toolName: 'exploreDirective' },
		],
	},
	'How does this portfolio work?': {
	},
	'Show me your React projects': {
		primaryDirective: { toolName: 'projectsDirective', variant: 'grid' },
	},
	'Just put the resume in the bag': {
		primaryDirective: { toolName: 'resumeDirective' },
	},
};

const defineLandingSuggestionChipEval = process.env.OPENAI_API_KEY ? evalite : evalite.skip;

defineLandingSuggestionChipEval<LandingSuggestionChipInput, AskEvalOutput, LandingSuggestionChipExpected>(
	'Landing Suggestion Chips',
	{
		data: LANDING_SUGGESTION_CHIP_QUESTIONS.map((question) => ({
			input: {
				caseName: question,
				userMessage: question,
			},
			expected: EXPECTED_BY_CHIP[question],
		})),
		task: async ({ userMessage }) =>
			runAskEvalTurn({
				currentDirective: createDefaultLandingDirective(),
				messages: [{ role: 'user', content: userMessage }],
			}),
		scorers: [
			{
				name: 'Expected Landing Behavior',
				scorer: async ({ output, expected }) => scoreAskBehavior({ output, expected }),
			},
			{
				name: 'Narration Present',
				scorer: async ({ output }) => scoreNarrationPresent({ output }),
			},
		],
		columns: ({ input, output, expected }) => [
			{ label: 'Chip', value: input.caseName },
			{
				label: 'Actual Tool Calls',
				value: JSON.stringify(normalizeAskToolCalls(output.toolCalls), null, 2),
			},
			{
				label: 'Expected',
				value: JSON.stringify(expected, null, 2),
			},
			{
				label: 'Text Preview',
				value: output.text.slice(0, 240),
			},
		],
	},
);
