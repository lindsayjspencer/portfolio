import { generateText } from 'ai';
import type { AppLanguageModel } from '~/server/model';
import { wrapAISDKModel } from 'evalite/ai-sdk';
import type { Directive } from '~/lib/ai/directiveTools';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { generalModel, plannerModel } from '~/server/model';
import {
	buildNarrationCallOptions,
	buildPlannerCallOptions,
	buildPlannerFallbackDirective,
	extractDirectiveReason,
	isDirectiveToolName,
	toDirectiveFromToolCall,
} from '~/server/ask/runtime';

const narrationEvalModel = wrapAISDKModel(generalModel) as AppLanguageModel;
const plannerEvalModel = wrapAISDKModel(plannerModel) as AppLanguageModel;

type RawToolCall = {
	toolName: string;
	input?: unknown;
};

export type AskEvalOutput = {
	text: string;
	toolCalls: RawToolCall[];
};

export type NormalizedToolCall = {
	toolName: string;
	input?: Record<string, unknown>;
};

export async function runAskEvalTurn({
	messages,
	currentDirective = null,
}: {
	messages: AskRequestMessage[];
	currentDirective?: Directive | null;
}): Promise<AskEvalOutput> {
	const plannerResult = await generateText(
		buildPlannerCallOptions({
			model: plannerEvalModel,
			messages,
			currentDirective,
		}),
	);

	const toolCalls = plannerResult.toolCalls.map((call) => ({
		toolName: call.toolName,
		input: call.input,
	}));

	const firstDirectiveCall = plannerResult.toolCalls.find((call) => isDirectiveToolName(call.toolName));
	const selectedDirective =
		firstDirectiveCall && isDirectiveToolName(firstDirectiveCall.toolName)
			? toDirectiveFromToolCall(firstDirectiveCall.toolName, firstDirectiveCall.input, currentDirective?.theme ?? 'cold')
			: null;
	const plannerReason =
		firstDirectiveCall && isDirectiveToolName(firstDirectiveCall.toolName)
			? extractDirectiveReason(firstDirectiveCall.input)
			: null;

	const narrationResult = await generateText(
		buildNarrationCallOptions({
			model: narrationEvalModel,
			messages,
			directive: selectedDirective ?? buildPlannerFallbackDirective(currentDirective),
			plannerReason,
		}),
	);

	return {
		text: narrationResult.text,
		toolCalls,
	};
}

export function normalizeAskToolCalls(toolCalls: RawToolCall[]): NormalizedToolCall[] {
	return toolCalls.map((call) => {
		if (isDirectiveToolName(call.toolName)) {
			const variant = readStringField(call.input, 'variant');
			return variant
				? {
						toolName: call.toolName,
						input: { variant },
					}
				: { toolName: call.toolName };
		}

		return { toolName: call.toolName };
	});
}

function readStringField(value: unknown, key: string): string | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const field = value[key];
	return typeof field === 'string' ? field : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
