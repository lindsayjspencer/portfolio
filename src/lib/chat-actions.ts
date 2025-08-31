import type { DirectiveType } from './DirectiveTool';
import type { ChatMessage } from './PortfolioStore';
import type { ThemeName } from './themes';
import { Ask } from '~/app/actions/Ask';

export interface ChatSubmitParams {
	userMessage: string;
	messages: ChatMessage[];
	directive: DirectiveType;
	isLandingMode: boolean;
	
	// Store actions
	addMessage: (message: Omit<ChatMessage, 'id'>) => void;
	setDirective: (directive: DirectiveType) => void;
	setNarrative: (narrative: string | null) => void;
	setLoading: (loading: boolean) => void;
	
	// External actions
	setTheme: (theme: ThemeName) => void;
}

export async function handleChatSubmit(params: ChatSubmitParams): Promise<void> {
	const {
		userMessage,
		messages,
		directive,
		isLandingMode,
		addMessage,
		setDirective,
		setNarrative,
		setLoading,
		setTheme,
	} = params;

	setNarrative(null);
	setLoading(true);

	// Add user message
	addMessage({ role: 'user', content: userMessage });

	try {
		// Call our server action
		const result = await Ask(
			[
				...messages.map((m) => ({ role: m.role, content: m.content })),
				{ role: 'user', content: userMessage },
			],
			directive,
		);

		const { directive: directiveResult, text: narrationText, themeChanged, themeReason } = result;

		// Apply theme change if requested by LLM
		if (themeChanged && directiveResult?.theme) {
			console.log('🎨 Applying theme change from LLM:', directiveResult.theme);
			setTheme(directiveResult.theme as ThemeName);
		}

		if (directiveResult) {
			setDirective(directiveResult);
			if (narrationText) {
				setNarrative(narrationText);
				addMessage({
					role: 'assistant',
					content: narrationText + (themeReason ? ` (Theme: ${themeReason})` : ''),
					directive: directiveResult,
				});
			}
		} else {
			// Fallback if no directive was generated
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