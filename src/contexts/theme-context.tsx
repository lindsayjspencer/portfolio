'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { themes, type ThemeName, type SemanticColors } from '~/lib/themes';
import { usePortfolioStore } from '~/lib/PortfolioStore';

interface ThemeContextType {
	themeName: ThemeName;
	themeColors: SemanticColors;
	setTheme: (theme: ThemeName) => void;
	availableThemes: ThemeName[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
	children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
	const themeName = usePortfolioStore((state) => state.directive.theme);
	const setTheme = usePortfolioStore((state) => state.setDirectiveTheme);

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
