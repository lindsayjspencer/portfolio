import type { LanguageModel } from 'ai';
import { suggestAnswersTool } from '~/lib/ai/suggestAnswersTool';
import {
	compareDirective,
	exploreDirective,
	projectsDirective,
	resumeDirective,
	skillsDirective,
	timelineDirective,
	type Directive,
	valuesDirective,
} from '~/lib/ai/directiveTools';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import { getThemeNames, type ThemeName } from '~/lib/themes';
import { validateUrlDirective } from '~/utils/urlState';
import { ASK_PROMPT_CACHE_KEY, ASK_SYSTEM_PROMPT, buildAskMessages } from './prompt';

export const askTools = {
	showTimelineView: timelineDirective,
	showProjectsView: projectsDirective,
	showSkillsView: skillsDirective,
	showValuesView: valuesDirective,
	showCompareView: compareDirective,
	showExploreView: exploreDirective,
	showResumeView: resumeDirective,
	suggestAnswers: suggestAnswersTool,
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

function stripDirectiveToolTheme(input: unknown): unknown {
	if (!isRecord(input)) {
		return input;
	}

	const data = { ...input };
	delete data.theme;
	return data;
}

export function toDirectiveFromToolCall(
	toolName: DirectiveToolName,
	input: unknown,
	fallbackTheme: Directive['theme'],
): Directive | null {
	const candidate = {
		mode: directiveToolModeByName[toolName],
		theme: extractDirectiveTheme(input, fallbackTheme),
		data: stripDirectiveToolTheme(input),
	};
	const validated = validateUrlDirective(candidate);
	return validated ? (validated as Directive) : null;
}

export function buildAskCallOptions({
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
		system: ASK_SYSTEM_PROMPT,
		messages: buildAskMessages(messages, currentDirective),
		tools: askTools,
		toolChoice: 'auto' as const,
		providerOptions: {
			openai: {
				promptCacheKey: ASK_PROMPT_CACHE_KEY,
				promptCacheRetention: 'in_memory' as const,
			},
		},
	};
}
