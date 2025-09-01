import { tool } from 'ai';
import { z } from 'zod';

const clarifySchema = z.object({
	slot: z.string().describe("Stable key for this question, e.g. 'skill_scope'"),
	question: z.string(),
	kind: z.enum(['choice', 'free']),
	options: z.array(z.string()).optional().describe('For kind=choice'),
	multi: z.boolean().optional(),
	placeholder: z.string().optional(),
	exampleAnswer: z.string().optional(),
	timeoutSec: z.number().optional(),
});
export const clarifyTool = tool({
	description: 'Ask the user a clarifying question and wait for their answer.',
	inputSchema: clarifySchema,
});

export type ClarifyPayload = z.infer<typeof clarifySchema>;
