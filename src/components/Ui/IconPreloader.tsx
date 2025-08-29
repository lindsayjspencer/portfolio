'use client';

import React, { useEffect } from 'react';
import { useFontLoading } from '~/hooks/useFontLoading';
import { LoadingOverlay } from './LoadingOverlay';

const MATERIAL_FONT_FAMILIES = [
	'Material Symbols Outlined',
	'Material Symbols Rounded',
	'Material Symbols Sharp',
] as const;

export interface IconPreloaderProps {
	/** Children to render after fonts are loaded */
	children: React.ReactNode;
	/** Custom loading message */
	loadingMessage?: string;
	/** Callback when loading is complete */
	onLoadComplete?: () => void;
	/** Callback when loading fails */
	onLoadError?: (error: string) => void;
}

/**
 * Preloader component that shows a loading overlay until Material Icons fonts are ready
 * Wraps the main application content and ensures icons are loaded before showing UI
 */
export const IconPreloader: React.FC<IconPreloaderProps> = ({
	children,
	loadingMessage,
	onLoadComplete,
	onLoadError,
}) => {
	const { isLoading, isLoaded, hasError, loadedFonts } = useFontLoading(MATERIAL_FONT_FAMILIES);

	// Handle load completion
	useEffect(() => {
		if (isLoaded && !isLoading && onLoadComplete) {
			onLoadComplete();
		}
	}, [isLoaded, isLoading, onLoadComplete]);

	// Handle load errors
	useEffect(() => {
		if (hasError && !isLoading && onLoadError) {
			const errorMessage =
				loadedFonts.length > 0
					? `Some Material Icons fonts failed to load. Loaded: ${loadedFonts.join(', ')}`
					: 'Material Icons fonts failed to load';
			onLoadError(errorMessage);
		}
	}, [hasError, isLoading, loadedFonts, onLoadError]);

	// Log loading progress in development
	useEffect(() => {
		if (process.env.NODE_ENV === 'development') {
			console.log('📊 IconPreloader state:', { isLoading, isLoaded, hasError, loadedFonts });
			if (isLoading) {
				console.log('🔄 Loading Material Icons fonts...');
			} else if (isLoaded) {
				console.log('✅ Material Icons fonts loaded:', loadedFonts);
			} else if (hasError) {
				console.warn('❌ Material Icons fonts failed to load');
			}
		}
	}, [isLoading, isLoaded, hasError, loadedFonts]);

	// Show content if loading is complete OR if there's been enough time
	const showContent = !isLoading || isLoaded;

	return (
		<>
			{/* Loading overlay - shown while fonts are loading */}
			<LoadingOverlay isVisible={isLoading && !isLoaded} message={loadingMessage} />

			{/* Main content - always render but control visibility */}
			<div
				style={{
					opacity: showContent ? 1 : 0,
					transition: 'opacity 0.3s ease-in-out',
					pointerEvents: showContent ? 'auto' : 'none',
				}}
				aria-hidden={!showContent}
			>
				{showContent ? children : null}
			</div>
		</>
	);
};

export default IconPreloader;
