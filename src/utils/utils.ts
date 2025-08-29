export function isNewChatCreated(data: unknown): data is {
	type: 'NEW_CHAT_CREATED';
	chatId: string;
} {
	return typeof data === 'object' && data !== null && 'type' in data && data.type === 'NEW_CHAT_CREATED';
}

export function isTitleUpdated(data: unknown): data is {
	type: 'TITLE_UPDATED';
} {
	return typeof data === 'object' && data !== null && 'type' in data && data.type === 'TITLE_UPDATED';
}
