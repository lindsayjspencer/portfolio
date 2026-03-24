import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { runAskSizePolicy, type AskSizePolicyOutcome } from '../guard/policy';
import type { AskSizePolicyStage } from './types';
import { createGeneration, DETERMINISTIC_POLICY_MODEL, WHITELISTED_SUGGESTION_CHIP_REASON } from './shared';

function createWhitelistedSizePolicyOutcome(): AskSizePolicyOutcome {
	return {
		decision: 'allow',
		category: 'safe',
		reason: `${WHITELISTED_SUGGESTION_CHIP_REASON} Size checks were skipped by whitelist.`,
		source: 'policy',
	};
}

export function runSizePolicyStage({
	messages,
	whitelistedSuggestionChipBypass,
}: {
	messages: AskRequestMessage[];
	whitelistedSuggestionChipBypass: boolean;
}): AskSizePolicyStage {
	const outcome = whitelistedSuggestionChipBypass ? createWhitelistedSizePolicyOutcome() : runAskSizePolicy(messages);

	return {
		outcome,
		generation: createGeneration({
			name: 'portfolio-ask-size-policy',
			model: DETERMINISTIC_POLICY_MODEL,
			input: {
				messages,
				whitelistedSuggestionChipBypass,
			},
			output: {
				outcome,
			},
		}),
	};
}
