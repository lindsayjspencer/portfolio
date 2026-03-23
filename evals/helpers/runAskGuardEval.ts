import { wrapAISDKModel } from 'evalite/ai-sdk';
import type { AskRequestMessage } from '~/lib/ai/ask-contract';
import type { AppLanguageModel } from '~/server/model';
import { purposeModel, securityModel } from '~/server/model';
import type { AskSizePolicyOutcome } from '~/server/ask/guard/policy';
import { runAskSizePolicy } from '~/server/ask/guard/policy';
import { runAskSecurity } from '~/server/ask/guard/runtime';
import type { AskSecurityOutcome } from '~/server/ask/guard/types';
import { trimAskHistory } from '~/server/ask/history';
import { runAskPurpose } from '~/server/ask/purpose/runtime';
import type { AskPurposeOutcome } from '~/server/ask/purpose/types';

const securityEvalModel = wrapAISDKModel(securityModel) as AppLanguageModel;
const purposeEvalModel = wrapAISDKModel(purposeModel) as AppLanguageModel;

export type AskGuardEvalOutput = AskSizePolicyOutcome | AskSecurityOutcome | AskPurposeOutcome;

export async function runAskGuardEval({
	messages,
}: {
	messages: AskRequestMessage[];
}): Promise<AskGuardEvalOutput> {
	const sizePolicyOutcome = runAskSizePolicy(messages);
	if (sizePolicyOutcome.decision !== 'allow') {
		return sizePolicyOutcome;
	}

	const trimmedMessages = trimAskHistory(messages);
	const securityResult = await runAskSecurity({
		model: securityEvalModel,
		messages: trimmedMessages,
	});

	if (securityResult.outcome.decision !== 'allow') {
		return securityResult.outcome;
	}

	const purposeResult = await runAskPurpose({
		model: purposeEvalModel,
		messages: trimmedMessages,
		currentDirective: null,
	});

	return purposeResult.outcome;
}
