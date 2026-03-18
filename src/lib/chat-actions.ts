import type { ClarifyPayload } from './ai/clarifyTool';
import type { Directive } from './ai/directiveTools';
import type { ChatMessage } from './PortfolioStore';
import type { ThemeName } from './themes';

export interface ChatSubmitParams {
	userMessage: string;
	messages: ChatMessage[];
	directive: Directive;

	// Store actions
	addMessage: (message: Omit<ChatMessage, 'id'>) => void;
	setDirective: (directive: Directive) => void;
	// setNarrative removed; narration is streamed as assistant messages only
	setLoading: (loading: boolean) => void;
	setPendingClarify?: (payload: ClarifyPayload | undefined) => void;

	// External actions
	setTheme: (theme: ThemeName) => void;
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
		setLoading,
		setPendingClarify,
		setTheme,
		onTextDelta,
	} = params;

	// Begin request
	setLoading(true);

	// Add user message
	addMessage({ role: 'user', content: userMessage });

	try {
		// Stream from SSE endpoint
		const res = await fetch('/api/ask', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
					...messages.map((m) => ({ role: m.role, content: m.content })),
					{ role: 'user', content: userMessage },
				],
				currentDirective: directive,
			}),
		});

		if (!res.ok || !res.body) throw new Error(`Ask stream failed: ${res.status}`);

		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let accText = '';
		let lastDirective: Directive | null = null;
		let sawClarify = false;

		const emitBlock = (block: string) => {
			// Expect blocks like:
			// event: type\n
			// data: { ... }\n
			// [optional more data: lines]\n
			//\n
			// We support multi-line data by concatenating data: lines with newlines.

			let eventType = '';
			const dataParts: string[] = [];
			const lines = block.split(/\n/);
			for (const line of lines) {
				if (line.startsWith('event:')) eventType = line.slice(6).trim();
				else if (line.startsWith('data:')) dataParts.push(line.slice(5));
			}
			const dataLine = dataParts.join('\n').trim();
			if (!eventType) return;
			if (eventType === 'text') {
				try {
					const { delta } = JSON.parse(dataLine);
					if (typeof delta === 'string' && delta) {
						accText += delta;
						onTextDelta?.(delta);
					}
				} catch {}
			} else if (eventType === 'directive') {
				try {
					const d = JSON.parse(dataLine) as Directive;
					lastDirective = d;
					setDirective(d);
				} catch {}
			} else if (eventType === 'clarify') {
				sawClarify = true;
				try {
					const payload = JSON.parse(dataLine) as ClarifyPayload;
					setPendingClarify?.(payload);
				} catch {}
			} else if (eventType === 'changeTheme') {
				try {
					const { theme } = JSON.parse(dataLine) as { theme: ThemeName };
					if (theme) setTheme(theme);
				} catch {}
			} else if (eventType === 'error') {
				// Soft surface
				console.warn('Ask stream error:', dataLine);
			} else if (eventType === 'done') {
				// Finalize: append assistant message with accumulated text (including clarify question turns)
				if (accText) {
					const target = lastDirective ?? directive;
					addMessage({ role: 'assistant', content: accText, directive: target });
				}
				// If this turn was a user reply to a clarify prompt, clear pendingClarify now
				if (userMessage.startsWith('[clarify:')) {
					setPendingClarify?.(undefined);
				}
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
