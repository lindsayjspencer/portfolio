import { z } from 'zod';
import { tool } from 'ai';
import { getThemeNames, type ThemeName } from '~/lib/themes';

export const DEFAULT_THEME: ThemeName = 'cold';

const variantDirectiveModes = ['timeline', 'projects', 'skills', 'values', 'compare'] as const;

type VariantDirectiveMode = (typeof variantDirectiveModes)[number];

const Base = {
	highlights: z.array(z.string()).max(12).default([]),
	confidence: z.number().min(0).max(1).default(0.7),
	hints: z
		.object({
			limit: z.number().int().positive().optional(),
			sortBy: z.enum(['recency', 'impact', 'alpha']).optional(),
		})
		.optional(),
};

export const timelineDirectiveSchema = z.object({
	...Base,
	variant: z.enum(['career', 'projects', 'skills']).default('career'),
});
export const timelineDirective = tool({
	description:
		'Show a timeline view (career, projects, or skills). User-facing narration must be streamed, not included here.',
	inputSchema: timelineDirectiveSchema,
});

export const projectsDirectiveSchema = z.object({
	...Base,
	variant: z.enum(['grid', 'radial', 'case-study']).default('grid'),
	pinned: z.array(z.string()).optional(),
	showMetrics: z.boolean().default(true),
});
export const projectsDirective = tool({
	description: 'Show projects view. User-facing narration must be streamed, not included here.',
	inputSchema: projectsDirectiveSchema,
});

export const skillsDirectiveSchema = z.object({
	...Base,
	variant: z.enum(['technical', 'soft', 'matrix']).default('technical'),
	focusLevel: z.enum(['expert', 'advanced', 'intermediate']).optional(),
	clusterBy: z.enum(['domain', 'recency', 'usage']).default('domain'),
});
export const skillsDirective = tool({
	description:
		'Show skills view (technical clusters, soft clusters, or matrix). User-facing narration must be streamed, not included here.',
	inputSchema: skillsDirectiveSchema,
});

export const valuesDirectiveSchema = z.object({
	...Base,
	variant: z.enum(['mindmap', 'evidence']).default('mindmap'),
	emphasizeStories: z.boolean().optional(),
});
export const valuesDirective = tool({
	description: 'Show values view. User-facing narration must be streamed, not included here.',
	inputSchema: valuesDirectiveSchema,
});

export const compareDirectiveSchema = z.object({
	...Base,
	variant: z.enum(['skills', 'projects', 'frontend-vs-backend']).default('skills'),
	leftId: z.string(),
	rightId: z.string(),
	showOverlap: z.boolean().default(true),
});
export const compareDirective = tool({
	description: 'Show compare view (skills/projects). User-facing narration must be streamed, not included here.',
	inputSchema: compareDirectiveSchema,
});

export const exploreDirectiveSchema = z.object({
	...Base,
	filterTags: z.array(z.string()).optional(),
});
export const exploreDirective = tool({
	description: 'Show explore view. Optionally filter by tags. User-facing narration must be streamed, not included here.',
	inputSchema: exploreDirectiveSchema,
});

export const landingDirectiveSchema = z.object({
	...Base,
});

export const resumeDirectiveSchema = z.object({
	...Base,
});
export const resumeDirective = tool({
	description: 'Open resume view. User-facing narration must be streamed, not included here.',
	inputSchema: resumeDirectiveSchema,
});

export type TimelineDirective = z.infer<typeof timelineDirectiveSchema>;
export type ProjectsDirective = z.infer<typeof projectsDirectiveSchema>;
export type SkillsDirective = z.infer<typeof skillsDirectiveSchema>;
export type ValuesDirective = z.infer<typeof valuesDirectiveSchema>;
export type CompareDirective = z.infer<typeof compareDirectiveSchema>;
export type ExploreDirective = z.infer<typeof exploreDirectiveSchema>;
export type LandingDirective = z.infer<typeof landingDirectiveSchema>;
export type ResumeDirective = z.infer<typeof resumeDirectiveSchema>;

