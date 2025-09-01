import type { ClarifyPayload } from './ai/clarifyTool';
import type { Directive } from './ai/directiveTools';
import type { ChatMessage } from './PortfolioStore';
import type { ThemeName } from './themes';
import { Ask } from '~/app/actions/Ask';

export interface ChatSubmitParams {
	userMessage: string;
	messages: ChatMessage[];
	directive: Directive;

	// Store actions
	addMessage: (message: Omit<ChatMessage, 'id'>) => void;
	setDirective: (directive: Directive) => void;
	setNarrative: (narrative: string | null) => void;
	setLoading: (loading: boolean) => void;
	setPendingClarify?: (payload: ClarifyPayload) => void;

	// External actions
	setTheme: (theme: ThemeName) => void;
}

const debugClarify: ClarifyPayload = {
	slot: 'lindsay_info_scope',
	question: "I'd love to tell you more about Lindsay! What aspect are you most interested in?",
	kind: 'choice',
	options: ['career progression', 'skills and expertise', 'project work', 'personal values'],
	multi: true,
};

export async function handleChatSubmit(params: ChatSubmitParams): Promise<void> {
	const {
		userMessage,
		messages,
		directive,
		addMessage,
		setDirective,
		setNarrative,
		setLoading,
		setPendingClarify,
		setTheme,
	} = params;

	setNarrative(null);
	setLoading(true);

	// Add user message
	addMessage({ role: 'user', content: userMessage });

	try {
		// Call our server action
		const result = await Ask(
			[...messages.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: userMessage }],
			directive,
		);

		const { directive: directiveResult, text: narrationText, themeChanged, clarify, responseType } = result;

		// Handle response based on type
		if (responseType === 'clarify' && clarify) {
			// Set pending clarify in store
			if (setPendingClarify) {
				setPendingClarify(clarify);
			}
			// Don't add a message for clarify, the UI will handle it
		} else if (responseType === 'directive' && directiveResult) {
			// Apply theme change if requested by LLM
			if (themeChanged && directiveResult.data.theme) {
				console.log('🎨 Applying theme change from LLM:', directiveResult.data.theme);
				setTheme(directiveResult.data.theme as ThemeName);
			}

			setDirective(directiveResult);
			if (narrationText) {
				setNarrative(narrationText);
				addMessage({
					role: 'assistant',
					content: narrationText,
					directive: directiveResult,
				});
			}
		} else {
			// Narration only or fallback
			if (narrationText) {
				setNarrative(narrationText);
			}
			addMessage({
				role: 'assistant',
				content:
					narrationText ||
					"I couldn't generate a proper response. Please try asking about my skills, projects, or career progression.",
			});
		}
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
