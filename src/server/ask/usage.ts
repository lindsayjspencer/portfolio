import type { LanguageModelUsage } from 'ai';

export type AskUsageSummary = {
	inputTokens?: number;
	outputTokens?: number;
	totalTokens?: number;
	inputNoCacheTokens?: number;
	inputCacheReadTokens?: number;
	inputCacheWriteTokens?: number;
	outputTextTokens?: number;
	outputReasoningTokens?: number;
};

function addMetric(target: Record<string, number>, key: string, value: number | undefined): void {
	if (value !== undefined) {
		target[key] = value;
	}
}

export function toAskUsageSummary(usage: LanguageModelUsage): AskUsageSummary {
	return {
		inputTokens: usage.inputTokens,
		outputTokens: usage.outputTokens,
		totalTokens: usage.totalTokens,
		inputNoCacheTokens: usage.inputTokenDetails.noCacheTokens,
		inputCacheReadTokens: usage.inputTokenDetails.cacheReadTokens,
		inputCacheWriteTokens: usage.inputTokenDetails.cacheWriteTokens,
		outputTextTokens: usage.outputTokenDetails.textTokens,
		outputReasoningTokens: usage.outputTokenDetails.reasoningTokens,
	};
}

export function toLangfuseUsageDetails(usage: LanguageModelUsage): Record<string, number> | undefined {
	const details: Record<string, number> = {};

	addMetric(details, 'input', usage.inputTokens);
	addMetric(details, 'output', usage.outputTokens);
	addMetric(details, 'total', usage.totalTokens);
	addMetric(details, 'input_no_cache', usage.inputTokenDetails.noCacheTokens);
	addMetric(details, 'input_cache_read', usage.inputTokenDetails.cacheReadTokens);
	addMetric(details, 'input_cache_write', usage.inputTokenDetails.cacheWriteTokens);
	addMetric(details, 'output_text', usage.outputTokenDetails.textTokens);
	addMetric(details, 'output_reasoning', usage.outputTokenDetails.reasoningTokens);

	return Object.keys(details).length > 0 ? details : undefined;
}
