import { z } from 'zod';
import { tool } from 'ai';
import { getThemeNames, type ThemeName } from '~/lib/themes';

const Theme = z.enum(getThemeNames() as [ThemeName, ...ThemeName[]]);

const Base = {
	narration: z.string().min(1),
	highlights: z.array(z.string()).max(12).default([]),
	theme: Theme.optional(),
	confidence: z.number().min(0).max(1).default(0.7),
	hints: z
		.object({
			limit: z.number().int().positive().optional(),
			sortBy: z.enum(['recency', 'impact', 'alpha']).optional(),
		})
		.optional(),
};

const timelineDirectiveSchema = z.object({
	...Base,
	variant: z.enum(['career', 'projects', 'skills']).default('career'),
});
export const timelineDirective = tool({
	description: 'Show a timeline view (career, projects, or skills).',
	inputSchema: timelineDirectiveSchema,
});

const projectsDirectiveSchema = z.object({
	...Base,
	variant: z.enum(['grid', 'radial', 'case-study']).default('grid'),
	pinned: z.array(z.string()).optional(),
	showMetrics: z.boolean().default(true),
});
export const projectsDirective = tool({
	description: 'Show projects view.',
	inputSchema: projectsDirectiveSchema,
});

const skillsDirectiveSchema = z.object({
	...Base,
	variant: z.enum(['clusters', 'matrix']).default('clusters'),
	focusLevel: z.enum(['expert', 'advanced', 'intermediate']).optional(),
	clusterBy: z.enum(['domain', 'recency', 'usage']).default('domain'),
});
export const skillsDirective = tool({
	description: 'Show skills view.',
	inputSchema: skillsDirectiveSchema,
});

const valuesDirectiveSchema = z.object({
	...Base,
	variant: z.enum(['mindmap', 'evidence']).default('mindmap'),
	emphasizeStories: z.boolean().optional(),
});
export const valuesDirective = tool({
	description: 'Show values view.',
	inputSchema: valuesDirectiveSchema,
});

const compareDirectiveSchema = z.object({
	...Base,
	variant: z.enum(['skills', 'projects', 'frontend-vs-backend']).default('skills'),
	leftId: z.string(),
	rightId: z.string(),
	showOverlap: z.boolean().default(true),
});
export const compareDirective = tool({
	description: 'Show compare view (skills/projects).',
	inputSchema: compareDirectiveSchema,
});

const exploreDirectiveSchema = z.object({
	...Base,
	variant: z.enum(['all', 'filtered']).default('all'),
	filterTags: z.array(z.string()).optional(),
});
export const exploreDirective = tool({
	description: 'Show explore view (all or filtered).',
	inputSchema: exploreDirectiveSchema,
});

const landingDirectiveSchema = z.object({
	...Base,
});

const resumeDirectiveSchema = z.object({
	...Base,
});
export const resumeDirective = tool({
	description: 'Open résumé view.',
	inputSchema: resumeDirectiveSchema,
});

// Type definitions for each directive
export type TimelineDirective = z.infer<typeof timelineDirectiveSchema>;
export type ProjectsDirective = z.infer<typeof projectsDirectiveSchema>;
export type SkillsDirective = z.infer<typeof skillsDirectiveSchema>;
export type ValuesDirective = z.infer<typeof valuesDirectiveSchema>;
export type CompareDirective = z.infer<typeof compareDirectiveSchema>;
export type ExploreDirective = z.infer<typeof exploreDirectiveSchema>;
export type LandingDirective = z.infer<typeof landingDirectiveSchema>;
export type ResumeDirective = z.infer<typeof resumeDirectiveSchema>;

// Union type for all directive responses
export type Directive =
	| { mode: 'timeline'; data: TimelineDirective }
	| { mode: 'projects'; data: ProjectsDirective }
	| { mode: 'skills'; data: SkillsDirective }
	| { mode: 'values'; data: ValuesDirective }
	| { mode: 'compare'; data: CompareDirective }
	| { mode: 'explore'; data: ExploreDirective }
	| { mode: 'landing'; data: LandingDirective }
	| { mode: 'resume'; data: ResumeDirective };
