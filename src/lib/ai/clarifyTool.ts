import { tool } from 'ai';
import { z } from 'zod';

const clarifySchema = z.object({
	slot: z.string().describe("Stable key for this question, e.g. 'skill_scope'"),
	kind: z.enum(['choice', 'free']),
	options: z.array(z.string()).optional().describe('For kind=choice'),
	multi: z.boolean().optional(),
	placeholder: z.string().optional(),
	exampleAnswer: z.string().optional(),
	timeoutSec: z.number().optional(),
});
export const clarifyTool = tool({
	description:
		'MANDATORY when the user request is ambiguous or could map to multiple views. Call this tool instead of asking the question only in plain text. User-facing question text must be streamed, not included here. The tool call is what creates the interactive clarify UI.',
	inputSchema: clarifySchema,
});

export type ClarifyPayload = z.infer<typeof clarifySchema>;
