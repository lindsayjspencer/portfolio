import type { ModelMessage } from 'ai';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { GUARD_APP_SCOPE_SECTION, GUARD_DECISION_RULES_SECTION, GUARD_MISSION_SECTION } from './sections';

const MAX_GUARD_MESSAGES = 6;

export const ASK_GUARD_PROMPT_CACHE_KEY = 'portfolio-ask-guard:v1';

export function createAskGuardSystemPrompt() {
	return [GUARD_MISSION_SECTION, GUARD_APP_SCOPE_SECTION, GUARD_DECISION_RULES_SECTION].join('\n\n');
}

export const ASK_GUARD_SYSTEM_PROMPT = createAskGuardSystemPrompt();

export function buildGuardMessages(messages: AskRequestMessage[]): ModelMessage[] {
	const recentMessages = messages.slice(-MAX_GUARD_MESSAGES).map((message) => ({ ...message }));

	if (recentMessages.length === 0) {
		return [
			{
				role: 'user',
				content: 'No user message was provided.',
			},
		];
	}

	return recentMessages;
}
