import type { LanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';

// Enable HTTP request/response debugging
if (process.env.NODE_ENV === 'development') {
	// createDebugFetch();
}

export const GENERAL_MODEL_ID = 'gpt-5.4-mini';
export const PLANNER_MODEL_ID = 'gpt-5.4-nano';
export const SECURITY_MODEL_ID = 'gpt-5.4-nano';
export const PURPOSE_MODEL_ID = 'gpt-5.4-mini';

export type AppLanguageModel = LanguageModel;

export const generalModel: AppLanguageModel = openai(GENERAL_MODEL_ID);
export const plannerModel: AppLanguageModel = openai(PLANNER_MODEL_ID);
export const securityModel: AppLanguageModel = openai(SECURITY_MODEL_ID);
export const purposeModel: AppLanguageModel = openai(PURPOSE_MODEL_ID);
