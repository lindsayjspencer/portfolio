import { streamText } from 'ai';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import type { Directive } from '~/lib/ai/directiveTools';
import {
	GENERAL_MODEL_ID,
	generalModel,
	GUARD_MODEL_ID,
	guardModel,
	PLANNER_MODEL_ID,
	plannerModel,
} from '~/server/model';
import { runAskGuardPolicy } from './guard/policy';
import { runAskGuard } from './guard/runtime';
import type { AskGuardOutcome } from './guard/types';
import {
	buildNarrationCallOptions,
	buildPlannerCallOptions,
	buildPlannerFallbackDirective,
	extractDirectiveReason,
	isDirectiveToolName,
	toDirectiveFromToolCall,
} from './runtime';
import { toAskUsageSummary, toLangfuseUsageDetails } from './usage';

export type AskStreamEvent =
	| { type: 'directive'; directive: Directive }
	| { type: 'text'; delta: string }
	| { type: 'error'; message: string }
	| { type: 'done'; ok: boolean };

type AskGenerationPayload = {
	name: string;
	model: string;
	input: unknown;
	output: unknown;
	usageDetails?: ReturnType<typeof toLangfuseUsageDetails>;
};

export type AskOrchestrationTelemetry = {
	inputPayload: {
		messages: AskRequestMessage[];
		currentDirective: Directive | null;
	};
	outputPayload: {
		guard: {
			outcome: AskGuardOutcome;
			usage: ReturnType<typeof toAskUsageSummary> | null;
		};
		planner: {
			toolCalls: Array<{ name: string; input: unknown }>;
			selectedDirective: Directive | null;
			reason: string | null;
			streamError: string | null;
			usage: ReturnType<typeof toAskUsageSummary> | null;
		} | null;
		narration: {
			toolCalls: Array<{ name: string; input: unknown }>;
			streamedText: string;
			streamError: string | null;
			usage: ReturnType<typeof toAskUsageSummary> | null;
		} | null;
	};
	metadata: Record<string, string>;
	generations: AskGenerationPayload[];
};

function getErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return 'stream error';
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

function buildGuardReply(outcome: AskGuardOutcome): string {
	if (outcome.decision === 'ask_to_shorten') {
		return "That's too much to parse cleanly in one go. Give me one shorter question or a brief summary and I'll answer it.";
	}

	if (outcome.decision === 'ask_to_rephrase') {
		return "I'm here to answer questions about my work, projects, skills, values, hiring fit, or this portfolio. Can you rephrase that in that direction?";
	}

	return "Nice try. I'm here to talk about my work, not expose hidden instructions or internal wiring. Ask me about my experience, projects, or skills instead.";
}

export async function orchestrateAsk({
	messages,
	currentDirective,
	emit,
}: {
	messages: AskRequestMessage[];
	currentDirective: Directive | null;
	emit: (event: AskStreamEvent) => void;
}): Promise<AskOrchestrationTelemetry> {
	const inputPayload = {
		messages,
		currentDirective,
	};

	const policyGuardOutcome = runAskGuardPolicy(messages);
	let guardOutcome: AskGuardOutcome;
	let guardUsage: {
		summary: ReturnType<typeof toAskUsageSummary> | null;
		details: ReturnType<typeof toLangfuseUsageDetails> | undefined;
	};
	let guardGenerationModel = GUARD_MODEL_ID;

	if (policyGuardOutcome) {
		guardOutcome = policyGuardOutcome;
		guardUsage = { summary: null, details: undefined };
		guardGenerationModel = 'deterministic-policy';
	} else {
		try {
			const result = await runAskGuard({
				model: guardModel,
				messages,
			});
			console.log('Guard outcome:', result.outcome);
			guardOutcome = result.outcome;
			guardUsage = {
				summary: result.usage.summary ? toAskUsageSummary(result.usage.summary) : null,
				details: result.usage.details ? toLangfuseUsageDetails(result.usage.details) : undefined,
			};
		} catch (error) {
			console.error('Guard check failed, continuing without guard block:', error);
			guardOutcome = {
				decision: 'allow',
				category: 'other',
				reason: 'Guard model failed, so the request was allowed by fallback.',
				source: 'fallback',
			};
			guardUsage = { summary: null, details: undefined };
			guardGenerationModel = `${GUARD_MODEL_ID}:fallback-open`;
		}
	}

	const baseTelemetry: Omit<AskOrchestrationTelemetry, 'outputPayload' | 'metadata' | 'generations'> = {
		inputPayload,
	};

	if (guardOutcome.decision !== 'allow') {
		const reply = buildGuardReply(guardOutcome);
		emit({ type: 'text', delta: reply });
		emit({ type: 'done', ok: true });

		return {
			...baseTelemetry,
			outputPayload: {
				guard: {
					outcome: guardOutcome,
					usage: guardUsage.summary,
				},
				planner: null,
				narration: null,
			},
			metadata: {
				guardModel: guardGenerationModel,
			},
			generations: [
				{
					name: 'portfolio-ask-guard',
					model: guardGenerationModel,
					input: inputPayload,
					output: {
						outcome: guardOutcome,
						reply,
						usage: guardUsage.summary,
					},
					usageDetails: guardUsage.details,
				},
			],
		};
	}

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
								emit({ type: 'directive', directive });
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
			emit({ type: 'directive', directive: plannerSelection });
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
				emit({ type: 'text', delta: part.text });
				continue;
			}

			if (part.type === 'tool-call') {
				narratorToolCalls.push({ name: part.toolName, input: part.input });
				console.log('[ask-debug] unexpected narrator tool-call:', part.toolName, part.input);
				continue;
			}

			if (part.type === 'error') {
				streamError = getErrorMessage(part.error);
				emit({ type: 'error', message: streamError });
			}
		}
	} catch (error) {
		streamError = getErrorMessage(error);
		emit({ type: 'error', message: streamError });
	}

	emit({ type: 'done', ok: streamError === null });

	const [plannerUsage, narrationUsage] = await Promise.all([
		plannerDrainPromise.then(() => resolveUsage(plannerResult, 'ask planner')),
		resolveUsage(narratorResult, 'ask narration'),
	]);

	return {
		...baseTelemetry,
		outputPayload: {
			guard: {
				outcome: guardOutcome,
				usage: guardUsage.summary,
			},
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
		},
		metadata: {
			guardModel: guardGenerationModel,
			plannerModel: PLANNER_MODEL_ID,
			narrationModel: GENERAL_MODEL_ID,
		},
		generations: [
			{
				name: 'portfolio-ask-guard',
				model: guardGenerationModel,
				input: inputPayload,
				output: {
					outcome: guardOutcome,
					usage: guardUsage.summary,
				},
				usageDetails: guardUsage.details,
			},
			{
				name: 'portfolio-ask-planner',
				model: PLANNER_MODEL_ID,
				input: inputPayload,
				output: {
					toolCalls: plannerToolCalls,
					selectedDirective: plannerSelection,
					reason: plannerReason,
					streamError: plannerError,
					usage: plannerUsage.summary,
				},
				usageDetails: plannerUsage.details,
			},
			{
				name: 'portfolio-ask-narration',
				model: GENERAL_MODEL_ID,
				input: {
					...inputPayload,
					selectedDirective: plannerSelection,
				},
				output: {
					toolCalls: narratorToolCalls,
					streamedText,
					streamError,
					usage: narrationUsage.summary,
				},
				usageDetails: narrationUsage.details,
			},
		],
	};
}
