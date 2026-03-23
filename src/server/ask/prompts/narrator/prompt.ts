import type { ModelMessage } from 'ai';
import type { Directive } from '~/lib/ai/directiveTools';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { buildNarrationViewContext } from '~/server/ask/viewContext';
import { buildAskPromptContexts } from '../shared/context';
import { CHARACTER_GUIDELINES_SECTION, PROMPT_IDENTITY_SECTION } from '../shared/sections';
import {
	buildNarrationContextSection,
	NARRATION_FORMATTING_RULES_SECTION,
	NARRATOR_MISSION_SECTION,
	NARRATOR_RESPONSE_RULES_SECTION,
	SPECIAL_RESPONSE_RULES_SECTION,
} from './sections';

export const ASK_NARRATION_PROMPT_CACHE_KEY = 'portfolio-ask-narrator:v1';

export function createAskNarrationSystemPrompt() {
	return [
		PROMPT_IDENTITY_SECTION,
		NARRATOR_MISSION_SECTION,
		NARRATOR_RESPONSE_RULES_SECTION,
		SPECIAL_RESPONSE_RULES_SECTION,
		NARRATION_FORMATTING_RULES_SECTION,
		CHARACTER_GUIDELINES_SECTION,
	].join('\n\n');
}

const {
	lindsayProfileContext,
	narrationPortfolioContext,
	narrationCaseStudiesContext,
} = buildAskPromptContexts();

export const ASK_NARRATION_CONTEXT_PROMPT = buildNarrationContextSection({
	lindsayProfileContext,
	portfolioContext: narrationPortfolioContext,
	caseStudiesContext: narrationCaseStudiesContext,
});

export const ASK_NARRATION_SYSTEM_PROMPT = createAskNarrationSystemPrompt();

function buildNarrationStaticContextMessage(): ModelMessage {
	return {
		role: 'system',
		content: ASK_NARRATION_CONTEXT_PROMPT,
	};
}

function buildNarrationViewContextMessage({
	directive,
	plannerReason,
}: {
	directive: Directive;
	plannerReason: string | null | undefined;
}): ModelMessage {
	const viewContext = buildNarrationViewContext(directive, plannerReason);

	return {
		role: 'system',
		content: [
			'The supporting UI view has already been updated. Do not mention or justify that update.',
			`Internal planner reason: ${viewContext.plannerReason}`,
			`Visible view summary: ${viewContext.viewSummary}`,
			`Detailed visible context:\n${viewContext.detailedViewContext}`,
			'Answer the user naturally as Lindsay. Refer to what is visible only in normal human terms when it helps. Never mention tool names, JSON, ids, themes, variants, highlights, or internal state.',
		].join('\n\n'),
	};
}

export function buildNarrationMessages({
	messages,
	directive,
	plannerReason,
}: {
	messages: AskRequestMessage[];
	directive: Directive;
	plannerReason: string | null | undefined;
}): ModelMessage[] {
	const staticContextMessage = buildNarrationStaticContextMessage();
	const viewContextMessage = buildNarrationViewContextMessage({ directive, plannerReason });
	const normalizedMessages = messages.map((message) => ({ ...message }));

	if (normalizedMessages.length === 0) {
		return [staticContextMessage, viewContextMessage];
	}

	const lastMessage = normalizedMessages[normalizedMessages.length - 1];
	if (lastMessage?.role === 'user') {
		return [staticContextMessage, ...normalizedMessages.slice(0, -1), viewContextMessage, lastMessage];
	}

	return [staticContextMessage, ...normalizedMessages, viewContextMessage];
}
