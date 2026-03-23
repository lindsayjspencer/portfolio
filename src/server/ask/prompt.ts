import type { ModelMessage } from 'ai';
import {
	directiveSupportsHighlights,
	getDirectiveVariant,
	type Directive,
} from '~/lib/ai/directiveTools';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { buildAskPromptContexts } from './prompt/context';
import { createAskContextPrompt, createAskSystemPrompt } from './prompt/system';

// Bump this when you make prompt-structure changes and want a clean cache namespace.
export const ASK_PROMPT_CACHE_KEY = 'portfolio-ask:v6';

function describeCurrentDirective(currentDirective: Directive): string {
	const parts = [`The current visual view is the ${currentDirective.mode} view`];
	const variant = getDirectiveVariant(currentDirective);

	if (variant) {
		parts.push(`using the "${variant}" variant`);
	}

	parts.push(`with the "${currentDirective.theme}" theme`);

	if (directiveSupportsHighlights(currentDirective) && currentDirective.data.highlights.length > 0) {
		parts.push(`and highlighted ids ${currentDirective.data.highlights.join(', ')}`);
	}

	if (currentDirective.mode === 'projects' && currentDirective.data.pinned?.length) {
		parts.push(`with pinned project ids ${currentDirective.data.pinned.join(', ')}`);
	}

	if (currentDirective.mode === 'compare') {
		parts.push(`comparing ${currentDirective.data.leftId} and ${currentDirective.data.rightId}`);
	}

	return `${parts.join(' ')}.`;
}

function buildCurrentDirectiveMessage(currentDirective: Directive | null): ModelMessage {
	const content = currentDirective
		? `${describeCurrentDirective(currentDirective)} Maintain the UI by choosing exactly one supporting view tool for this turn. If this current view is still the best support for your answer, re-emit the same view instead of asking permission or skipping the view tool.`
		: 'The current visual view is the default landing screen. Maintain the UI by choosing exactly one supporting view tool for this turn. Landing is not a callable view tool, so choose the closest supporting view for the answer.';

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
