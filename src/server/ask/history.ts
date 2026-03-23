import type { AskRequestMessage } from '~/lib/ai/ask-contract';

export const ASK_HISTORY_MESSAGE_LIMIT = 24;

export function trimAskHistory(
	messages: AskRequestMessage[],
	maxMessages: number = ASK_HISTORY_MESSAGE_LIMIT,
): AskRequestMessage[] {
	if (messages.length <= maxMessages) {
		return messages.map((message) => ({ ...message }));
	}

	return messages.slice(-maxMessages).map((message) => ({ ...message }));
}
