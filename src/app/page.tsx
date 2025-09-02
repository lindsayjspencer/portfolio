'use client';

import { ViewTransitionManager } from '~/components/ViewTransitionManager/ViewTransitionManager';
import './page.scss';
import { OptionsDropdown } from '~/components/OptionsDropdown';
import { ChatContainer } from '~/components/ChatContainer';
import { WelcomeMessage } from '~/components/WelcomeMessage';
import { SlidingPanel } from '~/components/Ui/SlidingPanel';

export default function HomePage() {
	return (
		<div className="home-page-wrapper">
			<div className="home-page">
				{/* Top nav bar with debug dropdown */}
				<OptionsDropdown />

				{/* Main view area */}
				<div className="view-container">
					<ViewTransitionManager />
				</div>

				{/* Welcome message - manages its own visibility */}
				<WelcomeMessage />

				{/* Floating chat input at bottom */}
				<ChatContainer />
			</div>
			<SlidingPanel />
		</div>
	);
}
