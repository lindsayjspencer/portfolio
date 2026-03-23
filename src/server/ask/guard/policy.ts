import type { AskRequestMessage } from '~/lib/ai/ask-contract';

const MAX_LATEST_MESSAGE_CHARS = 2_500;
const MAX_LATEST_MESSAGE_LINES = 60;
const MAX_STRUCTURED_BLOB_LINES = 30;

export type AskSizePolicyOutcome = {
	decision: 'allow' | 'ask_to_shorten';
	category: 'safe' | 'too_long';
	reason: string;
	source: 'policy';
};

function getLatestUserMessage(messages: AskRequestMessage[]): string | null {
	return [...messages].reverse().find((message) => message.role === 'user')?.content ?? null;
}

function countNonEmptyLines(text: string): number {
	return text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean).length;
}

function looksLikeStructuredBlob(text: string): boolean {
	const lines = text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	if (lines.length < MAX_STRUCTURED_BLOB_LINES) {
		return false;
	}

	const structuredLineCount = lines.filter((line) => /^[\[{<"]/.test(line) || /:\s*[{["\d-]/.test(line)).length;
	return structuredLineCount / lines.length >= 0.55;
}

function createOutcome(
	decision: AskSizePolicyOutcome['decision'],
	category: AskSizePolicyOutcome['category'],
	reason: string,
): AskSizePolicyOutcome {
	return {
		decision,
		category,
		reason,
		source: 'policy',
	};
}

export function runAskSizePolicy(messages: AskRequestMessage[]): AskSizePolicyOutcome {
	const latestUserMessage = getLatestUserMessage(messages)?.trim();

	if (!latestUserMessage) {
		return createOutcome('ask_to_shorten', 'too_long', 'No usable user question was found in the request.');
	}

	if (latestUserMessage.length > MAX_LATEST_MESSAGE_CHARS) {
		return createOutcome(
			'ask_to_shorten',
			'too_long',
			`The latest user message is ${latestUserMessage.length} characters long and should be shortened.`,
		);
	}

	const latestUserLineCount = countNonEmptyLines(latestUserMessage);
	if (latestUserLineCount > MAX_LATEST_MESSAGE_LINES) {
		return createOutcome(
			'ask_to_shorten',
			'too_long',
			`The latest user message spans ${latestUserLineCount} non-empty lines and should be shortened.`,
		);
	}

	if (looksLikeStructuredBlob(latestUserMessage)) {
		return createOutcome(
			'ask_to_shorten',
			'too_long',
			'The latest user message looks like a large structured blob instead of a concise question.',
		);
	}

	return createOutcome('allow', 'safe', 'The latest user message is concise enough to continue.');
}
