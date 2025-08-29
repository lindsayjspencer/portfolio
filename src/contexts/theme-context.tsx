'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { themes, type ThemeName, type SemanticColors, type ColorVariation, type SemanticColor } from '~/lib/themes';

interface ThemeContextType {
	themeName: ThemeName;
	themeColors: SemanticColors;
	setTheme: (theme: ThemeName) => void;
	availableThemes: ThemeName[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
	children: ReactNode;
	initialTheme?: ThemeName;
	serverTheme?: ThemeName;
}

export function ThemeProvider({ children, initialTheme = 'cold', serverTheme }: ThemeProviderProps) {
	// Use server theme if provided, otherwise use initial theme
	const defaultTheme = serverTheme || initialTheme;
	const [themeName, setThemeName] = useState<ThemeName>(defaultTheme);

	// Update document className when theme changes
	useEffect(() => {
		if (typeof document !== 'undefined') {
			// Remove any existing theme classes
			const existingThemeClasses = Array.from(document.documentElement.classList).filter((className) =>
				className.startsWith('theme-'),
			);

			existingThemeClasses.forEach((className) => {
				document.documentElement.classList.remove(className);
			});

			// Add new theme class
			document.documentElement.classList.add(`theme-${themeName}`);
		}
	}, [themeName]);

	const setTheme = (newTheme: ThemeName) => {
		setThemeName(newTheme);

		// Optional: Persist to localStorage for client-side persistence
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('preferred-theme', newTheme);
		}
	};

	// Function to check for server-side theme changes
	const checkServerTheme = async () => {
		try {
			const response = await fetch('/api/theme', {
				method: 'GET',
				cache: 'no-store',
			});
			if (response.ok) {
				const { theme } = await response.json();
				if (theme && theme !== themeName) {
					setThemeName(theme);
				}
			}
		} catch (error) {
			// Silently handle errors
		}
	};

	const value: ThemeContextType = {
		themeName,
		themeColors: themes[themeName],
		setTheme,
		availableThemes: Object.keys(themes) as ThemeName[],
	};

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}

// Hook for getting theme colors directly
export function useThemeColors() {
	const { themeColors } = useTheme();
	return themeColors;
}

// Hook for getting a specific color variation
export function useThemeColor(role: SemanticColor, shade: ColorVariation = '500') {
	const { themeColors } = useTheme();
	return themeColors[role][shade];
}
