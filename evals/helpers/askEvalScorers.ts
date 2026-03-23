import { directiveToolNames, type DirectiveToolName } from '~/server/ask/runtime';
import { normalizeAskToolCalls, type AskEvalOutput, type NormalizedToolCall } from './runAskEval';

const VIEW_TOOL_NAMES = new Set<DirectiveToolName>(directiveToolNames);

export type ExpectedPrimaryDirective = {
	toolName: DirectiveToolName;
	variant?: string;
};

function asString(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function matchesDirective(
	actual: NormalizedToolCall | undefined,
	expected: ExpectedPrimaryDirective | ExpectedPrimaryDirective[] | undefined,
): boolean {
	if (!expected) {
		return actual === undefined;
	}

	if (!actual) {
		return false;
	}

	const candidates = Array.isArray(expected) ? expected : [expected];

	return candidates.some((candidate) => {
		if (actual.toolName !== candidate.toolName) {
			return false;
		}

		if (candidate.variant === undefined) {
			return true;
		}

		return actual.input?.variant === candidate.variant;
	});
}

function getNormalizedViewToolCalls(toolCalls: NormalizedToolCall[]): NormalizedToolCall[] {
	return toolCalls.filter(
		(call): call is NormalizedToolCall & { toolName: DirectiveToolName } =>
			VIEW_TOOL_NAMES.has(call.toolName as DirectiveToolName),
	);
}

export function getPrimaryDirective(toolCalls: NormalizedToolCall[]): NormalizedToolCall | undefined {
	return getNormalizedViewToolCalls(toolCalls)[0];
}

export function scoreExpectedPrimaryDirective({
	output,
	expected,
}: {
	output: AskEvalOutput;
	expected: ExpectedPrimaryDirective | ExpectedPrimaryDirective[];
}) {
	const normalizedToolCalls = normalizeAskToolCalls(output.toolCalls);
	const primaryDirective = getPrimaryDirective(normalizedToolCalls);
	const score = matchesDirective(primaryDirective, expected) ? 1 : 0;

	return {
		score,
		metadata: {
			actualPrimaryDirective: primaryDirective,
			actualToolCalls: normalizedToolCalls,
		},
	};
}

export function scoreExactlyOneViewTool({ output }: { output: AskEvalOutput }) {
	const normalizedToolCalls = normalizeAskToolCalls(output.toolCalls);
	const viewToolCalls = getNormalizedViewToolCalls(normalizedToolCalls);

	return {
		score: viewToolCalls.length === 1 ? 1 : 0,
		metadata: {
			viewToolCount: viewToolCalls.length,
			viewToolCalls,
		},
	};
}

export function scoreNarrationPresent({ output }: { output: AskEvalOutput }) {
	const text = output.text.trim();

	return {
		score: text.length > 0 ? 1 : 0,
		metadata: {
			text,
		},
	};
}

export function scoreNoRawJsonInNarration({ output }: { output: AskEvalOutput }) {
	const text = asString(output.text).trim();
	const hasJsonLikeContent =
		/```json/i.test(text) ||
		/<functions\./i.test(text) ||
		/\{\s*"[^"]+"\s*:/.test(text) ||
		/\[\s*\{\s*"[^"]+"\s*:/.test(text);

	return {
		score: hasJsonLikeContent ? 0 : 1,
		metadata: {
			text,
			hasJsonLikeContent,
		},
	};
}
