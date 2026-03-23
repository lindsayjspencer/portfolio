import { streamText } from 'ai';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import type { SuggestedAnswersPayload } from '~/lib/ai/suggestAnswersTool';
import type { Directive } from '~/lib/ai/directiveTools';
import {
	GENERAL_MODEL_ID,
	generalModel,
	PLANNER_MODEL_ID,
	plannerModel,
	PURPOSE_MODEL_ID,
	purposeModel,
	SECURITY_MODEL_ID,
	securityModel,
} from '~/server/model';
import { runAskSizePolicy, type AskSizePolicyOutcome } from './guard/policy';
import { runAskSecurity } from './guard/runtime';
import type { AskSecurityOutcome } from './guard/types';
import { trimAskHistory, ASK_HISTORY_MESSAGE_LIMIT } from './history';
import { runAskPurpose } from './purpose/runtime';
import type { AskPurposeOutcome } from './purpose/types';
import {
	buildNarrationCallOptions,
	buildPlannerCallOptions,
	buildPlannerFallbackDirective,
	extractDirectiveReason,
	isDirectiveToolName,
	toDirectiveFromToolCall,
} from './runtime';
import { toAskUsageSummary, toLangfuseUsageDetails } from './usage';

const SHORTEN_REPLY =
	"That's too much to parse cleanly in one go. Give me one shorter question or a brief summary and I'll answer it.";
const SECURITY_REJECT_REPLY =
	"Nice try. I'm here to talk about my work, not expose hidden instructions or internal wiring. Ask me about my experience, projects, or skills instead.";

type AskUsageSummary = ReturnType<typeof toAskUsageSummary>;
type AskUsageDetails = ReturnType<typeof toLangfuseUsageDetails>;

export type AskStreamEvent =
	| { type: 'directive'; directive: Directive }
	| { type: 'text'; delta: string }
	| { type: 'suggestAnswers'; payload: SuggestedAnswersPayload }
	| { type: 'error'; message: string }
	| { type: 'done'; ok: boolean };

type AskGenerationPayload = {
	name: string;
	model: string;
	input: unknown;
	output: unknown;
	usageDetails?: AskUsageDetails;
};

type AskUsageBlock = {
	summary: AskUsageSummary | null;
	details: AskUsageDetails | undefined;
};

