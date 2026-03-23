import { z } from 'zod';

export const askGuardDecisionSchema = z.object({
	decision: z.enum(['allow', 'reject', 'ask_to_shorten', 'ask_to_rephrase']),
	category: z.enum([
		'safe',
		'too_long',
		'out_of_scope',
		'prompt_injection',
		'internal_manipulation',
		'internal_exfiltration',
		'malicious_or_abusive',
		'other',
	]),
	reason: z.string().min(1).max(200),
});

export type AskGuardDecision = z.infer<typeof askGuardDecisionSchema>;

export type AskGuardSource = 'policy' | 'model' | 'fallback';

export type AskGuardOutcome = AskGuardDecision & {
	source: AskGuardSource;
};
