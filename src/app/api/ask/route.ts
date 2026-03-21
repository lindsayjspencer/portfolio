import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { smoothStream, streamText } from 'ai';
import type { ClarifyPayload } from '~/lib/ai/clarifyTool';
import { askRequestBodySchema } from '~/lib/ai/ask-contract';
import { DEFAULT_THEME, type Directive } from '~/lib/ai/directiveTools';
import { langfuse } from '~/server/langfuse';
import { GENERAL_MODEL_ID, generalModel } from '~/server/model';
import {
	buildAskCallOptions,
	getClarifyFallbackToolCall,
	isDirectiveToolName,
	toDirectiveFromToolCall,
} from '~/server/ask/runtime';
import { toAskUsageSummary, toLangfuseUsageDetails } from '~/server/ask/usage';

const encoder = new TextEncoder();

function sseEvent(type: string, data: unknown): Uint8Array {
	return encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
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
	const askCallOptions = buildAskCallOptions({
		model: generalModel,
		messages,
		currentDirective,
	});
	const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content;

	if (latestUserMessage) {
		console.log('[ask-debug] user:', latestUserMessage);
	}

	// This is the main cost boundary for the route. If you change deployment/platform-level
	// protection later, make sure abusive traffic is still stopped before `streamText(...)`
	// is reached, because everything below can spend model tokens and hold open an SSE stream.
	const result = streamText({
		...askCallOptions,
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
						console.log('[ask-debug] text:', part.text);
						safeEnqueue(controller, sseEvent('text', { delta: part.text }));
						continue;
					}

					if (part.type === 'tool-call') {
						toolCalls.push({ name: part.toolName, input: part.input });
						console.log('[ask-debug] tool-call:', part.toolName, part.input);

						if (isDirectiveToolName(part.toolName)) {
							const directive = toDirectiveFromToolCall(part.toolName, part.input, activeTheme);
							if (directive) {
								activeTheme = directive.theme;
								safeEnqueue(controller, sseEvent('directive', directive));
							}
						} else if (part.toolName === 'clarify') {
							safeEnqueue(controller, sseEvent('clarify', part.input as ClarifyPayload));
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

			const fallbackToolCall = getClarifyFallbackToolCall({
				toolCalls: toolCalls.map((call) => ({ toolName: call.name, input: call.input })),
				currentDirective,
			});
			if (fallbackToolCall) {
				toolCalls.push({ name: fallbackToolCall.toolName, input: fallbackToolCall.input });
				const fallbackDirective = toDirectiveFromToolCall(
					'exploreDirective',
					fallbackToolCall.input,
					activeTheme,
				);
				if (fallbackDirective) {
					activeTheme = fallbackDirective.theme;
					safeEnqueue(controller, sseEvent('directive', fallbackDirective));
				}
			}

			safeEnqueue(controller, sseEvent('done', { ok: streamError === null }));

			let usageSummary: ReturnType<typeof toAskUsageSummary> | null = null;
			let usageDetails: Record<string, number> | undefined;

			try {
				const totalUsage = await result.totalUsage;
				usageSummary = toAskUsageSummary(totalUsage);
				usageDetails = toLangfuseUsageDetails(totalUsage);
			} catch (usageError) {
				console.error('Failed to resolve ask-stream usage:', usageError);
			}

			const inputPayload = {
				messages,
				currentDirective,
			};
			const outputPayload = {
				toolCalls,
				streamedText,
				streamError,
				usage: usageSummary,
			};

			try {
				trace.update({
					input: inputPayload,
					output: outputPayload,
					metadata: { model: GENERAL_MODEL_ID },
				});
				trace.generation({
					name: 'portfolio-ask-stream',
					model: GENERAL_MODEL_ID,
					input: inputPayload,
					output: outputPayload,
					usageDetails,
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
