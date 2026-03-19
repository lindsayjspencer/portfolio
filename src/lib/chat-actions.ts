import type { ClarifyPayload } from './ai/clarifyTool';
import type { AskRequestBody, AskRequestMessage } from './ai/ask-contract';
import { withDirectiveTheme, type Directive } from './ai/directiveTools';
import type { ChatMessage } from './PortfolioStore';
import { parseAskSseBlock } from './askStream';

export interface ChatSubmitParams {
	userMessage: string;
	messages: ChatMessage[];
	directive: Directive;

	// Store actions
	addMessage: (message: Omit<ChatMessage, 'id'>) => void;
	setDirective: (directive: Directive) => void;
	setDirectiveTheme: (theme: Directive['theme']) => void;
	// setNarrative removed; narration is streamed as assistant messages only
	setLoading: (loading: boolean) => void;
	setPendingClarify?: (payload: ClarifyPayload | undefined) => void;

	// Streaming UI callback
	onTextDelta?: (delta: string) => void;
}

export async function handleChatSubmit(params: ChatSubmitParams): Promise<void> {
	const {
		userMessage,
		messages,
		directive,
		addMessage,
		setDirective,
		setDirectiveTheme,
		setLoading,
		setPendingClarify,
		onTextDelta,
	} = params;

	// Begin request
	setLoading(true);

	// Add user message
	addMessage({ role: 'user', content: userMessage });

	try {
		const requestMessages: AskRequestMessage[] = [
			...messages.map((message) => ({
				role: message.role,
				content: message.content,
			})),
			{ role: 'user', content: userMessage },
		];
		const requestBody: AskRequestBody = {
			messages: requestMessages,
			currentDirective: directive,
		};

		// Stream from SSE endpoint
		const res = await fetch('/api/ask', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody),
		});

		if (!res.ok) {
			let errorMessage = `Ask stream failed: ${res.status}`;
			try {
				const errorBody = (await res.json()) as { error?: string };
				if (typeof errorBody.error === 'string' && errorBody.error) {
					errorMessage = errorBody.error;
				}
			} catch {
				// Ignore JSON parse failures and use the HTTP status-based error.
			}
			throw new Error(errorMessage);
		}

		if (!res.body) {
			throw new Error('Ask stream failed: empty response body');
		}

		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let accText = '';
		let activeDirective: Directive = directive;
		let hasFinalized = false;

		const finalizeTurn = (reason: 'done' | 'error', errorMessage?: string) => {
			if (hasFinalized) {
				return;
			}
			hasFinalized = true;

			if (accText) {
				addMessage({ role: 'assistant', content: accText, directive: activeDirective });
			} else if (reason === 'error') {
				addMessage({
					role: 'assistant',
					content: errorMessage ?? 'Sorry, I encountered an error. Please try again.',
				});
			}

			const shouldClearClarify =
				userMessage.startsWith('[clarify:') &&
				(reason === 'done' || accText.length > 0 || activeDirective !== directive);
			if (shouldClearClarify) {
				setPendingClarify?.(undefined);
			}
		};

		const emitBlock = (block: string) => {
			const event = parseAskSseBlock(block);
			if (!event) {
				return;
			}

			switch (event.type) {
				case 'text':
					if (!event.delta) return;
					accText += event.delta;
					onTextDelta?.(event.delta);
					return;
				case 'directive':
					activeDirective = event.directive;
					setDirective(event.directive);
					return;
				case 'clarify':
					setPendingClarify?.(event.payload);
					return;
				case 'changeTheme':
					activeDirective = withDirectiveTheme(activeDirective, event.theme);
					setDirectiveTheme(event.theme);
					return;
				case 'error':
					console.warn('Ask stream error:', event.message);
					finalizeTurn('error', accText ? undefined : 'Sorry, the response was interrupted. Please try again.');
					return;
				case 'done':
					finalizeTurn(event.ok ? 'done' : 'error');
			}
		};

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			let idx;
			while ((idx = buffer.indexOf('\n\n')) !== -1) {
				const block = buffer.slice(0, idx).trim();
				buffer = buffer.slice(idx + 2);
				if (block) emitBlock(block);
			}
		}
		if (buffer.trim()) emitBlock(buffer.trim());
		finalizeTurn('done');
	} catch (error) {
		console.error('Error asking portfolio:', error);
		addMessage({
			role: 'assistant',
			content: 'Sorry, I encountered an error. Please try again.',
		});
	} finally {
		setLoading(false);
	}
}
