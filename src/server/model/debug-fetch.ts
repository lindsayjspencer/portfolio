// Fetch wrapper to log raw HTTP requests and responses
export function createDebugFetch() {
	const originalFetch = global.fetch;

	global.fetch = async function (...args: Parameters<typeof fetch>) {
		const [url, options] = args;
		
		console.log('🔵 HTTP Request:', {
			url,
			method: options?.method || 'GET',
			headers: options?.headers,
			body: typeof options?.body === 'string' 
				? (options.body.length > 1000 ? options.body.substring(0, 1000) + '...' : options.body)
				: options?.body,
		});

		try {
			const response = await originalFetch(...args);
			
			// Clone response to read body without consuming it
			const clonedResponse = response.clone();
			const responseText = await clonedResponse.text();
			
			console.log('🟢 HTTP Response:', {
				url,
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
				body: responseText.length > 1000 
					? responseText.substring(0, 1000) + '...' 
					: responseText,
			});

			return response;
		} catch (error) {
			console.error('🔴 HTTP Error:', {
				url,
				error: error instanceof Error ? {
					message: error.message,
					stack: error.stack,
				} : error,
			});
			throw error;
		}
	};

	return () => {
		global.fetch = originalFetch;
	};
}