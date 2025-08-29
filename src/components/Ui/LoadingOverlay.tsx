'use client';

import React from 'react';
import { Spinner } from './Spinner';
import { useComponentColor } from '~/hooks/UseComponentColor';

export interface LoadingOverlayProps {
	/** Whether the overlay is visible */
	isVisible: boolean;
	/** Loading message to display */
	message?: string;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Full-screen loading overlay that covers all content
 * Used during Material Icons font loading
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, message, className = '' }) => {
	const backgroundColor = useComponentColor('background');
	const textColor = useComponentColor('text');

	if (!isVisible) return null;

	// Fallback colors in case theme isn't ready yet
	const bgColor = backgroundColor || 'rgb(255, 255, 255)';
	const fgColor = textColor || 'rgb(0, 0, 0)';

	return (
		<div
			className={`loading-overlay ${className}`}
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: bgColor,
				color: fgColor,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '1rem',
				zIndex: 9999,
				opacity: 1,
				transition: 'opacity 0.3s ease-in-out',
				fontFamily: 'system-ui, -apple-system, sans-serif',
			}}
			aria-live="polite"
			aria-label="Loading application"
			role="dialog"
		>
			{/* Loading spinner */}
			<div>
				<Spinner size="lg" color="primary-500" aria-label="Loading spinner" />
			</div>

			{/* Loading message */}
			{message !== undefined ? (
				<div
					style={{
						fontSize: '1.125rem',
						fontWeight: 400,
						textAlign: 'center',
						maxWidth: '300px',
						lineHeight: 1.5,
					}}
				>
					{message}
				</div>
			) : null}
		</div>
	);
};

export default LoadingOverlay;
