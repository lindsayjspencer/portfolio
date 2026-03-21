import { describe, expect, it } from 'vitest';
import type { LanguageModelUsage } from 'ai';
import { toAskUsageSummary, toLangfuseUsageDetails } from '../usage';

describe('ask usage helpers', () => {
	it('maps AI SDK usage into a compact summary with cache counters', () => {
		const usage: LanguageModelUsage = {
			inputTokens: 1200,
			inputTokenDetails: {
				noCacheTokens: 176,
				cacheReadTokens: 1024,
				cacheWriteTokens: 96,
			},
			outputTokens: 220,
			outputTokenDetails: {
				textTokens: 180,
				reasoningTokens: 40,
			},
			totalTokens: 1420,
		};

		expect(toAskUsageSummary(usage)).toEqual({
			inputTokens: 1200,
			inputNoCacheTokens: 176,
			inputCacheReadTokens: 1024,
			inputCacheWriteTokens: 96,
			outputTokens: 220,
			outputTextTokens: 180,
			outputReasoningTokens: 40,
			totalTokens: 1420,
		});
	});

	it('omits undefined metrics from the Langfuse usage payload', () => {
		const usage: LanguageModelUsage = {
			inputTokens: 900,
			inputTokenDetails: {
				noCacheTokens: 900,
				cacheReadTokens: undefined,
				cacheWriteTokens: undefined,
			},
			outputTokens: 180,
			outputTokenDetails: {
				textTokens: 180,
				reasoningTokens: undefined,
			},
			totalTokens: 1080,
		};

		expect(toLangfuseUsageDetails(usage)).toEqual({
			input: 900,
			input_no_cache: 900,
			output: 180,
			output_text: 180,
			total: 1080,
		});
	});
});
