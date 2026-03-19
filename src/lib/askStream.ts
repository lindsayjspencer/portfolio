import { z } from 'zod';
import type { ClarifyPayload } from './ai/clarifyTool';
import type { Directive } from './ai/directiveTools';
import type { ThemeName } from './themes';
import { getThemeNames } from './themes';
import { validateUrlDirective } from '~/utils/urlState';

export type AskStreamEvent =
	| { type: 'text'; delta: string }
	| { type: 'directive'; directive: Directive }
	| { type: 'clarify'; payload: ClarifyPayload }
	| { type: 'changeTheme'; theme: ThemeName }
	| { type: 'error'; message: string }
	| { type: 'done'; ok: boolean };

const textEventSchema = z.object({ delta: z.string() }).strict();
const clarifyEventSchema = z
	.object({
		slot: z.string(),
		kind: z.enum(['choice', 'free']),
		options: z.array(z.string()).optional(),
		multi: z.boolean().optional(),
		placeholder: z.string().optional(),
		exampleAnswer: z.string().optional(),
		timeoutSec: z.number().optional(),
	})
	.strict();
const changeThemeEventSchema = z.object({
	theme: z.enum(getThemeNames() as [ThemeName, ...ThemeName[]]),
});
const errorEventSchema = z.object({ message: z.string() }).strict();
const doneEventSchema = z.object({ ok: z.boolean().optional() }).passthrough();

export function parseAskSseBlock(block: string): AskStreamEvent | null {
	let eventType = '';
	const dataParts: string[] = [];

	for (const line of block.split(/\n/)) {
		if (line.startsWith('event:')) {
			eventType = line.slice(6).trim();
		} else if (line.startsWith('data:')) {
			dataParts.push(line.slice(5));
		}
	}

	if (!eventType) {
		return null;
	}

	const dataLine = dataParts.join('\n').trim();

	const parseJson = (): unknown => {
		if (!dataLine) return {};
		try {
			return JSON.parse(dataLine);
		} catch {
			return null;
		}
	};

	switch (eventType) {
		case 'text': {
			const parsed = textEventSchema.safeParse(parseJson());
			return parsed.success ? { type: 'text', delta: parsed.data.delta } : null;
		}
		case 'directive': {
			const parsed = parseJson();
			const directive = validateUrlDirective(parsed);
			return directive ? { type: 'directive', directive: directive as Directive } : null;
		}
		case 'clarify': {
			const parsed = clarifyEventSchema.safeParse(parseJson());
			return parsed.success ? { type: 'clarify', payload: parsed.data } : null;
		}
		case 'changeTheme': {
			const parsed = changeThemeEventSchema.safeParse(parseJson());
			return parsed.success ? { type: 'changeTheme', theme: parsed.data.theme } : null;
		}
		case 'error': {
			const parsed = errorEventSchema.safeParse(parseJson());
			return parsed.success ? { type: 'error', message: parsed.data.message } : null;
		}
		case 'done': {
			const parsed = doneEventSchema.safeParse(parseJson());
			return parsed.success ? { type: 'done', ok: parsed.data.ok ?? true } : { type: 'done', ok: true };
		}
		default:
			return null;
	}
}
