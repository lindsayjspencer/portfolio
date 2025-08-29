import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { env } from '~/env';
import { createDebugFetch } from './debug-fetch';

// Enable HTTP request/response debugging
if (env.NODE_ENV === 'development') {
	// createDebugFetch();
}

export const generalModel = google('gemini-2.5-flash');

// Lightweight model for quick tasks like title generation
export const summaryModel = google('gemini-1.5-flash-8b');

// Fast model with large context window for URL summarization
export const urlSummarizerModel = google('gemini-2.0-flash-lite');

// Model for LLM-as-a-judge factuality scoring
export const factualityModel = google('gemini-1.5-flash');

export const generateObjectModel = google('gemini-1.5-flash');
