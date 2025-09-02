'use client';

import { useState, useEffect } from 'react';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import './WelcomeMessage.scss';

export function WelcomeMessage() {
	const directive = usePortfolioStore((state) => state.directive);
	const messages = usePortfolioStore((state) => state.messages);
	const hasHadInteraction = messages.length > 0;
	const landingMode = directive.mode === 'landing' && !hasHadInteraction;
	const [shouldRender, setShouldRender] = useState(landingMode);
	const [isAnimating, setIsAnimating] = useState(false);

	useEffect(() => {
		if (landingMode) {
			// Entering landing mode - show component
			setShouldRender(true);
			setIsAnimating(false);
		} else if (shouldRender && !isAnimating) {
			// Exiting landing mode - start exit animation
			setIsAnimating(true);
			// Wait for animation to complete before hiding
			const timer = setTimeout(() => {
				setShouldRender(false);
				setIsAnimating(false);
			}, 400); // matches animation duration

			return () => {
				clearTimeout(timer);
			};
		}
	}, [landingMode, shouldRender]);

	if (!shouldRender) {
		return null;
	}

	const className = `welcome-message ${landingMode ? 'landing-mode' : 'exiting'}`;

	return (
		<div className={className}>
			<div className="name">Lindsay Spencer</div>
			<div className="job-title">Senior Full Stack Engineer</div>
		</div>
	);
}
