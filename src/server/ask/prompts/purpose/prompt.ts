import type { ModelMessage } from 'ai';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import type { Directive } from '~/lib/ai/directiveTools';
import { buildCurrentViewSummary } from '~/server/ask/viewContext';
import { buildAskPromptContexts } from '../shared/context';
import { CHARACTER_GUIDELINES_SECTION, PROMPT_IDENTITY_SECTION } from '../shared/sections';
import {
	PURPOSE_DECISION_RULES_SECTION,
	PURPOSE_MISSION_SECTION,
	PURPOSE_SCOPE_SECTION,
	PURPOSE_VIEW_CATALOG_SECTION,
} from './sections';

export const ASK_PURPOSE_PROMPT_CACHE_KEY = 'portfolio-ask-purpose:v1';

function buildPurposeCurrentViewMessage(currentDirective: Directive | null): ModelMessage {
	return {
		role: 'system',
		content: `Current visible view summary: ${buildCurrentViewSummary(currentDirective)}`,
	};
}

export function createAskPurposeSystemPrompt() {
	return [
		PROMPT_IDENTITY_SECTION,
		PURPOSE_MISSION_SECTION,
		PURPOSE_SCOPE_SECTION,
		PURPOSE_VIEW_CATALOG_SECTION,
		PURPOSE_DECISION_RULES_SECTION,
		CHARACTER_GUIDELINES_SECTION,
	].join('\n\n');
}

const {
	lindsayProfileContext,
	purposePortfolioContext,
	purposeCaseStudiesContext,
	publicResourcesContext,
} = buildAskPromptContexts();

export const ASK_PURPOSE_CONTEXT_PROMPT = `## Lindsay Profile Snapshot
Use this for tone and lightweight grounding.

${lindsayProfileContext}

## Public Resources
These are explicit public links/resources the user may ask about directly.

${publicResourcesContext}

## Portfolio Snapshot
Use this compact summary to judge whether a question could reasonably relate to Lindsay, his work, or this portfolio.

${purposePortfolioContext}

## Case Study Snapshot
These are deeper project anchors you can use when deciding whether a follow-up is still in purpose.

${purposeCaseStudiesContext}`;

export const ASK_PURPOSE_SYSTEM_PROMPT = createAskPurposeSystemPrompt();

function buildPurposeStaticContextMessage(): ModelMessage {
	return {
		role: 'system',
		content: ASK_PURPOSE_CONTEXT_PROMPT,
	};
}

export function buildPurposeMessages({
	messages,
	currentDirective,
}: {
	messages: AskRequestMessage[];
	currentDirective: Directive | null;
}): ModelMessage[] {
	const staticContextMessage = buildPurposeStaticContextMessage();
	const currentViewMessage = buildPurposeCurrentViewMessage(currentDirective);
	const normalizedMessages = messages.map((message) => ({ ...message }));

	if (normalizedMessages.length === 0) {
		return [staticContextMessage, currentViewMessage];
	}

	const lastMessage = normalizedMessages[normalizedMessages.length - 1];
	if (lastMessage?.role === 'user') {
		return [staticContextMessage, ...normalizedMessages.slice(0, -1), currentViewMessage, lastMessage];
	}

	return [staticContextMessage, ...normalizedMessages, currentViewMessage];
}
