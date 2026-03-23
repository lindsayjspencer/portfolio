import { wrapAISDKModel } from 'evalite/ai-sdk';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import type { AppLanguageModel } from '~/server/model';
import { guardModel } from '~/server/model';
import { runAskGuardPolicy } from '~/server/ask/guard/policy';
import { runAskGuard } from '~/server/ask/guard/runtime';
import type { AskGuardOutcome } from '~/server/ask/guard/types';

const guardEvalModel = wrapAISDKModel(guardModel) as AppLanguageModel;

export type AskGuardEvalOutput = Pick<AskGuardOutcome, 'decision' | 'category' | 'reason' | 'source'>;

export async function runAskGuardEval({
	messages,
}: {
	messages: AskRequestMessage[];
}): Promise<AskGuardEvalOutput> {
	const policyOutcome = runAskGuardPolicy(messages);
	if (policyOutcome) {
		return policyOutcome;
	}

	const result = await runAskGuard({
		model: guardEvalModel,
		messages,
	});

	return result.outcome;
}
