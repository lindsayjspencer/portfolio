import { generateObject } from 'ai';
import type { LanguageModel, LanguageModelUsage } from 'ai';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { buildOpenAIPromptCacheOptions } from '~/server/model/promptCache';
import { askSecurityDecisionSchema, type AskSecurityOutcome } from './types';
import {
	ASK_SECURITY_PROMPT_CACHE_KEY,
	ASK_SECURITY_SYSTEM_PROMPT,
	buildSecurityMessages,
} from '../prompts/guard/prompt';

type SecurityUsageResult = {
	summary: LanguageModelUsage | null;
	details: LanguageModelUsage | undefined;
};

export type AskSecurityRunResult = {
	outcome: AskSecurityOutcome;
	usage: SecurityUsageResult;
};

export function buildSecurityCallOptions({
	model,
	messages,
}: {
	model: LanguageModel;
	messages: AskRequestMessage[];
}) {
	return {
		model,
		system: ASK_SECURITY_SYSTEM_PROMPT,
		messages: buildSecurityMessages(messages),
		schema: askSecurityDecisionSchema,
		providerOptions: buildOpenAIPromptCacheOptions(ASK_SECURITY_PROMPT_CACHE_KEY),
	};
}

export async function runAskSecurity({
	model,
	messages,
}: {
	model: LanguageModel;
	messages: AskRequestMessage[];
}): Promise<AskSecurityRunResult> {
	const result = await generateObject(
		buildSecurityCallOptions({
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
