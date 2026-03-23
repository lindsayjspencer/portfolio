import type { LanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';

// Enable HTTP request/response debugging
if (process.env.NODE_ENV === 'development') {
	// createDebugFetch();
}

export const GENERAL_MODEL_ID = 'gpt-5.4-mini';
export const PLANNER_MODEL_ID = 'gpt-5.4-nano';
export const GUARD_MODEL_ID = 'gpt-5.4-nano';

export type AppLanguageModel = LanguageModel;

export const generalModel: AppLanguageModel = openai(GENERAL_MODEL_ID);
export const plannerModel: AppLanguageModel = openai(PLANNER_MODEL_ID);
export const guardModel: AppLanguageModel = openai(GUARD_MODEL_ID);