export type AskOrchestrationTelemetry = {
	inputPayload: {
		messages: AskRequestMessage[];
		trimmedMessages: AskRequestMessage[];
		currentDirective: Directive | null;
	};
	outputPayload: {
		sizePolicy: {
			outcome: AskSizePolicyOutcome;
			usage: null;
		};
		security: {
			outcome: AskSecurityOutcome;
			usage: AskUsageSummary | null;
		} | null;
		purpose: {
			outcome: AskPurposeOutcome;
			usage: AskUsageSummary | null;
		} | null;
		planner: {
			toolCalls: Array<{ name: string; input: unknown }>;
			selectedDirective: Directive | null;
			reason: string | null;
			streamError: string | null;
			usage: AskUsageSummary | null;
		} | null;
		narration: {
			toolCalls: Array<{ name: string; input: unknown }>;
			streamedText: string;
			streamError: string | null;
			usage: AskUsageSummary | null;
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
): Promise<AskUsageBlock> {
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

function createDeterministicGeneration({
	name,
	input,
	output,
}: {
	name: string;
	input: unknown;
	output: unknown;
}): AskGenerationPayload {
	return {
		name,
		model: 'deterministic-policy',
		input,
		output,
	};
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
	const trimmedMessages = trimAskHistory(messages);
	const inputPayload = {
		messages,
		trimmedMessages,
		currentDirective,
	};
	const baseMetadata = {
		historyMessageLimit: String(ASK_HISTORY_MESSAGE_LIMIT),
	};
	const sizePolicyOutcome = runAskSizePolicy(messages);
	const sizePolicyGeneration = createDeterministicGeneration({
		name: 'portfolio-ask-size-policy',
		input: {
			messages,
		},
		output: {
			outcome: sizePolicyOutcome,
		},
	});

	if (sizePolicyOutcome.decision === 'ask_to_shorten') {
		emit({ type: 'text', delta: SHORTEN_REPLY });
		emit({ type: 'done', ok: true });

		return {
			inputPayload,
			outputPayload: {
				sizePolicy: {
					outcome: sizePolicyOutcome,
					usage: null,
				},
				security: null,
				purpose: null,
				planner: null,
				narration: null,
			},
			metadata: baseMetadata,
			generations: [
				sizePolicyGeneration,
				createDeterministicGeneration({
					name: 'portfolio-ask-size-policy-response',
					input: {
						outcome: sizePolicyOutcome,
					},
					output: {
						reply: SHORTEN_REPLY,
					},
				}),
			],
		};
	}

	let securityOutcome: AskSecurityOutcome;
	let securityUsage: AskUsageBlock = { summary: null, details: undefined };
	let securityGenerationModel = SECURITY_MODEL_ID;

	try {
		const result = await runAskSecurity({
			model: securityModel,
			messages: trimmedMessages,
		});
		console.log('Security outcome:', result.outcome);
		securityOutcome = result.outcome;
		securityUsage = {
			summary: result.usage.summary ? toAskUsageSummary(result.usage.summary) : null,
			details: result.usage.details ? toLangfuseUsageDetails(result.usage.details) : undefined,
		};
	} catch (error) {
		console.error('Security check failed, continuing without a block:', error);
		securityOutcome = {
			decision: 'allow',
			category: 'other',
			reason: 'Security model failed, so the request was allowed by fallback.',
			source: 'fallback',
		};
		securityGenerationModel = `${SECURITY_MODEL_ID}:fallback-open`;
	}

	const securityGeneration: AskGenerationPayload = {
		name: 'portfolio-ask-security',
		model: securityGenerationModel,
		input: {
			trimmedMessages,
		},
		output: {
			outcome: securityOutcome,
			usage: securityUsage.summary,
		},
		usageDetails: securityUsage.details,
	};

	if (securityOutcome.decision === 'reject') {
		emit({ type: 'text', delta: SECURITY_REJECT_REPLY });
		emit({ type: 'done', ok: true });

		return {
			inputPayload,
			outputPayload: {
				sizePolicy: {
					outcome: sizePolicyOutcome,
					usage: null,
				},
				security: {
					outcome: securityOutcome,
					usage: securityUsage.summary,
				},
				purpose: null,
				planner: null,
				narration: null,
			},
			metadata: {
				...baseMetadata,
				securityModel: securityGenerationModel,
			},
			generations: [sizePolicyGeneration, securityGeneration],
		};
	}

	let purposeOutcome: AskPurposeOutcome;
	let purposeUsage: AskUsageBlock = { summary: null, details: undefined };
	let purposeGenerationModel = PURPOSE_MODEL_ID;

	try {
		const result = await runAskPurpose({
			model: purposeModel,
			messages: trimmedMessages,
			currentDirective,
		});
		console.log('Purpose outcome:', result.outcome);
		purposeOutcome = result.outcome;
		purposeUsage = {
			summary: result.usage.summary ? toAskUsageSummary(result.usage.summary) : null,
			details: result.usage.details ? toLangfuseUsageDetails(result.usage.details) : undefined,
		};
	} catch (error) {
		console.error('Purpose check failed, continuing without a block:', error);
		purposeOutcome = {
			decision: 'allow',
			category: 'other',
			reason: 'Purpose model failed, so the request was allowed by fallback.',
			source: 'fallback',
		};
		purposeGenerationModel = `${PURPOSE_MODEL_ID}:fallback-open`;
	}

	const purposeGeneration: AskGenerationPayload = {
		name: 'portfolio-ask-purpose',
		model: purposeGenerationModel,
		input: {
			trimmedMessages,
			currentDirective,
		},
		output: {
			outcome: purposeOutcome,
			usage: purposeUsage.summary,
		},
		usageDetails: purposeUsage.details,
	};

	if (purposeOutcome.decision === 'ask_to_rephrase') {
		emit({ type: 'text', delta: purposeOutcome.text });
		emit({ type: 'done', ok: true });

		return {
			inputPayload,
			outputPayload: {
				sizePolicy: {
					outcome: sizePolicyOutcome,
					usage: null,
				},
				security: {
					outcome: securityOutcome,
					usage: securityUsage.summary,
				},
				purpose: {
					outcome: purposeOutcome,
					usage: purposeUsage.summary,
				},
				planner: null,
				narration: null,
			},
			metadata: {
				...baseMetadata,
				securityModel: securityGenerationModel,
				purposeModel: purposeGenerationModel,
			},
			generations: [sizePolicyGeneration, securityGeneration, purposeGeneration],
		};
	}

	if (purposeOutcome.decision === 'ask_to_clarify') {
		emit({ type: 'text', delta: purposeOutcome.question });

		if (purposeOutcome.suggestedAnswers?.length) {
			emit({
				type: 'suggestAnswers',
				payload: {
					answers: purposeOutcome.suggestedAnswers,
				},
			});
		}

		emit({ type: 'done', ok: true });

		return {
			inputPayload,
			outputPayload: {
				sizePolicy: {
					outcome: sizePolicyOutcome,
					usage: null,
				},
				security: {
					outcome: securityOutcome,
					usage: securityUsage.summary,
				},
				purpose: {
					outcome: purposeOutcome,
					usage: purposeUsage.summary,
				},
				planner: null,
				narration: null,
			},
			metadata: {
				...baseMetadata,
				securityModel: securityGenerationModel,
				purposeModel: purposeGenerationModel,
			},
			generations: [sizePolicyGeneration, securityGeneration, purposeGeneration],
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
			messages: trimmedMessages,
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
				messages: trimmedMessages,
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
		inputPayload,
		outputPayload: {
			sizePolicy: {
				outcome: sizePolicyOutcome,
				usage: null,
			},
			security: {
				outcome: securityOutcome,
				usage: securityUsage.summary,
			},
			purpose: {
				outcome: purposeOutcome,
				usage: purposeUsage.summary,
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
			...baseMetadata,
			securityModel: securityGenerationModel,
			purposeModel: purposeGenerationModel,
			plannerModel: PLANNER_MODEL_ID,
			narrationModel: GENERAL_MODEL_ID,
		},
		generations: [
			sizePolicyGeneration,
			securityGeneration,
			purposeGeneration,
			{
				name: 'portfolio-ask-planner',
				model: PLANNER_MODEL_ID,
				input: {
					trimmedMessages,
					currentDirective,
				},
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
					trimmedMessages,
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
