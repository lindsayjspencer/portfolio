import type { LanguageModel } from 'ai';
import { clarifyTool } from '~/lib/ai/clarifyTool';
import {
	compareDirective,
	createExploreDirective,
	DEFAULT_THEME,
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
	timelineDirective,
	projectsDirective,
	skillsDirective,
	valuesDirective,
	compareDirective,
	exploreDirective,
	resumeDirective,
	clarify: clarifyTool,
} as const;

export const directiveToolNames = [
	'timelineDirective',
	'projectsDirective',
	'skillsDirective',
	'valuesDirective',
	'compareDirective',
	'exploreDirective',
	'resumeDirective',
] as const;

export type DirectiveToolName = (typeof directiveToolNames)[number];
export type AskRuntimeToolCall = {
	toolName: string;
	input?: unknown;
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

	const { theme: _ignoredTheme, ...data } = input;
	return data;
}

export function toDirectiveFromToolCall(
	toolName: DirectiveToolName,
	input: unknown,
	fallbackTheme: Directive['theme'],
): Directive | null {
	const candidate = {
		mode: toolName.replace('Directive', ''),
		theme: extractDirectiveTheme(input, fallbackTheme),
		data: stripDirectiveToolTheme(input),
	};
	const validated = validateUrlDirective(candidate);
	return validated ? (validated as Directive) : null;
}

export function getClarifyFallbackToolCall({
	toolCalls,
	currentDirective,
}: {
	toolCalls: AskRuntimeToolCall[];
	currentDirective: Directive | null;
}): AskRuntimeToolCall | null {
	const hasDirective = toolCalls.some((call) => isDirectiveToolName(call.toolName));
	const hasClarify = toolCalls.some((call) => call.toolName === 'clarify');

	if (hasDirective || !hasClarify) {
		return null;
	}

	return {
		toolName: 'exploreDirective',
		input: createExploreDirective(currentDirective?.theme ?? DEFAULT_THEME).data,
	};
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
