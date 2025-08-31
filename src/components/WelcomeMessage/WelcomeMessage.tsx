'use client';

import { useState, useEffect } from 'react';
import './WelcomeMessage.scss';

export interface WelcomeMessageProps {
	landingMode: boolean;
}

export function WelcomeMessage({ landingMode }: WelcomeMessageProps) {
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
			
			return () => clearTimeout(timer);
		}
	}, [landingMode, shouldRender, isAnimating]);

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