import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import type { SuggestedAnswersPayload } from '~/lib/ai/suggestAnswersTool';
import type { Directive } from '~/lib/ai/directiveTools';
import type { AskSizePolicyOutcome } from '../guard/policy';
import type { AskSecurityOutcome } from '../guard/types';
import type { AskPurposeOutcome } from '../purpose/types';
import type { AskUsageSummary } from '../usage';

export type AskUsageDetails = Record<string, number> | undefined;

export type AskStreamEvent =
	| { type: 'directive'; directive: Directive }
	| { type: 'text'; delta: string }
	| { type: 'suggestAnswers'; payload: SuggestedAnswersPayload }
	| { type: 'error'; message: string }
	| { type: 'done'; ok: boolean };

export type AskGenerationPayload = {
	name: string;
	model: string;
	input: unknown;
	output: unknown;
	usageDetails?: AskUsageDetails;
};

export type AskUsageBlock = {
	summary: AskUsageSummary | null;
	details: AskUsageDetails;
};

export type AskSizePolicyStage = {
	outcome: AskSizePolicyOutcome;
	generation: AskGenerationPayload;
};

export type AskModelStage<TOutcome> = {
	outcome: TOutcome;
	usage: AskUsageBlock;
	model: string;
	generation: AskGenerationPayload;
};

export type AskOrchestrationTelemetry = {
	inputPayload: {
		messages: AskRequestMessage[];
		trimmedMessages: AskRequestMessage[];
		currentDirective: Directive | null;
	};
	outputPayload: {
		sizePolicy: {
			outcome: AskSizePolicyOutcome;
			usage: null;
		};
		security: {
			outcome: AskSecurityOutcome;
			usage: AskUsageSummary | null;
		} | null;
		purpose: {
			outcome: AskPurposeOutcome;
			usage: AskUsageSummary | null;
		} | null;
		planner: {
			toolCalls: Array<{ name: string; input: unknown }>;
			selectedDirective: Directive | null;
			reason: string | null;
			streamError: string | null;
			usage: AskUsageSummary | null;
		} | null;
		narration: {
			toolCalls: Array<{ name: string; input: unknown }>;
			streamedText: string;
			streamError: string | null;
			usage: AskUsageSummary | null;
		} | null;
	};
	metadata: Record<string, string>;
	generations: AskGenerationPayload[];
};

export type AskPlannerPayload = NonNullable<AskOrchestrationTelemetry['outputPayload']['planner']>;
export type AskNarrationPayload = NonNullable<AskOrchestrationTelemetry['outputPayload']['narration']>;
