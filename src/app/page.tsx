'use client';

import { ViewTransitionManager } from '~/components/ViewTransitionManager/ViewTransitionManager';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import type { DirectiveType } from '~/lib/DirectiveTool';
import './page.scss';
import { OptionsDropdown } from '~/components/OptionsDropdown';
import { ChatContainer } from '~/components/ChatContainer';
import { WelcomeMessage } from '~/components/WelcomeMessage';
import { SlidingPanel } from '~/components/Ui/SlidingPanel';

export default function HomePage() {
	const graph = usePortfolioStore((state) => state.graph);
	const directive = usePortfolioStore((state) => state.directive);
	const messages = usePortfolioStore((state) => state.messages);
	const setDirective = usePortfolioStore((state) => state.setDirective);

	const isLandingMode = directive.mode === 'landing';
	const hasHadInteraction = messages.length > 0;
	const landingMode = isLandingMode && !hasHadInteraction;

	// Debug: Handle directive mode changes
	const handleDebugModeChange = (mode: DirectiveType['mode']) => {
		const debugDirective: DirectiveType = {
			mode,
			highlights: [],
			narration: '',
		};
		setDirective(debugDirective);
	};

	// Simplified home page class
	const homePageClasses = 'home-page';

	return (
		<div className="home-page-wrapper">
			<div className={homePageClasses}>
				{/* Top nav bar with debug dropdown */}
				<OptionsDropdown
					currentMode={directive.mode}
					onModeChange={handleDebugModeChange}
					landingMode={landingMode}
				/>

				{/* Main view area */}
				<div className="view-container">
					<ViewTransitionManager currentMode={directive.mode} graph={graph} directive={directive} />
				</div>

				{/* Welcome message - manages its own visibility */}
				<WelcomeMessage landingMode={landingMode} />

				{/* Floating chat input at bottom */}
				<ChatContainer 
					isLandingMode={isLandingMode} 
					hasHadInteraction={hasHadInteraction} 
					landingMode={landingMode}
				/>

			</div>
			<SlidingPanel />
		</div>
	);
}
