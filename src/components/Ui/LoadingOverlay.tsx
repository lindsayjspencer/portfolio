'use client';

import React from 'react';

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
	if (!isVisible) return null;

	return (
		<div
			className={`loading-overlay ${className}`}
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: 'rgb(255, 255, 255)',
				color: 'rgb(15, 23, 42)',
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
			<div
				aria-hidden="true"
				style={{
					width: '44px',
					height: '44px',
					borderRadius: '9999px',
					border: '4px solid rgba(37, 99, 235, 0.14)',
					borderTopColor: 'rgb(37, 99, 235)',
				}}
			/>

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
