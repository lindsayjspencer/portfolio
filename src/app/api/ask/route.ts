import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { askRequestBodySchema } from '~/lib/ai/ask-contract';
import { langfuse } from '~/server/langfuse';
import { orchestrateAsk, type AskStreamEvent } from '~/server/ask/orchestrate';

const encoder = new TextEncoder();

function sseEvent(type: string, data: unknown): Uint8Array {
	return encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
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
	const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content;

	if (latestUserMessage) {
		console.log('[ask-debug] user:', latestUserMessage);
	}

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const toSseEvent = (event: AskStreamEvent) => {
				switch (event.type) {
					case 'directive':
						safeEnqueue(controller, sseEvent('directive', event.directive));
						return;
					case 'text':
						safeEnqueue(controller, sseEvent('text', { delta: event.delta }));
						return;
					case 'suggestAnswers':
						safeEnqueue(controller, sseEvent('suggestAnswers', event.payload));
						return;
					case 'error':
						safeEnqueue(controller, sseEvent('error', { message: event.message }));
						return;
					case 'done':
						safeEnqueue(controller, sseEvent('done', { ok: event.ok }));
						return;
				}
			};

			const telemetry = await orchestrateAsk({
				messages,
				currentDirective,
				emit: toSseEvent,
			});

			controller.close();

			try {
				trace.update({
					input: telemetry.inputPayload,
					output: telemetry.outputPayload,
					metadata: telemetry.metadata,
				});
				for (const generation of telemetry.generations) {
					trace.generation(generation);
				}
				await langfuse.flushAsync();
			} catch (telemetryError) {
				console.error('Langfuse ask-stream telemetry failed:', telemetryError);
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
