import { z } from 'zod';

export const askSecurityDecisionSchema = z.object({
	decision: z.enum(['allow', 'reject']),
	category: z.enum([
		'safe',
		'prompt_injection',
		'internal_manipulation',
		'internal_exfiltration',
		'malicious_or_abusive',
		'other',
	]),
	reason: z.string().min(1).max(200),
});

export type AskSecurityDecision = z.infer<typeof askSecurityDecisionSchema>;

export type AskSecuritySource = 'model' | 'fallback';

export type AskSecurityOutcome = AskSecurityDecision & {
	source: AskSecuritySource;
};
