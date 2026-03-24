import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { SECURITY_MODEL_ID, securityModel } from '~/server/model';
import { runAskSecurity } from '../guard/runtime';
import type { AskSecurityOutcome } from '../guard/types';
import { toAskUsageSummary, toLangfuseUsageDetails } from '../usage';
import { createGeneration, DETERMINISTIC_WHITELIST_MODEL, WHITELISTED_SUGGESTION_CHIP_REASON } from './shared';
import type { AskModelStage } from './types';

function createWhitelistedSecurityOutcome(): AskSecurityOutcome {
	return {
		decision: 'allow',
		category: 'safe',
		reason: `${WHITELISTED_SUGGESTION_CHIP_REASON} Security checks were skipped by whitelist.`,
		source: 'whitelist',
	};
}

export async function runSecurityStage({
	trimmedMessages,
	whitelistedSuggestionChipBypass,
}: {
	trimmedMessages: AskRequestMessage[];
	whitelistedSuggestionChipBypass: boolean;
}): Promise<AskModelStage<AskSecurityOutcome>> {
	if (whitelistedSuggestionChipBypass) {
		const outcome = createWhitelistedSecurityOutcome();
		const usage = { summary: null, details: undefined };

		return {
			outcome,
			usage,
			model: DETERMINISTIC_WHITELIST_MODEL,
			generation: createGeneration({
				name: 'portfolio-ask-security-whitelist',
				model: DETERMINISTIC_WHITELIST_MODEL,
				input: {
					trimmedMessages,
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
		const result = await runAskSecurity({
			model: securityModel,
			messages: trimmedMessages,
		});
		console.log('Security outcome:', result.outcome);

		const usage = {
			summary: result.usage.summary ? toAskUsageSummary(result.usage.summary) : null,
			details: result.usage.details ? toLangfuseUsageDetails(result.usage.details) : undefined,
		};

		return {
			outcome: result.outcome,
			usage,
			model: SECURITY_MODEL_ID,
			generation: createGeneration({
				name: 'portfolio-ask-security',
				model: SECURITY_MODEL_ID,
				input: {
					trimmedMessages,
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
		console.error('Security check failed, continuing without a block:', error);

		const outcome: AskSecurityOutcome = {
			decision: 'allow',
			category: 'other',
			reason: 'Security model failed, so the request was allowed by fallback.',
			source: 'fallback',
		};
		const usage = { summary: null, details: undefined };
		const model = `${SECURITY_MODEL_ID}:fallback-open`;

		return {
			outcome,
			usage,
			model,
			generation: createGeneration({
				name: 'portfolio-ask-security',
				model,
				input: {
					trimmedMessages,
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
