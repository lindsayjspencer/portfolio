import { tool } from 'ai';
import { z } from 'zod';

const purposeReasonSchema = z.string().min(1).max(200).describe('Internal-only short reason for the decision.');

const purposeAllowCategorySchema = z.enum(['in_scope', 'resolved_from_context', 'other']);
const purposeRephraseCategorySchema = z.enum(['out_of_scope', 'other']);
const purposeClarifyCategorySchema = z.enum(['ambiguous', 'needs_more_context', 'other']);

export const allowAnswerInputSchema = z.object({
	category: purposeAllowCategorySchema,
	reason: purposeReasonSchema,
});

export const askToRephraseInputSchema = z.object({
	category: purposeRephraseCategorySchema,
	reason: purposeReasonSchema,
	text: z.string().min(1).max(240).describe('Short user-facing redirect text.'),
});

export const askToClarifyInputSchema = z.object({
	category: purposeClarifyCategorySchema,
	reason: purposeReasonSchema,
	question: z.string().min(1).max(240).describe('Short user-facing clarifying question.'),
	suggestedAnswers: z
		.array(z.string().min(1).max(120))
		.min(1)
		.max(4)
		.optional()
		.describe('Optional exact reply suggestions the user can click.'),
});

export const purposeTools = {
	allowAnswer: tool({
		description:
			'Use when the latest user message can reasonably move forward to the answer stage without clarification.',
		inputSchema: allowAnswerInputSchema,
	}),
	askToRephrase: tool({
		description:
			'Use when the latest user message is harmless but outside the purpose of this portfolio chat. Provide a short redirect message.',
		inputSchema: askToRephraseInputSchema,
	}),
	askToClarify: tool({
		description:
			'Use when the latest user message is in purpose but still ambiguous after considering recent conversation and the current visible view. Provide a short question and optional reply suggestions.',
		inputSchema: askToClarifyInputSchema,
	}),
} as const;

export type PurposeToolName = keyof typeof purposeTools;

export type AskPurposeDecision =
	| ({
			decision: 'allow';
	  } & z.infer<typeof allowAnswerInputSchema>)
	| ({
			decision: 'ask_to_rephrase';
	  } & z.infer<typeof askToRephraseInputSchema>)
	| ({
			decision: 'ask_to_clarify';
	  } & z.infer<typeof askToClarifyInputSchema>);

export type AskPurposeSource = 'model' | 'fallback';

export type AskPurposeOutcome = AskPurposeDecision & {
	source: AskPurposeSource;
};

export function isPurposeToolName(toolName: string): toolName is PurposeToolName {
	return toolName in purposeTools;
}

export function toAskPurposeDecisionFromToolCall(toolName: PurposeToolName, input: unknown): AskPurposeDecision | null {
	switch (toolName) {
		case 'allowAnswer': {
			const parsed = allowAnswerInputSchema.safeParse(input);
			return parsed.success
				? {
						decision: 'allow',
						...parsed.data,
					}
				: null;
		}
		case 'askToRephrase': {
			const parsed = askToRephraseInputSchema.safeParse(input);
			return parsed.success
				? {
						decision: 'ask_to_rephrase',
						...parsed.data,
					}
				: null;
		}
		case 'askToClarify': {
			const parsed = askToClarifyInputSchema.safeParse(input);
			return parsed.success
				? {
						decision: 'ask_to_clarify',
						...parsed.data,
					}
				: null;
		}
	}
}