export type TimelineViewDirective = { mode: 'timeline'; theme: ThemeName; data: TimelineDirective };
export type ProjectsViewDirective = { mode: 'projects'; theme: ThemeName; data: ProjectsDirective };
export type SkillsViewDirective = { mode: 'skills'; theme: ThemeName; data: SkillsDirective };
export type ValuesViewDirective = { mode: 'values'; theme: ThemeName; data: ValuesDirective };
export type CompareViewDirective = { mode: 'compare'; theme: ThemeName; data: CompareDirective };
export type ExploreViewDirective = { mode: 'explore'; theme: ThemeName; data: ExploreDirective };
export type LandingViewDirective = { mode: 'landing'; theme: ThemeName; data: LandingDirective };
export type ResumeViewDirective = { mode: 'resume'; theme: ThemeName; data: ResumeDirective };

export type VariantDirective =
	| TimelineViewDirective
	| ProjectsViewDirective
	| SkillsViewDirective
	| ValuesViewDirective
	| CompareViewDirective;

export type NonVariantDirective = ExploreViewDirective | LandingViewDirective | ResumeViewDirective;

export type Directive = VariantDirective | NonVariantDirective;
export type DirectiveMode = Directive['mode'];

export function createTimelineDirective(
	theme: ThemeName,
	data?: z.input<typeof timelineDirectiveSchema>,
): TimelineViewDirective {
	return {
		mode: 'timeline',
		theme,
		data: timelineDirectiveSchema.parse(data ?? {}),
	};
}

export function createProjectsDirective(
	theme: ThemeName,
	data?: z.input<typeof projectsDirectiveSchema>,
): ProjectsViewDirective {
	return {
		mode: 'projects',
		theme,
		data: projectsDirectiveSchema.parse(data ?? {}),
	};
}

export function createSkillsDirective(
	theme: ThemeName,
	data?: z.input<typeof skillsDirectiveSchema>,
): SkillsViewDirective {
	return {
		mode: 'skills',
		theme,
		data: skillsDirectiveSchema.parse(data ?? {}),
	};
}

export function createValuesDirective(
	theme: ThemeName,
	data?: z.input<typeof valuesDirectiveSchema>,
): ValuesViewDirective {
	return {
		mode: 'values',
		theme,
		data: valuesDirectiveSchema.parse(data ?? {}),
	};
}

export function createCompareDirective(
	theme: ThemeName,
	data: z.input<typeof compareDirectiveSchema>,
): CompareViewDirective {
	return {
		mode: 'compare',
		theme,
		data: compareDirectiveSchema.parse(data),
	};
}

export function createExploreDirective(
	theme: ThemeName,
	data?: z.input<typeof exploreDirectiveSchema>,
): ExploreViewDirective {
	return {
		mode: 'explore',
		theme,
		data: exploreDirectiveSchema.parse(data ?? {}),
	};
}

function createLandingDirective(
	theme: ThemeName,
	data?: z.input<typeof landingDirectiveSchema>,
): LandingViewDirective {
	return {
		mode: 'landing',
		theme,
		data: landingDirectiveSchema.parse(data ?? {}),
	};
}

export function createDefaultLandingDirective(theme: ThemeName = DEFAULT_THEME): LandingViewDirective {
	return createLandingDirective(theme);
}

export function createResumeDirective(
	theme: ThemeName,
	data?: z.input<typeof resumeDirectiveSchema>,
): ResumeViewDirective {
	return {
		mode: 'resume',
		theme,
		data: resumeDirectiveSchema.parse(data ?? {}),
	};
}

function isVariantDirective(directive: Directive): directive is VariantDirective {
	return directiveModeHasVariant(directive.mode);
}

function directiveModeHasVariant(mode: DirectiveMode): mode is VariantDirectiveMode {
	return (variantDirectiveModes as readonly string[]).includes(mode);
}

export function getDirectiveVariant(directive: Directive): string | null {
	if (!isVariantDirective(directive)) {
		return null;
	}

	return directive.data.variant;
}

export function getDirectiveViewKey(directive: Directive): string {
	const variant = getDirectiveVariant(directive);
	return variant ? `${directive.mode}:${variant}` : directive.mode;
}

export function withDirectiveTheme(directive: Directive, theme: ThemeName): Directive {
	if (directive.theme === theme) {
		return directive;
	}

	return {
		...directive,
		theme,
	};
}

export const changeThemeTool = tool({
	description: 'Change the current directive theme without changing the current view.',
	inputSchema: z.object({ theme: z.enum(getThemeNames() as [ThemeName, ...ThemeName[]]) }),
});
