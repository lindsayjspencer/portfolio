import type { Directive } from '~/lib/ai/directiveTools';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { PURPOSE_MODEL_ID, purposeModel } from '~/server/model';
import { runAskPurpose } from '../purpose/runtime';
import type { AskPurposeOutcome } from '../purpose/types';
import { toAskUsageSummary, toLangfuseUsageDetails } from '../usage';
import { createGeneration, DETERMINISTIC_WHITELIST_MODEL, WHITELISTED_SUGGESTION_CHIP_REASON } from './shared';
import type { AskModelStage } from './types';

function createWhitelistedPurposeOutcome(): AskPurposeOutcome {
	return {
		decision: 'allow',
		category: 'in_scope',
		reason: `${WHITELISTED_SUGGESTION_CHIP_REASON} Purpose checks were skipped by whitelist.`,
		source: 'whitelist',
	};
}

export async function runPurposeStage({
	trimmedMessages,
	currentDirective,
	whitelistedSuggestionChipBypass,
}: {
	trimmedMessages: AskRequestMessage[];
	currentDirective: Directive | null;
	whitelistedSuggestionChipBypass: boolean;
}): Promise<AskModelStage<AskPurposeOutcome>> {
	if (whitelistedSuggestionChipBypass) {
		const outcome = createWhitelistedPurposeOutcome();
		const usage = { summary: null, details: undefined };

		return {
			outcome,
			usage,
			model: DETERMINISTIC_WHITELIST_MODEL,
			generation: createGeneration({
				name: 'portfolio-ask-purpose-whitelist',
				model: DETERMINISTIC_WHITELIST_MODEL,
				input: {
					trimmedMessages,
					currentDirective,
					whitelistedSuggestionChipBypass,
				},
				output: {
					outcome,
					usage: usage.summary,
				},
			}),
		};
	}

	try {
		const result = await runAskPurpose({
			model: purposeModel,
			messages: trimmedMessages,
			currentDirective,
		});
		console.log('Purpose outcome:', result.outcome);

		const usage = {
			summary: result.usage.summary ? toAskUsageSummary(result.usage.summary) : null,
			details: result.usage.details ? toLangfuseUsageDetails(result.usage.details) : undefined,
		};

		return {
			outcome: result.outcome,
			usage,
			model: PURPOSE_MODEL_ID,
			generation: createGeneration({
				name: 'portfolio-ask-purpose',
				model: PURPOSE_MODEL_ID,
				input: {
					trimmedMessages,
					currentDirective,
					whitelistedSuggestionChipBypass,
				},
				output: {
					outcome: result.outcome,
					usage: usage.summary,
				},
				usageDetails: usage.details,
			}),
		};
	} catch (error) {
		console.error('Purpose check failed, continuing without a block:', error);

		const outcome: AskPurposeOutcome = {
			decision: 'allow',
			category: 'other',
			reason: 'Purpose model failed, so the request was allowed by fallback.',
			source: 'fallback',
		};
		const usage = { summary: null, details: undefined };
		const model = `${PURPOSE_MODEL_ID}:fallback-open`;

		return {
			outcome,
			usage,
			model,
			generation: createGeneration({
				name: 'portfolio-ask-purpose',
				model,
				input: {
					trimmedMessages,
					currentDirective,
					whitelistedSuggestionChipBypass,
				},
				output: {
					outcome,
					usage: usage.summary,
				},
			}),
		};
	}
}
