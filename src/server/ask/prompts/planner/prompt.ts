import type { ModelMessage } from 'ai';
import { getDirectiveVariant, type Directive } from '~/lib/ai/directiveTools';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { buildAskPromptContexts } from '../shared/context';
import { CHARACTER_GUIDELINES_SECTION, PROMPT_IDENTITY_SECTION } from '../shared/sections';
import {
	buildPlannerContextSection,
	PLANNER_DECISION_RULES_SECTION,
	PLANNER_MISSION_SECTION,
	PLANNER_VIEW_TOOLS_SECTION,
} from './sections';

export const ASK_PLANNER_PROMPT_CACHE_KEY = 'portfolio-ask-planner:v1';

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

export function createAskPlannerSystemPrompt() {
	return [
		PROMPT_IDENTITY_SECTION,
		PLANNER_MISSION_SECTION,
		PLANNER_VIEW_TOOLS_SECTION,
		PLANNER_DECISION_RULES_SECTION,
		CHARACTER_GUIDELINES_SECTION,
	].join('\n\n');
}

const {
	lindsayProfileContext,
	plannerPortfolioContext,
	plannerCaseStudiesContext,
} = buildAskPromptContexts();

export const ASK_PLANNER_CONTEXT_PROMPT = buildPlannerContextSection({
	lindsayProfileContext,
	portfolioContext: plannerPortfolioContext,
	caseStudiesContext: plannerCaseStudiesContext,
});

export const ASK_PLANNER_SYSTEM_PROMPT = createAskPlannerSystemPrompt();

function buildPlannerStaticContextMessage(): ModelMessage {
	return {
		role: 'system',
		content: ASK_PLANNER_CONTEXT_PROMPT,
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
