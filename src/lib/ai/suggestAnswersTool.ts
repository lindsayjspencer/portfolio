import { z } from 'zod';

export const suggestAnswersSchema = z.object({
	answers: z.array(z.string()).min(1).describe('Suggested user replies to show as clickable chips'),
});

export type SuggestedAnswersPayload = z.infer<typeof suggestAnswersSchema>;
