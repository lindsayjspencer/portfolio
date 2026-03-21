import { directiveToolNames, type DirectiveToolName } from '~/server/ask/runtime';
import { normalizeAskToolCalls, type AskEvalOutput, type NormalizedToolCall } from './runAskEval';

const PRIMARY_DIRECTIVE_TOOL_NAMES = new Set<DirectiveToolName>(directiveToolNames);

export type ExpectedPrimaryDirective = {
	toolName: DirectiveToolName;
	variant?: string;
};

export type ExpectedClarifyCall = {
	slot: string;
	kind: 'choice' | 'free';
	options?: string[];
	multi?: boolean;
};

export type AskBehaviorExpectation = {
	primaryDirective: ExpectedPrimaryDirective | ExpectedPrimaryDirective[];
	clarify?: ExpectedClarifyCall;
};

function sameStringArray(left: string[] | undefined, right: string[] | undefined): boolean {
	if (left === undefined && right === undefined) {
		return true;
	}

	if (!left || !right || left.length !== right.length) {
		return false;
	}

	return left.every((value, index) => value === right[index]);
}

function matchesDirective(
	actual: NormalizedToolCall | undefined,
	expected: ExpectedPrimaryDirective | ExpectedPrimaryDirective[],
): boolean {
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

function matchesClarify(
	actual: NormalizedToolCall | undefined,
	expected: ExpectedClarifyCall | undefined,
): boolean {
	if (!expected) {
		return actual === undefined;
	}

	if (!actual || actual.toolName !== 'clarify' || !actual.input) {
		return false;
	}

	return (
		actual.input.slot === expected.slot &&
		actual.input.kind === expected.kind &&
		actual.input.multi === expected.multi &&
		sameStringArray(asStringArray(actual.input.options), expected.options)
	);
}

function asStringArray(value: unknown): string[] | undefined {
	if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
		return undefined;
	}

	return value;
}

export function getPrimaryDirective(toolCalls: NormalizedToolCall[]): NormalizedToolCall | undefined {
	return toolCalls.find(
		(call): call is NormalizedToolCall & { toolName: DirectiveToolName } =>
			PRIMARY_DIRECTIVE_TOOL_NAMES.has(call.toolName as DirectiveToolName),
	);
}

export function getClarifyCall(toolCalls: NormalizedToolCall[]): NormalizedToolCall | undefined {
	return toolCalls.find((call) => call.toolName === 'clarify');
}

export function scoreAskBehavior({
	output,
	expected,
}: {
	output: AskEvalOutput;
	expected: AskBehaviorExpectation;
}) {
	const normalizedToolCalls = normalizeAskToolCalls(output.toolCalls);
	const primaryDirective = getPrimaryDirective(normalizedToolCalls);
	const clarifyCall = getClarifyCall(normalizedToolCalls);
	const score =
		matchesDirective(primaryDirective, expected.primaryDirective) &&
		matchesClarify(clarifyCall, expected.clarify)
			? 1
			: 0;

	return {
		score,
		metadata: {
			actualPrimaryDirective: primaryDirective,
			actualClarifyCall: clarifyCall,
		},
	};
}

export function scorePrimaryDirectivePresent({ output }: { output: AskEvalOutput }) {
	const normalizedToolCalls = normalizeAskToolCalls(output.toolCalls);
	const primaryDirective = getPrimaryDirective(normalizedToolCalls);

	return {
		score: primaryDirective ? 1 : 0,
		metadata: {
			actualPrimaryDirective: primaryDirective,
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
