import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import type { AskSecurityOutcome } from '../guard/types';
import type { AskPurposeOutcome } from '../purpose/types';
import { ASK_HISTORY_MESSAGE_LIMIT } from '../history';
import { emitSyntheticWordStream } from '../streaming';
import type {
	AskGenerationPayload,
	AskModelStage,
	AskNarrationPayload,
	AskOrchestrationTelemetry,
	AskPlannerPayload,
	AskSizePolicyStage,
	AskStreamEvent,
	AskUsageDetails,
} from './types';

export const DETERMINISTIC_POLICY_MODEL = 'deterministic-policy';
export const DETERMINISTIC_WHITELIST_MODEL = 'deterministic-whitelist';
export const WHITELISTED_SUGGESTION_CHIP_REASON =
	'Latest user message exactly matched a whitelisted suggestion chip question.';

export function createGeneration({
	name,
	model,
	input,
	output,
	usageDetails,
}: {
	name: string;
	model: string;
	input: unknown;
	output: unknown;
	usageDetails?: AskUsageDetails;
}): AskGenerationPayload {
	return usageDetails
		? {
				name,
				model,
				input,
				output,
				usageDetails,
			}
		: {
				name,
				model,
				input,
				output,
			};
}

export function getLatestUserMessage(messages: AskRequestMessage[]): string | null {
	return [...messages].reverse().find((message) => message.role === 'user')?.content ?? null;
}

export function createBaseMetadata(whitelistedSuggestionChipBypass: boolean): Record<string, string> {
	return {
		historyMessageLimit: String(ASK_HISTORY_MESSAGE_LIMIT),
		whitelistedSuggestionChipBypass: String(whitelistedSuggestionChipBypass),
	};
}

export function buildOutputPayload({
	sizePolicyStage,
	securityStage = null,
	purposeStage = null,
	planner = null,
	narration = null,
}: {
	sizePolicyStage: AskSizePolicyStage;
	securityStage?: AskModelStage<AskSecurityOutcome> | null;
	purposeStage?: AskModelStage<AskPurposeOutcome> | null;
	planner?: AskPlannerPayload | null;
	narration?: AskNarrationPayload | null;
}): AskOrchestrationTelemetry['outputPayload'] {
	return {
		sizePolicy: {
			outcome: sizePolicyStage.outcome,
			usage: null,
		},
		security: securityStage
			? {
					outcome: securityStage.outcome,
					usage: securityStage.usage.summary,
				}
			: null,
		purpose: purposeStage
			? {
					outcome: purposeStage.outcome,
					usage: purposeStage.usage.summary,
				}
			: null,
		planner,
		narration,
	};
}

export async function emitTerminalResponse({
	text,
	emit,
	suggestedAnswers,
}: {
	text: string;
	emit: (event: AskStreamEvent) => void;
	suggestedAnswers?: string[];
}): Promise<void> {
	await emitSyntheticWordStream({
		text,
		emit,
	});

	if (suggestedAnswers?.length) {
		emit({
			type: 'suggestAnswers',
			payload: {
				answers: suggestedAnswers,
			},
		});
	}

	emit({ type: 'done', ok: true });
}
