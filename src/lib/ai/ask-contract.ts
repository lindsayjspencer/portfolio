import { z } from 'zod';
import type { Directive } from './directiveTools';
import { validateUrlDirective } from '~/utils/urlState';

const ASK_MAX_MESSAGES = 40;
const ASK_MESSAGE_MAX_LENGTH = 8_000;

export const askRequestMessageSchema = z
	.object({
		role: z.enum(['user', 'assistant']),
		content: z.string().min(1).max(ASK_MESSAGE_MAX_LENGTH),
	})
	.strict();

const askCurrentDirectiveSchema = z
	.unknown()
	.nullish()
	.transform((value, ctx): Directive | null => {
		if (value == null) {
			return null;
		}

		const validated = validateUrlDirective(value);
		if (!validated) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid currentDirective',
			});
			return z.NEVER;
		}

		return validated as Directive;
	});

export const askRequestBodySchema = z
	.object({
		messages: z.array(askRequestMessageSchema).max(ASK_MAX_MESSAGES).default([]),
		currentDirective: askCurrentDirectiveSchema.default(null),
	})
	.strict();

export type AskRequestMessage = z.infer<typeof askRequestMessageSchema>;
export type AskRequestBody = z.infer<typeof askRequestBodySchema>;
