import type { LanguageModel } from 'ai';
import {
	createExploreDirective,
	compareDirective,
	exploreDirective,
	projectsDirective,
	resumeDirective,
	skillsDirective,
	timelineDirective,
	type Directive,
	valuesDirective,
	DEFAULT_THEME,
} from '~/lib/ai/directiveTools';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { getThemeNames, type ThemeName } from '~/lib/themes';
import { validateUrlDirective } from '~/utils/urlState';
import {
	ASK_NARRATION_PROMPT_CACHE_KEY,
	ASK_NARRATION_SYSTEM_PROMPT,
	ASK_PLANNER_PROMPT_CACHE_KEY,
	ASK_PLANNER_SYSTEM_PROMPT,
	buildNarrationMessages,
	buildPlannerMessages,
} from './prompt';

export const plannerTools = {
	showTimelineView: timelineDirective,
	showProjectsView: projectsDirective,
	showSkillsView: skillsDirective,
	showValuesView: valuesDirective,
	showCompareView: compareDirective,
	showExploreView: exploreDirective,
	showResumeView: resumeDirective,
} as const;

export const directiveToolNames = [
	'showTimelineView',
	'showProjectsView',
	'showSkillsView',
	'showValuesView',
	'showCompareView',
	'showExploreView',
	'showResumeView',
	// Legacy aliases kept temporarily so eval code can migrate in a later pass.
	'timelineDirective',
	'projectsDirective',
	'skillsDirective',
	'valuesDirective',
	'compareDirective',
	'exploreDirective',
	'resumeDirective',
] as const;

export type DirectiveToolName = (typeof directiveToolNames)[number];

const directiveToolModeByName: Record<DirectiveToolName, Directive['mode']> = {
	showTimelineView: 'timeline',
	showProjectsView: 'projects',
	showSkillsView: 'skills',
	showValuesView: 'values',
	showCompareView: 'compare',
	showExploreView: 'explore',
	showResumeView: 'resume',
	timelineDirective: 'timeline',
	projectsDirective: 'projects',
	skillsDirective: 'skills',
	valuesDirective: 'values',
	compareDirective: 'compare',
	exploreDirective: 'explore',
	resumeDirective: 'resume',
};

export function isDirectiveToolName(toolName: string): toolName is DirectiveToolName {
	return directiveToolNames.includes(toolName as DirectiveToolName);
}

const knownThemes = new Set<ThemeName>(getThemeNames());

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function extractDirectiveTheme(input: unknown, fallbackTheme: Directive['theme']): Directive['theme'] {
	if (!isRecord(input) || typeof input.theme !== 'string' || !knownThemes.has(input.theme as ThemeName)) {
		return fallbackTheme;
	}

	return input.theme as ThemeName;
}

function stripPlannerOnlyFields(input: unknown): unknown {
	if (!isRecord(input)) {
		return input;
	}

	const data = { ...input };
	delete data.theme;
	delete data.reason;
	return data;
}

export function extractDirectiveReason(input: unknown): string | null {
	if (!isRecord(input) || typeof input.reason !== 'string') {
		return null;
	}

	const reason = input.reason.trim();
	return reason.length > 0 ? reason : null;
}

export function toDirectiveFromToolCall(
	toolName: DirectiveToolName,
	input: unknown,
	fallbackTheme: Directive['theme'],
): Directive | null {
	const candidate = {
		mode: directiveToolModeByName[toolName],
		theme: extractDirectiveTheme(input, fallbackTheme),
		data: stripPlannerOnlyFields(input),
	};
	const validated = validateUrlDirective(candidate);
	return validated ? (validated as Directive) : null;
}

export function buildPlannerFallbackDirective(currentDirective: Directive | null): Directive {
	if (currentDirective && currentDirective.mode !== 'landing') {
		return currentDirective;
	}

	return createExploreDirective(currentDirective?.theme ?? DEFAULT_THEME);
}

export function buildPlannerCallOptions({
	model,
	messages,
	currentDirective,
}: {
	model: LanguageModel;
	messages: AskRequestMessage[];
	currentDirective: Directive | null;
}) {
	return {
		model,
		system: ASK_PLANNER_SYSTEM_PROMPT,
		messages: buildPlannerMessages(messages, currentDirective),
		tools: plannerTools,
		toolChoice: 'required' as const,
		providerOptions: {
			openai: {
				promptCacheKey: ASK_PLANNER_PROMPT_CACHE_KEY,
				promptCacheRetention: 'in_memory' as const,
			},
		},
	};
}

export function buildNarrationCallOptions({
	model,
	messages,
	directive,
	plannerReason,
}: {
	model: LanguageModel;
	messages: AskRequestMessage[];
	directive: Directive;
	plannerReason: string | null | undefined;
}) {
	return {
		model,
		system: ASK_NARRATION_SYSTEM_PROMPT,
		messages: buildNarrationMessages({
			messages,
			directive,
			plannerReason,
		}),
		providerOptions: {
			openai: {
				promptCacheKey: ASK_NARRATION_PROMPT_CACHE_KEY,
				promptCacheRetention: 'in_memory' as const,
			},
		},
	};
}
