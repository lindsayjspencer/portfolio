import { streamText } from 'ai';
import { isWhitelistedSuggestionChipQuestion } from '~/components/SuggestionChips/questions';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import type { Directive } from '~/lib/ai/directiveTools';
import {
	GENERAL_MODEL_ID,
	generalModel,
	PLANNER_MODEL_ID,
	plannerModel,
} from '~/server/model';
import {
	buildOutputPayload,
	createBaseMetadata,
	createGeneration,
	emitTerminalResponse,
	getLatestUserMessage,
} from './orchestration/shared';
import { runPurposeStage } from './orchestration/purposeStage';
import { runSecurityStage } from './orchestration/securityStage';
import { runSizePolicyStage } from './orchestration/sizePolicyStage';
import type {
	AskNarrationPayload,
	AskOrchestrationTelemetry,
	AskPlannerPayload,
	AskStreamEvent,
	AskUsageBlock,
} from './orchestration/types';
import { trimAskHistory } from './history';
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

export type { AskOrchestrationTelemetry, AskStreamEvent } from './orchestration/types';

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
	const latestUserMessage = getLatestUserMessage(messages);
	const whitelistedSuggestionChipBypass =
		latestUserMessage !== null && isWhitelistedSuggestionChipQuestion(latestUserMessage);
	const inputPayload = {
		messages,
		trimmedMessages,
		currentDirective,
	};
	const baseMetadata = createBaseMetadata(whitelistedSuggestionChipBypass);

	const sizePolicyStage = runSizePolicyStage({
		messages,
		whitelistedSuggestionChipBypass,
	});

	if (sizePolicyStage.outcome.decision === 'ask_to_shorten') {
		await emitTerminalResponse({
			text: SHORTEN_REPLY,
			emit,
		});

		return {
			inputPayload,
			outputPayload: buildOutputPayload({
				sizePolicyStage,
			}),
			metadata: baseMetadata,
			generations: [
				sizePolicyStage.generation,
				createGeneration({
					name: 'portfolio-ask-size-policy-response',
					model: 'deterministic-policy',
					input: {
						outcome: sizePolicyStage.outcome,
					},
					output: {
						reply: SHORTEN_REPLY,
					},
				}),
			],
		};
	}

	const securityStage = await runSecurityStage({
		trimmedMessages,
		whitelistedSuggestionChipBypass,
	});

	if (securityStage.outcome.decision === 'reject') {
		await emitTerminalResponse({
			text: SECURITY_REJECT_REPLY,
			emit,
		});

		return {
			inputPayload,
			outputPayload: buildOutputPayload({
				sizePolicyStage,
				securityStage,
			}),
			metadata: {
				...baseMetadata,
				securityModel: securityStage.model,
			},
			generations: [sizePolicyStage.generation, securityStage.generation],
		};
	}

	const purposeStage = await runPurposeStage({
		trimmedMessages,
		currentDirective,
		whitelistedSuggestionChipBypass,
	});

	if (purposeStage.outcome.decision === 'ask_to_rephrase') {
		await emitTerminalResponse({
			text: purposeStage.outcome.text,
			emit,
		});

		return {
			inputPayload,
			outputPayload: buildOutputPayload({
				sizePolicyStage,
				securityStage,
				purposeStage,
			}),
			metadata: {
				...baseMetadata,
				securityModel: securityStage.model,
				purposeModel: purposeStage.model,
			},
			generations: [sizePolicyStage.generation, securityStage.generation, purposeStage.generation],
		};
	}

	if (purposeStage.outcome.decision === 'ask_to_clarify') {
		await emitTerminalResponse({
			text: purposeStage.outcome.question,
			emit,
			suggestedAnswers: purposeStage.outcome.suggestedAnswers,
		});

		return {
			inputPayload,
			outputPayload: buildOutputPayload({
				sizePolicyStage,
				securityStage,
				purposeStage,
			}),
			metadata: {
				...baseMetadata,
				securityModel: securityStage.model,
				purposeModel: purposeStage.model,
			},
			generations: [sizePolicyStage.generation, securityStage.generation, purposeStage.generation],
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

	if (streamedText) {
		console.log('[ask-debug] text:', streamedText);
	}

	emit({ type: 'done', ok: streamError === null });

	const [plannerUsage, narrationUsage] = await Promise.all([
		plannerDrainPromise.then(() => resolveUsage(plannerResult, 'ask planner')),
		resolveUsage(narratorResult, 'ask narration'),
	]);

	const plannerPayload: AskPlannerPayload = {
		toolCalls: plannerToolCalls,
		selectedDirective: plannerSelection,
		reason: plannerReason,
		streamError: plannerError,
		usage: plannerUsage.summary,
	};
	const narrationPayload: AskNarrationPayload = {
		toolCalls: narratorToolCalls,
		streamedText,
		streamError,
		usage: narrationUsage.summary,
	};

	return {
		inputPayload,
		outputPayload: buildOutputPayload({
			sizePolicyStage,
			securityStage,
			purposeStage,
			planner: plannerPayload,
			narration: narrationPayload,
		}),
		metadata: {
			...baseMetadata,
			securityModel: securityStage.model,
			purposeModel: purposeStage.model,
			plannerModel: PLANNER_MODEL_ID,
			narrationModel: GENERAL_MODEL_ID,
		},
		generations: [
			sizePolicyStage.generation,
			securityStage.generation,
			purposeStage.generation,
			createGeneration({
				name: 'portfolio-ask-planner',
				model: PLANNER_MODEL_ID,
				input: {
					trimmedMessages,
					currentDirective,
				},
				output: plannerPayload,
				usageDetails: plannerUsage.details,
			}),
			createGeneration({
				name: 'portfolio-ask-narration',
				model: GENERAL_MODEL_ID,
				input: {
					trimmedMessages,
					selectedDirective: plannerSelection,
				},
				output: narrationPayload,
				usageDetails: narrationUsage.details,
			}),
		],
	};
}
