import type { ModelMessage } from 'ai';
import { getDirectiveVariant, type Directive } from '~/lib/ai/directiveTools';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { buildNarrationViewContext } from './viewContext';
import { buildAskPromptContexts } from './prompt/context';
import {
	createAskNarrationContextPrompt,
	createAskNarrationSystemPrompt,
	createAskPlannerContextPrompt,
	createAskPlannerSystemPrompt,
} from './prompt/system';

export const ASK_PLANNER_PROMPT_CACHE_KEY = 'portfolio-ask-planner:v1';
export const ASK_NARRATION_PROMPT_CACHE_KEY = 'portfolio-ask-narrator:v1';

function describePlannerCurrentDirective(currentDirective: Directive): string {
	const variant = getDirectiveVariant(currentDirective);
	const parts = [
		`Planning-only current view state: mode "${currentDirective.mode}"`,
		variant ? `variant "${variant}"` : null,
		`theme "${currentDirective.theme}"`,
	];

	if ('highlights' in currentDirective.data && currentDirective.data.highlights.length > 0) {
		parts.push(`highlight ids: ${currentDirective.data.highlights.join(', ')}`);
	}

	if (currentDirective.mode === 'projects' && currentDirective.data.pinned?.length) {
		parts.push(`pinned project ids: ${currentDirective.data.pinned.join(', ')}`);
	}

	if (currentDirective.mode === 'compare') {
		parts.push(`compare ids: ${currentDirective.data.leftId} vs ${currentDirective.data.rightId}`);
	}

	return `${parts.filter(Boolean).join('; ')}. Re-emit this same view if it is still the best support for the latest user message.`;
}

function buildPlannerCurrentDirectiveMessage(currentDirective: Directive | null): ModelMessage {
	return {
		role: 'system',
		content: currentDirective
			? describePlannerCurrentDirective(currentDirective)
			: 'Planning-only current view state: landing screen. Landing is not a callable tool, so choose the closest callable supporting view for the latest user message.',
	};
}

function buildPlannerStaticContextMessage(): ModelMessage {
	return {
		role: 'system',
		content: ASK_PLANNER_CONTEXT_PROMPT,
	};
}

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

export function buildPlannerMessages(
	messages: AskRequestMessage[],
	currentDirective: Directive | null,
): ModelMessage[] {
	const staticContextMessage = buildPlannerStaticContextMessage();
	const directiveMessage = buildPlannerCurrentDirectiveMessage(currentDirective);
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

const {
	lindsayProfileContext,
	plannerPortfolioContext,
	narrationPortfolioContext,
	plannerCaseStudiesContext,
	narrationCaseStudiesContext,
} = buildAskPromptContexts();

export const ASK_PLANNER_CONTEXT_PROMPT = createAskPlannerContextPrompt({
	lindsayProfileContext,
	portfolioContext: plannerPortfolioContext,
	caseStudiesContext: plannerCaseStudiesContext,
});

export const ASK_NARRATION_CONTEXT_PROMPT = createAskNarrationContextPrompt({
	lindsayProfileContext,
	portfolioContext: narrationPortfolioContext,
	caseStudiesContext: narrationCaseStudiesContext,
});

export const ASK_PLANNER_SYSTEM_PROMPT = createAskPlannerSystemPrompt();
export const ASK_NARRATION_SYSTEM_PROMPT = createAskNarrationSystemPrompt();
