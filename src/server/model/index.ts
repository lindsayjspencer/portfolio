import { google } from '@ai-sdk/google';
import { env } from '~/env';

// Enable HTTP request/response debugging
if (env.NODE_ENV === 'development') {
	// createDebugFetch();
}

export const generalModel = google('gemini-2.5-flash');
