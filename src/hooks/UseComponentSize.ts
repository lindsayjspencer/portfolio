'use client';

export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | number;

// Size mapping for consistent sizing across components
const sizeMap: Record<Exclude<ComponentSize, number>, string> = {
	xs: '16px',
	sm: '20px',
	md: '24px',
	lg: '28px',
	xl: '32px',
	'2xl': '40px',
	'3xl': '48px',
};

/**
 * Hook for converting size variants to pixel values
 * @param size - Size variant string or number in pixels
 * @returns CSS-compatible size value (e.g., "24px")
 */
export function useComponentSize(size: ComponentSize = 'md'): string {
	return typeof size === 'number' ? `${size}px` : sizeMap[size];
}