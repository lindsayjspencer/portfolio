'use client';

import { ViewTransitionManager } from '~/components/ViewTransitionManager/ViewTransitionManager';
import './page.scss';
import { OptionsDropdown } from '~/components/OptionsDropdown';
import { ChatContainer } from '~/components/ChatContainer';
import { WelcomeMessage } from '~/components/WelcomeMessage';
import { SuggestionChips } from '~/components/SuggestionChips';
import { SlidingPanel } from '~/components/Ui/SlidingPanel';
import { UrlStateInitializer } from '~/components/AppPreloader/UrlStateInitializer';
import { UrlStateLogger } from '~/components/AppPreloader/UrlStateLogger';
import { UrlStateSync } from '~/components/AppPreloader/UrlStateSync';
import { useState } from 'react';
import { PortfolioStoreProvider } from '~/lib/PortfolioStoreProvider';
import type { Directive } from '~/lib/ai/directiveTools';

export default function HomePage() {
	const [initialDirective, setInitialDirective] = useState<Directive | null>(null);

	if (!initialDirective) {
		return (
			<>
				<UrlStateInitializer onReady={setInitialDirective} />
			</>
		);
	}

	return (
		<PortfolioStoreProvider initialDirective={initialDirective}>
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
		</PortfolioStoreProvider>
	);
}
