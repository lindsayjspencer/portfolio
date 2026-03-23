import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import type { AskGuardOutcome } from './types';

const MAX_LATEST_MESSAGE_CHARS = 2_500;
const MAX_LATEST_MESSAGE_LINES = 60;
const MAX_TOTAL_MESSAGE_CHARS = 18_000;
const MAX_TOTAL_MESSAGE_LINES = 220;
const MAX_STRUCTURED_BLOB_LINES = 30;

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
	decision: AskGuardOutcome['decision'],
	category: AskGuardOutcome['category'],
	reason: string,
): AskGuardOutcome {
	return {
		decision,
		category,
		reason,
		source: 'policy',
	};
}

export function runAskGuardPolicy(messages: AskRequestMessage[]): AskGuardOutcome | null {
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

	const totalMessageChars = messages.reduce((total, message) => total + message.content.length, 0);
	if (totalMessageChars > MAX_TOTAL_MESSAGE_CHARS) {
		return createOutcome(
			'ask_to_shorten',
			'too_long',
			`The conversation payload is ${totalMessageChars} characters long and should be shortened.`,
		);
	}

	const totalMessageLines = messages.reduce((total, message) => total + countNonEmptyLines(message.content), 0);
	if (totalMessageLines > MAX_TOTAL_MESSAGE_LINES) {
		return createOutcome(
			'ask_to_shorten',
			'too_long',
			`The conversation spans ${totalMessageLines} non-empty lines and should be shortened.`,
		);
	}

	return null;
}
