import { evalite } from 'evalite';
import { createDefaultLandingDirective } from '~/lib/ai/directiveTools';
import {
	LANDING_SUGGESTION_CHIP_QUESTIONS,
	type LandingSuggestionChipQuestion,
} from '~/components/SuggestionChips/questions';
import { normalizeAskToolCalls, runAskEvalTurn, type AskEvalOutput } from './helpers/runAskEval';
import {
	scoreExactlyOneViewTool,
	scoreNarrationPresent,
	scoreNoRawJsonInNarration,
} from './helpers/askEvalScorers';

type LandingSuggestionChipInput = {
	caseName: string;
	userMessage: LandingSuggestionChipQuestion;
};

const defineLandingSuggestionChipEval = process.env.OPENAI_API_KEY ? evalite : evalite.skip;

defineLandingSuggestionChipEval<LandingSuggestionChipInput, AskEvalOutput>(
	'Landing Suggestion Chips',
	{
		data: LANDING_SUGGESTION_CHIP_QUESTIONS.map((question) => ({
			input: {
				caseName: question,
				userMessage: question,
			},
		})),
		task: async ({ userMessage }) =>
			runAskEvalTurn({
				currentDirective: createDefaultLandingDirective(),
				messages: [{ role: 'user', content: userMessage }],
			}),
		scorers: [
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
		columns: ({ input, output }) => [
			{ label: 'Chip', value: input.caseName },
			{
				label: 'Actual Tool Calls',
				value: JSON.stringify(normalizeAskToolCalls(output.toolCalls), null, 2),
			},
			{
				label: 'Text Preview',
				value: output.text.slice(0, 240),
			},
		],
	},
);
