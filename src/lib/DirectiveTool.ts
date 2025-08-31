import { tool } from 'ai';
import { z } from 'zod';
import { type ThemeName, getThemeNames } from '~/lib/themes';

const schema = z.object({
	mode: z.enum(['timeline', 'career-timeline', 'skills-timeline', 'projects', 'skills', 'values', 'compare', 'play', 'resume']).describe('Graph display mode'),
	highlights: z.array(z.string()).describe('Node IDs to highlight'),
	narration: z.string().describe('Response text to show in chat'),
	theme: z
		.enum(getThemeNames() as [ThemeName, ...ThemeName[]])
		.optional()
		.describe('Optional theme to switch to based on conversation context'),
	themeReason: z.string().optional().describe('Brief reason for theme suggestion'),
});

export const enhancedDirectiveTool = tool({
	description: 'Generate a portfolio directive with optional theme suggestion',
	inputSchema: schema,
});

// LLM-facing type (what the tool can generate)
export type LLMDirectiveType = z.infer<typeof schema>;

// Extended type for internal use (includes 'landing' mode)
export type DirectiveType = Omit<LLMDirectiveType, 'mode'> & {
	mode: LLMDirectiveType['mode'] | 'landing';
};
