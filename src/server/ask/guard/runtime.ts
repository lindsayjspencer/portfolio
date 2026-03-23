import { generateObject } from 'ai';
import type { LanguageModel, LanguageModelUsage } from 'ai';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { buildOpenAIPromptCacheOptions } from '~/server/model/promptCache';
import { askGuardDecisionSchema, type AskGuardOutcome } from './types';
import {
	ASK_GUARD_PROMPT_CACHE_KEY,
	ASK_GUARD_SYSTEM_PROMPT,
	buildGuardMessages,
} from '../prompts/guard/prompt';

type GuardUsageResult = {
	summary: LanguageModelUsage | null;
	details: LanguageModelUsage | undefined;
};

export type AskGuardRunResult = {
	outcome: AskGuardOutcome;
	usage: GuardUsageResult;
};

export function buildGuardCallOptions({
	model,
	messages,
}: {
	model: LanguageModel;
	messages: AskRequestMessage[];
}) {
	return {
		model,
		system: ASK_GUARD_SYSTEM_PROMPT,
		messages: buildGuardMessages(messages),
		schema: askGuardDecisionSchema,
		providerOptions: buildOpenAIPromptCacheOptions(ASK_GUARD_PROMPT_CACHE_KEY),
	};
}

export async function runAskGuard({
	model,
	messages,
}: {
	model: LanguageModel;
	messages: AskRequestMessage[];
}): Promise<AskGuardRunResult> {
	const result = await generateObject(
		buildGuardCallOptions({
			model,
			messages,
		}),
	);

	return {
		outcome: {
			...result.object,
			source: 'model',
		},
		usage: {
			summary: result.usage ?? null,
			details: result.usage ?? undefined,
		},
	};
}
