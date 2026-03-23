import type { ModelMessage } from 'ai';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { SECURITY_DECISION_RULES_SECTION, SECURITY_EXAMPLES_SECTION, SECURITY_MISSION_SECTION } from './sections';

export const ASK_SECURITY_PROMPT_CACHE_KEY = 'portfolio-ask-security:v1';

export function createAskSecuritySystemPrompt() {
	return [SECURITY_MISSION_SECTION, SECURITY_DECISION_RULES_SECTION, SECURITY_EXAMPLES_SECTION].join('\n\n');
}

export const ASK_SECURITY_SYSTEM_PROMPT = createAskSecuritySystemPrompt();

export function buildSecurityMessages(messages: AskRequestMessage[]): ModelMessage[] {
	if (messages.length === 0) {
		return [
			{
				role: 'user',
				content: 'No user message was provided.',
			},
		];
	}

	return messages.map((message) => ({ ...message }));
}
