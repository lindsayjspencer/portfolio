import type { LanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';

// Enable HTTP request/response debugging
if (process.env.NODE_ENV === 'development') {
	// createDebugFetch();
}

export const GENERAL_MODEL_ID = 'gpt-4.1-mini';

export type AppLanguageModel = LanguageModel;

export const generalModel: AppLanguageModel = openai(GENERAL_MODEL_ID);
