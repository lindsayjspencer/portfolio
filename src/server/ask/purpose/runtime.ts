import { generateText } from 'ai';
import type { LanguageModel, LanguageModelUsage } from 'ai';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import type { Directive } from '~/lib/ai/directiveTools';
import { buildOpenAIPromptCacheOptions } from '~/server/model/promptCache';
import {
	isPurposeToolName,
	purposeTools,
	toAskPurposeDecisionFromToolCall,
	type PurposeToolName,
	type AskPurposeOutcome,
} from './types';
import {
	ASK_PURPOSE_PROMPT_CACHE_KEY,
	ASK_PURPOSE_SYSTEM_PROMPT,
	buildPurposeMessages,
} from '../prompts/purpose/prompt';

type PurposeUsageResult = {
	summary: LanguageModelUsage | null;
	details: LanguageModelUsage | undefined;
};

export type AskPurposeRunResult = {
	outcome: AskPurposeOutcome;
	usage: PurposeUsageResult;
};

export function buildPurposeCallOptions({
	model,
	messages,
	currentDirective,
}: {
	model: LanguageModel;
	messages: AskRequestMessage[];
	currentDirective: Directive | null;
}) {
	return {
		model,
		system: ASK_PURPOSE_SYSTEM_PROMPT,
		messages: buildPurposeMessages({
			messages,
			currentDirective,
		}),
		tools: purposeTools,
		toolChoice: 'required' as const,
		providerOptions: buildOpenAIPromptCacheOptions(ASK_PURPOSE_PROMPT_CACHE_KEY),
	};
}

export async function runAskPurpose({
	model,
	messages,
	currentDirective,
}: {
	model: LanguageModel;
	messages: AskRequestMessage[];
	currentDirective: Directive | null;
}): Promise<AskPurposeRunResult> {
	const result = await generateText(
		buildPurposeCallOptions({
			model,
			messages,
			currentDirective,
		}),
	);

	const toolCalls = result.toolCalls.filter(
		(toolCall): toolCall is (typeof result.toolCalls)[number] & { toolName: PurposeToolName } =>
			isPurposeToolName(toolCall.toolName),
	);
	if (toolCalls.length !== 1) {
		throw new Error(`Purpose stage expected exactly one tool call, received ${toolCalls.length}.`);
	}

	const toolCall = toolCalls[0];
	if (!toolCall) {
		throw new Error('Purpose stage returned no tool call.');
	}

	const decision = toAskPurposeDecisionFromToolCall(toolCall.toolName, toolCall.input);
	if (!decision) {
		throw new Error(`Purpose stage returned an invalid tool payload for ${toolCall.toolName}.`);
	}

	return {
		outcome: {
			...decision,
			source: 'model',
		},
		usage: {
			summary: result.totalUsage ?? result.usage ?? null,
			details: result.totalUsage ?? result.usage ?? undefined,
		},
	};
}
