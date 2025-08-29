'use client';

import { useTheme } from '~/contexts/theme-context';
import { type ColorVariation, type SemanticColor } from '~/lib/themes';

// Theme color keys
export type ThemeColor = `${SemanticColor}-${ColorVariation}`;

/**
 * Hook for resolving theme colors to CSS color values
 * @param color - Theme color key (e.g., "primary-500") or direct CSS color value
 * @returns Resolved CSS color value
 */
export function useComponentColor(color?: ThemeColor | string): string | undefined {
	const { themeColors } = useTheme();
	
	if (!color) return undefined;
	
	// If color contains a dash, treat as theme color
	if (color.includes('-')) {
		const [semanticColor, variation] = color.split('-') as [SemanticColor, ColorVariation];
		if (themeColors && themeColors[semanticColor]) {
			const colorGroup = themeColors[semanticColor];
			return colorGroup[variation];
		}
	}
	
	// Return as-is (direct CSS color)
	return color;
}