'use client';

import { ViewTransitionManager } from '~/components/ViewTransitionManager/ViewTransitionManager';
import { OptionsDropdown } from '~/components/OptionsDropdown';
import { ChatContainer } from '~/components/ChatContainer';
import { WelcomeMessage } from '~/components/WelcomeMessage';
import { SuggestionChips } from '~/components/SuggestionChips';
import { SlidingPanel } from '~/components/Ui/SlidingPanel';
import { UrlStateLogger } from '~/components/AppPreloader/UrlStateLogger';
import { UrlStateSync } from '~/components/AppPreloader/UrlStateSync';
import { ThemeProvider } from '~/contexts/theme-context';
import { PortfolioStoreProvider } from '~/lib/PortfolioStoreProvider';
import type { Directive } from '~/lib/ai/directiveTools';

type HomePageClientProps = {
	initialDirective: Directive;
};

export function HomePageClient({ initialDirective }: HomePageClientProps) {
	return (
		<PortfolioStoreProvider initialDirective={initialDirective}>
			<ThemeProvider>
				<div className="home-page-wrapper">
					{/* Dev-only logger */}
					<UrlStateLogger />
					{/* Sync store <-> URL and handle back/forward */}
					<UrlStateSync />
					<div className="home-page">
						{/* Top nav bar with debug dropdown */}
						<OptionsDropdown />

						{/* Main view area */}
						<div className="view-container">
							<ViewTransitionManager />
						</div>

						{/* Welcome message - manages its own visibility */}
						<WelcomeMessage />

						{/* Suggestion chips - only visible in landing mode */}
						<SuggestionChips />

						{/* Floating chat input at bottom */}
						<ChatContainer />
					</div>
					<SlidingPanel />
				</div>
			</ThemeProvider>
		</PortfolioStoreProvider>
	);
}
