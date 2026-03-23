import { generateText } from 'ai';
import type { AppLanguageModel } from '~/server/model';
import { wrapAISDKModel } from 'evalite/ai-sdk';
import type { Directive } from '~/lib/ai/directiveTools';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { generalModel } from '~/server/model';
import { buildAskCallOptions, isDirectiveToolName } from '~/server/ask/runtime';

const model = wrapAISDKModel(generalModel) as AppLanguageModel;

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
	const askCallOptions = buildAskCallOptions({
		model,
		messages,
		currentDirective,
	});

	const result = await generateText(askCallOptions);
	const toolCalls = result.toolCalls.map((call) => ({
		toolName: call.toolName,
		input: call.input,
	}));

	return {
		text: result.text,
		toolCalls,
	};
}

export function normalizeAskToolCalls(toolCalls: RawToolCall[]): NormalizedToolCall[] {
	return toolCalls
		.map((call) => {
			if (isDirectiveToolName(call.toolName)) {
				const variant = readStringField(call.input, 'variant');
				return variant
					? {
							toolName: call.toolName,
							input: { variant },
						}
					: { toolName: call.toolName };
			}

			if (call.toolName === 'suggestAnswers') {
				return {
					toolName: call.toolName,
					input: pickFields(call.input, ['answers']),
				};
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

function pickFields(value: unknown, keys: string[]): Record<string, unknown> | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const out: Record<string, unknown> = {};

	for (const key of keys) {
		const field = value[key];
		if (field !== undefined) {
			out[key] = field;
		}
	}

	return Object.keys(out).length > 0 ? out : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
