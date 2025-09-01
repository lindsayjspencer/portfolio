'use client';

import { ViewTransitionManager } from '~/components/ViewTransitionManager/ViewTransitionManager';
import { usePortfolioStore } from '~/lib/PortfolioStore';
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

	const hasHadInteraction = messages.length > 0;
	const landingMode = directive.mode === 'landing' && !hasHadInteraction;

	// Simplified home page class
	const homePageClasses = 'home-page';

	return (
		<div className="home-page-wrapper">
			<div className={homePageClasses}>
				{/* Top nav bar with debug dropdown */}
				<OptionsDropdown
					currentDirective={directive}
					onDirectiveChange={(directive) => {
						setDirective(directive);
					}}
					landingMode={false}
				/>

				{/* Main view area */}
				<div className="view-container">
					<ViewTransitionManager directive={directive} graph={graph} />
				</div>

				{/* Welcome message - manages its own visibility */}
				<WelcomeMessage landingMode={landingMode} />

				{/* Floating chat input at bottom */}
				<ChatContainer hasHadInteraction={hasHadInteraction} landingMode={landingMode} />
			</div>
			<SlidingPanel />
		</div>
	);
}
