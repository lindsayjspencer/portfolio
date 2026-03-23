import { describe, expect, it, beforeAll, afterAll, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '~/contexts/theme-context';
import { PortfolioStoreContext, createPortfolioStore, usePortfolioStore, type ChatMessage } from '~/lib/PortfolioStore';
import { createDefaultLandingDirective, getDirectiveVariant } from '~/lib/ai/directiveTools';
import { ChatContainer } from './ChatContainer';

class ResizeObserverStub {
	observe() {}
	disconnect() {}
	unobserve() {}
}

function DirectiveProbe() {
	const directive = usePortfolioStore((state) => state.directive);
	const highlights = 'highlights' in directive.data ? directive.data.highlights.join(',') : '';

	return (
		<>
			<div data-testid="directive-mode">{directive.mode}</div>
			<div data-testid="directive-variant">{getDirectiveVariant(directive) ?? ''}</div>
			<div data-testid="directive-highlights">{highlights}</div>
		</>
	);
}

function renderWithStore({
	messages = [],
	streamedText = '',
	isLoading = false,
}: {
	messages?: ChatMessage[];
	streamedText?: string;
	isLoading?: boolean;
}) {
	const store = createPortfolioStore(createDefaultLandingDirective());
	store.setState({
		messages,
		streamedText,
		isLoading,
	});

	return render(
		<PortfolioStoreContext.Provider value={store}>
			<ThemeProvider>
				<>
					<ChatContainer />
					<DirectiveProbe />
				</>
			</ThemeProvider>
		</PortfolioStoreContext.Provider>,
	);
}

beforeAll(() => {
	(globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver =
		ResizeObserverStub as unknown as typeof ResizeObserver;
});

afterAll(() => {
	delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
});

afterEach(() => {
	cleanup();
});

describe('ChatContainer', () => {
	it('renders streamed narration with normalized line breaks and no inline tree-stream nodes', () => {
		const { container } = renderWithStore({
			streamedText: 'First\\n\\nSecond',
			isLoading: true,
		});

		const streamingText = container.querySelector('.streaming-text');
		expect(streamingText?.textContent).toBe('First\n\nSecond');
		expect(streamingText?.textContent).not.toContain('\\n');
		expect(streamingText?.querySelector('[data-tree-stream]')).toBeNull();
	});

	it('turns completed project links into clickable directives even when the id slot uses a known label', () => {
		renderWithStore({
			messages: [
				{
					id: 'assistant-1',
					role: 'assistant',
					content: 'See <project:Codebots Platform>Codebots Platform</project>',
				},
			],
		});

		fireEvent.click(screen.getByRole('link', { name: 'Codebots Platform' }));

		expect(screen.getByTestId('directive-mode').textContent).toBe('projects');
		expect(screen.getByTestId('directive-variant').textContent).toBe('case-study');
		expect(screen.getByTestId('directive-highlights').textContent).toBe('proj_codebots_modeler');
	});
});
