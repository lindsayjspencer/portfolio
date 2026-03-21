import type { ModelMessage } from 'ai';
import type { Directive } from '~/lib/ai/directiveTools';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { buildAskPromptContexts } from './prompt/context';
import { createAskContextPrompt, createAskSystemPrompt } from './prompt/system';

// Bump this when you make prompt-structure changes and want a clean cache namespace.
export const ASK_PROMPT_CACHE_KEY = 'portfolio-ask:v2';

function buildCurrentDirectiveMessage(currentDirective: Directive | null): ModelMessage {
	const content = currentDirective
		? `The current visual directive is ${JSON.stringify(currentDirective)}. Use it as the current UI state when deciding whether to change the view.`
		: 'The current visual directive is the default landing state. Use that as the current UI state.';

	return { role: 'system', content };
}

function buildStaticContextMessage(): ModelMessage {
	return {
		role: 'system',
		content: ASK_CONTEXT_PROMPT,
	};
}

export function buildAskMessages(
	messages: AskRequestMessage[],
	currentDirective: Directive | null,
): ModelMessage[] {
	const staticContextMessage = buildStaticContextMessage();
	const directiveMessage = buildCurrentDirectiveMessage(currentDirective);
	const normalizedMessages = messages.map((message) => ({ ...message }));

	if (normalizedMessages.length === 0) {
		return [staticContextMessage, directiveMessage];
	}

	const lastMessage = normalizedMessages[normalizedMessages.length - 1];
	if (lastMessage?.role === 'user') {
		return [staticContextMessage, ...normalizedMessages.slice(0, -1), directiveMessage, lastMessage];
	}

	return [staticContextMessage, ...normalizedMessages, directiveMessage];
}

const { lindsayProfileContext, portfolioContext, caseStudiesContext } = buildAskPromptContexts();

export const ASK_CONTEXT_PROMPT = createAskContextPrompt({
	lindsayProfileContext,
	portfolioContext,
	caseStudiesContext,
});

export const ASK_SYSTEM_PROMPT = createAskSystemPrompt();
