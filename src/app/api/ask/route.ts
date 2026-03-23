import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { askRequestBodySchema } from '~/lib/ai/ask-contract';
import type { Directive } from '~/lib/ai/directiveTools';
import { langfuse } from '~/server/langfuse';
import { GENERAL_MODEL_ID, generalModel, PLANNER_MODEL_ID, plannerModel } from '~/server/model';
import {
	buildNarrationCallOptions,
	buildPlannerCallOptions,
	buildPlannerFallbackDirective,
	extractDirectiveReason,
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

async function resolveUsage(
	result: { totalUsage: PromiseLike<Parameters<typeof toAskUsageSummary>[0]> } | null,
	label: string,
) {
	if (!result) {
		return { summary: null, details: undefined };
	}

	try {
		const totalUsage = await result.totalUsage;
		return {
			summary: toAskUsageSummary(totalUsage),
			details: toLangfuseUsageDetails(totalUsage),
		};
	} catch (usageError) {
		console.error(`Failed to resolve ${label} usage:`, usageError);
		return { summary: null, details: undefined };
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
			const plannerToolCalls: Array<{ name: string; input: unknown }> = [];
			const narratorToolCalls: Array<{ name: string; input: unknown }> = [];
			let streamedText = '';
			let streamError: string | null = null;
			let plannerError: string | null = null;
			let plannerSelection: Directive | null = null;
			let plannerReason: string | null = null;
			let plannerDirectiveEmitted = false;
			let narratorResult: ReturnType<typeof streamText> | null = null;
			const plannerResult = streamText(
				buildPlannerCallOptions({
					model: plannerModel,
					messages,
					currentDirective,
				}),
			);
			let resolvePlannerSelection: (() => void) | null = null;
			const plannerSelectionReady = new Promise<void>((resolve) => {
				resolvePlannerSelection = resolve;
			});
			const settlePlannerSelection = () => {
				if (resolvePlannerSelection) {
					resolvePlannerSelection();
					resolvePlannerSelection = null;
				}
			};
			const plannerDrainPromise = (async () => {
				try {
					for await (const part of plannerResult.fullStream) {
						if (part.type === 'text-delta') {
							console.log('[ask-debug] planner text ignored:', part.text);
							continue;
						}

						if (part.type === 'tool-call') {
							plannerToolCalls.push({ name: part.toolName, input: part.input });
							console.log('[ask-debug] planner tool-call:', part.toolName, part.input);

							if (!plannerSelection && isDirectiveToolName(part.toolName)) {
								const directive = toDirectiveFromToolCall(
									part.toolName,
									part.input,
									currentDirective?.theme ?? 'cold',
								);

								if (directive) {
									plannerSelection = directive;
									plannerReason = extractDirectiveReason(part.input);

									if (!plannerDirectiveEmitted) {
										plannerDirectiveEmitted = true;
										safeEnqueue(controller, sseEvent('directive', directive));
									}

									settlePlannerSelection();
								}
							}

							continue;
						}

						if (part.type === 'error') {
							plannerError = getErrorMessage(part.error);
							console.error('Planner stream error part:', plannerError);
						}
					}
				} catch (error) {
					plannerError = getErrorMessage(error);
					console.error('Planner stream failed:', error);
				} finally {
					settlePlannerSelection();
				}
			})();

			await plannerSelectionReady;

			if (!plannerSelection) {
				plannerSelection = buildPlannerFallbackDirective(currentDirective);

				if (!plannerDirectiveEmitted) {
					plannerDirectiveEmitted = true;
					safeEnqueue(controller, sseEvent('directive', plannerSelection));
				}
			}

			try {
				narratorResult = streamText(
					buildNarrationCallOptions({
						model: generalModel,
						messages,
						directive: plannerSelection,
						plannerReason,
					}),
				);

				for await (const part of narratorResult.fullStream) {
					if (part.type === 'text-delta') {
						streamedText += part.text;
						console.log('[ask-debug] text:', part.text);
						safeEnqueue(controller, sseEvent('text', { delta: part.text }));
						continue;
					}

					if (part.type === 'tool-call') {
						narratorToolCalls.push({ name: part.toolName, input: part.input });
						console.log('[ask-debug] unexpected narrator tool-call:', part.toolName, part.input);
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
			controller.close();

			const [plannerUsage, narrationUsage] = await Promise.all([
				plannerDrainPromise.then(() => resolveUsage(plannerResult, 'ask planner')),
				resolveUsage(narratorResult, 'ask narration'),
			]);

			const inputPayload = {
				messages,
				currentDirective,
			};
			const outputPayload = {
				planner: {
					toolCalls: plannerToolCalls,
					selectedDirective: plannerSelection,
					reason: plannerReason,
					streamError: plannerError,
					usage: plannerUsage.summary,
				},
				narration: {
					toolCalls: narratorToolCalls,
					streamedText,
					streamError,
					usage: narrationUsage.summary,
				},
			};

			try {
				trace.update({
					input: inputPayload,
					output: outputPayload,
					metadata: {
						plannerModel: PLANNER_MODEL_ID,
						narrationModel: GENERAL_MODEL_ID,
					},
				});
				trace.generation({
					name: 'portfolio-ask-planner',
					model: PLANNER_MODEL_ID,
					input: inputPayload,
					output: outputPayload.planner,
					usageDetails: plannerUsage.details,
				});
				trace.generation({
					name: 'portfolio-ask-narration',
					model: GENERAL_MODEL_ID,
					input: {
						...inputPayload,
						selectedDirective: plannerSelection,
					},
					output: outputPayload.narration,
					usageDetails: narrationUsage.details,
				});
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
