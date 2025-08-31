'use client';

import { ViewTransitionManager } from '~/components/ViewTransitionManager/ViewTransitionManager';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import type { DirectiveType } from '~/lib/DirectiveTool';
import './page.scss';
import { OptionsDropdown } from '~/components/OptionsDropdown';
import { ChatContainer } from '~/components/ChatContainer';
import { SlidingPanel } from '~/components/Ui/SlidingPanel';

export default function HomePage() {
	const graph = usePortfolioStore((state) => state.graph);
	const directive = usePortfolioStore((state) => state.directive);
	const messages = usePortfolioStore((state) => state.messages);
	const isTransitioningFromLanding = usePortfolioStore((state) => state.isTransitioningFromLanding);
	const setDirective = usePortfolioStore((state) => state.setDirective);

	const isLandingMode = directive.mode === 'landing';
	const hasHadInteraction = messages.length > 0;

	// Debug: Handle directive mode changes
	const handleDebugModeChange = (mode: DirectiveType['mode']) => {
		const debugDirective: DirectiveType = {
			mode,
			highlights: [],
			narration: '',
		};
		setDirective(debugDirective);
	};

	// Generate home page CSS classes
	const homePageClasses = [
		'home-page',
		isLandingMode && !hasHadInteraction ? 'landing-mode' : '',
		isTransitioningFromLanding ? 'transitioning-from-landing' : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className="home-page-wrapper">
			<div className={homePageClasses}>
				{/* Top nav bar with debug dropdown - only visible when not in landing mode */}
				<OptionsDropdown
					currentMode={directive.mode}
					onModeChange={handleDebugModeChange}
					isVisible={true} //{!isLandingMode || hasHadInteraction}
				/>

				{/* Main view area */}
				<div className="view-container">
					<ViewTransitionManager currentMode={directive.mode} graph={graph} directive={directive} />
				</div>

				{/* Welcome message for landing mode */}
				{isLandingMode && !hasHadInteraction && (
					<div className="welcome-message">
					<div className="name">Lindsay Spencer</div>
					<div className="job-title">
							Senior Full Stack Engineer
						</div>
					</div>
				)}

				{/* Floating chat input at bottom */}
				<ChatContainer isLandingMode={isLandingMode} hasHadInteraction={hasHadInteraction} />

			</div>
			<SlidingPanel />
		</div>
	);
}
