import { z } from 'zod';
import { tool } from 'ai';
import { getThemeNames, type ThemeName } from '~/lib/themes';

export const DEFAULT_THEME: ThemeName = 'cold';
const Theme = z.enum(getThemeNames() as [ThemeName, ...ThemeName[]]);

const variantDirectiveModes = ['timeline', 'projects', 'skills', 'values', 'compare'] as const;

type VariantDirectiveMode = (typeof variantDirectiveModes)[number];

const HighlightsOption = {
	highlights: z.array(z.string()).max(12).default([]),
};
const ToolTheme = {
	theme: Theme.optional(),
};
const ToolReason = {
	reason: z.string().min(1).max(200),
};

export const timelineDirectiveSchema = z.object({
	...HighlightsOption,
	variant: z.enum(['career', 'projects', 'skills']).default('career'),
});
export const timelineDirectiveToolInputSchema = timelineDirectiveSchema.extend(ToolTheme).extend(ToolReason);
export const timelineDirective = tool({
	description:
		'Display a time-based view. Use variant "career" for roles/jobs over time, "projects" for projects over time, or "skills" for when skills first appeared in Lindsay\'s journey. "highlights" can emphasize specific role, project, or skill ids on the timeline. Optional "theme" sets the visual tone. Always include a short plain-English "reason" explaining why this view best supports the user\'s question. User-facing narration belongs to a separate step and must not be included here.',
	inputSchema: timelineDirectiveToolInputSchema,
});

export const projectsDirectiveSchema = z.object({
	...HighlightsOption,
	variant: z.enum(['grid', 'radial', 'case-study']).default('grid'),
	pinned: z.array(z.string()).optional(),
});
export const projectsDirectiveToolInputSchema = projectsDirectiveSchema.extend(ToolTheme).extend(ToolReason);
export const projectsDirective = tool({
	description:
		'Display a project-focused view. Use variant "grid" for a scannable multi-project overview, "radial" for a graph of Lindsay -> projects -> skills, or "case-study" for a single-project deep dive. "highlights" can focus important projects and related skills. "pinned" can pin key projects in overview layouts and help indicate the preferred case-study focus when no highlight is given. Optional "theme" sets the visual tone. Always include a short plain-English "reason" explaining why this view best supports the user\'s question. User-facing narration belongs to a separate step and must not be included here.',
	inputSchema: projectsDirectiveToolInputSchema,
});

export const skillsDirectiveSchema = z.object({
	...HighlightsOption,
	variant: z.enum(['technical', 'soft', 'matrix']).default('technical'),
});
export const skillsDirectiveToolInputSchema = skillsDirectiveSchema.extend(ToolTheme).extend(ToolReason);
export const skillsDirective = tool({
	description:
		'Display a capability view. Use variant "technical" or "soft" for clustered skill maps that show related skills together, or "matrix" for a skills x projects view that shows where specific skills were used. "highlights" can focus skill ids, and in "matrix" they can also focus project ids. Optional "theme" sets the visual tone. Always include a short plain-English "reason" explaining why this view best supports the user\'s question. User-facing narration belongs to a separate step and must not be included here.',
	inputSchema: skillsDirectiveToolInputSchema,
});

export const valuesDirectiveSchema = z.object({
	...HighlightsOption,
	variant: z.enum(['mindmap', 'evidence']).default('mindmap'),
});
export const valuesDirectiveToolInputSchema = valuesDirectiveSchema.extend(ToolTheme).extend(ToolReason);
export const valuesDirective = tool({
	description:
		'Display a principles view. Use variant "mindmap" for Lindsay -> values -> supporting tags/evidence, or "evidence" for concrete examples drawn from roles, projects, and stories. "highlights" can focus values and supporting evidence ids. Optional "theme" sets the visual tone. Always include a short plain-English "reason" explaining why this view best supports the user\'s question. User-facing narration belongs to a separate step and must not be included here.',
	inputSchema: valuesDirectiveToolInputSchema,
});

export const compareDirectiveSchema = z.object({
	...HighlightsOption,
	variant: z.enum(['skills', 'projects', 'frontend-vs-backend']).default('skills'),
	leftId: z.string(),
	rightId: z.string(),
});
export const compareDirectiveToolInputSchema = compareDirectiveSchema.extend(ToolTheme).extend(ToolReason);
export const compareDirective = tool({
	description:
		'Display a direct comparison view. Use variant "skills" to compare two skills, "projects" to compare two projects, or "frontend-vs-backend" for a broader frontend/backend contrast. For concrete comparisons, "leftId" and "rightId" must be valid ids from the portfolio context. "highlights" can emphasize the most relevant comparison nodes. Optional "theme" sets the visual tone. Always include a short plain-English "reason" explaining why this view best supports the user\'s question. User-facing narration belongs to a separate step and must not be included here.',
	inputSchema: compareDirectiveToolInputSchema,
});

export const exploreDirectiveSchema = z.object({
	...HighlightsOption,
});
export const exploreDirectiveToolInputSchema = exploreDirectiveSchema.extend(ToolTheme).extend(ToolReason);
export const exploreDirective = tool({
	description:
		'Display the broad exploratory graph view. Use "highlights" to emphasize specific nodes while keeping the wider graph visible. This is useful when wide context helps or when a neutral supporting view is needed during clarification. Optional "theme" sets the visual tone. Always include a short plain-English "reason" explaining why this view best supports the user\'s question. User-facing narration belongs to a separate step and must not be included here.',
	inputSchema: exploreDirectiveToolInputSchema,
});

export const landingDirectiveSchema = z.object({});

export const resumeDirectiveSchema = z.object({});
export const resumeDirectiveToolInputSchema = resumeDirectiveSchema.extend(ToolTheme).extend(ToolReason);
export const resumeDirective = tool({
	description:
		'Display the resume/CV view. Optional "theme" sets the visual tone. Always include a short plain-English "reason" explaining why this view best supports the user\'s question. User-facing narration belongs to a separate step and must not be included here.',
	inputSchema: resumeDirectiveToolInputSchema,
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
export type HighlightCapableDirective =
	| TimelineViewDirective
	| ProjectsViewDirective
	| SkillsViewDirective
	| ValuesViewDirective
	| CompareViewDirective
	| ExploreViewDirective;

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

export function directiveSupportsHighlights(directive: Directive): directive is HighlightCapableDirective {
	return directive.mode !== 'landing' && directive.mode !== 'resume';
}

export function getDirectiveHighlights(directive: Directive): string[] {
	return directiveSupportsHighlights(directive) ? directive.data.highlights : [];
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
