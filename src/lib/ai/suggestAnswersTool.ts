import { tool } from 'ai';
import { z } from 'zod';

const suggestAnswersSchema = z.object({
	answers: z.array(z.string()).min(1).describe('Suggested user replies to show as clickable chips'),
});

export const suggestAnswersTool = tool({
	description:
		'Optional UI affordance for offering a few suggested user replies. The user-facing question must still be streamed as normal text. Clicking a suggested answer submits that exact answer, but the user may also type their own reply.',
	inputSchema: suggestAnswersSchema,
});

export type SuggestedAnswersPayload = z.infer<typeof suggestAnswersSchema>;
