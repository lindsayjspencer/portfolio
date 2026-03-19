import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { smoothStream, streamText } from 'ai';
import { clarifyTool, type ClarifyPayload } from '~/lib/ai/clarifyTool';
import { askRequestBodySchema } from '~/lib/ai/ask-contract';
import {
	DEFAULT_THEME,
	changeThemeTool,
	compareDirective,
	exploreDirective,
	projectsDirective,
	resumeDirective,
	skillsDirective,
	timelineDirective,
	type Directive,
	valuesDirective,
} from '~/lib/ai/directiveTools';
import { validateUrlDirective } from '~/utils/urlState';
import { langfuse } from '~/server/langfuse';
import { generalModel } from '~/server/model';
import { ASK_SYSTEM_PROMPT, buildAskMessages } from '~/server/ask/prompt';

const encoder = new TextEncoder();

const directiveToolNames = [
	'timelineDirective',
	'projectsDirective',
	'skillsDirective',
	'valuesDirective',
	'compareDirective',
	'exploreDirective',
	'resumeDirective',
] as const;

type DirectiveToolName = (typeof directiveToolNames)[number];

function sseEvent(type: string, data: unknown): Uint8Array {
	return encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

function isDirectiveToolName(toolName: string): toolName is DirectiveToolName {
	return directiveToolNames.includes(toolName as DirectiveToolName);
}

function toDirective(toolName: DirectiveToolName, input: unknown, theme: Directive['theme']): Directive | null {
	const candidate = {
		mode: toolName.replace('Directive', ''),
		theme,
		data: input,
	};
	const validated = validateUrlDirective(candidate);
	return validated ? (validated as Directive) : null;
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return 'stream error';
}

function safeEnqueue(controller: ReadableStreamDefaultController<Uint8Array>, chunk: Uint8Array): void {
	try {
		controller.enqueue(chunk);
	} catch {
		// Ignore enqueue failures after disconnects.
	}
}

// Rate limiting for this endpoint is intended to happen at the edge via a Vercel Firewall
// rule, not inside this handler. That keeps abuse protection effective across cold starts
// and instances, and it blocks expensive model work before the request reaches Next.js.
//
// Expected production contract:
// - Vercel matches the rule on `/api/ask`.
// - Over-limit requests are rejected with 429 before `POST()` runs.
// - Requests that arrive here have already passed the coarse edge limiter.
//
// Local development will not enforce that rule, so this handler still does its own input
// validation, but it intentionally does not implement an in-process limiter.
export async function POST(req: Request) {
	let body: unknown;

	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const parsedBody = askRequestBodySchema.safeParse(body);
	if (!parsedBody.success) {
		return NextResponse.json({ error: 'Invalid ask request' }, { status: 400 });
	}

	const { messages, currentDirective } = parsedBody.data;
	const trace = langfuse.trace({ id: randomUUID(), name: 'ask-stream' });

	// This is the main cost boundary for the route. If you change deployment/platform-level
	// protection later, make sure abusive traffic is still stopped before `streamText(...)`
	// is reached, because everything below can spend model tokens and hold open an SSE stream.
	const result = streamText({
		model: generalModel,
		system: ASK_SYSTEM_PROMPT,
		messages: buildAskMessages(messages, currentDirective),
		tools: {
			timelineDirective,
			projectsDirective,
			skillsDirective,
			valuesDirective,
			compareDirective,
			exploreDirective,
			resumeDirective,
			clarify: clarifyTool,
			changeTheme: changeThemeTool,
		},
		toolChoice: 'auto',
		experimental_telemetry: {
			isEnabled: true,
			metadata: { langfuseTraceId: trace.id, langfuseUpdateParent: false },
		},
		experimental_transform: [
			smoothStream({
				delayInMs: 30,
				chunking: 'word',
			}),
		],
	});

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const toolCalls: Array<{ name: string; input: unknown }> = [];
			let streamedText = '';
			let streamError: string | null = null;
			let activeTheme: Directive['theme'] = currentDirective?.theme ?? DEFAULT_THEME;

			try {
				for await (const part of result.fullStream) {
					if (part.type === 'text-delta') {
						streamedText += part.text;
						safeEnqueue(controller, sseEvent('text', { delta: part.text }));
						continue;
					}

					if (part.type === 'tool-call') {
						toolCalls.push({ name: part.toolName, input: part.input });

						if (isDirectiveToolName(part.toolName)) {
							const directive = toDirective(part.toolName, part.input, activeTheme);
							if (directive) {
								safeEnqueue(controller, sseEvent('directive', directive));
							}
						} else if (part.toolName === 'clarify') {
							safeEnqueue(controller, sseEvent('clarify', part.input as ClarifyPayload));
						} else if (part.toolName === 'changeTheme') {
							const nextTheme =
								(part.input as { theme?: Directive['theme'] } | null | undefined)?.theme ?? activeTheme;
							activeTheme = nextTheme;
							safeEnqueue(controller, sseEvent('changeTheme', part.input));
						}

						continue;
					}

					if (part.type === 'error') {
						streamError = getErrorMessage(part.error);
						safeEnqueue(controller, sseEvent('error', { message: streamError }));
					}
				}
			} catch (error) {
				streamError = getErrorMessage(error);
				safeEnqueue(controller, sseEvent('error', { message: streamError }));
			}

			safeEnqueue(controller, sseEvent('done', { ok: streamError === null }));

			const inputPayload = {
				messages,
				currentDirective,
			};
			const outputPayload = {
				toolCalls,
				streamedText,
				streamError,
			};

			try {
				trace.update({
					input: inputPayload,
					output: outputPayload,
					metadata: { model: 'gemini-2.5-flash' },
				});
				trace.generation({
					name: 'portfolio-ask-stream',
					model: 'gemini-2.5-flash',
					input: inputPayload,
					output: outputPayload,
				});
				await langfuse.flushAsync();
			} catch (telemetryError) {
				console.error('Langfuse ask-stream telemetry failed:', telemetryError);
			} finally {
				controller.close();
			}
		},
	});

	return new NextResponse(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
		},
	});
}
