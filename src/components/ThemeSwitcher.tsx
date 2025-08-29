'use client';

import { useTheme } from '~/contexts/theme-context';
import { type ThemeName } from '~/lib/themes';
import './ThemeSwitcher.scss';

export function ThemeSwitcher() {
	const { themeName, availableThemes, setTheme } = useTheme();

	const handleThemeChange = (newTheme: string) => {
		// Type-safe cast: we know the select options only contain valid theme names
		setTheme(newTheme as ThemeName);
	};

	return (
		<div className="theme-switcher">
			<label htmlFor="theme-select" className="theme-label">
				Theme
			</label>
			<select
				id="theme-select"
				value={themeName}
				onChange={(e) => handleThemeChange(e.target.value)}
				className="theme-select"
			>
				{availableThemes.map((theme) => (
					<option key={theme} value={theme}>
						{theme.charAt(0).toUpperCase() + theme.slice(1)}
					</option>
				))}
			</select>
		</div>
	);
}

// Simple theme preview component
export function ThemePreview() {
	const { themeColors } = useTheme();

	return (
		<div className="theme-preview">
			<div className="theme-color-swatch primary" title="Primary" />
			<div className="theme-color-swatch secondary" title="Secondary" />
			<div className="theme-color-swatch accent" title="Accent" />
			<div className="theme-color-swatch success" title="Success" />
			<div className="theme-color-swatch warning" title="Warning" />
			<div className="theme-color-swatch error" title="Error" />
		</div>
	);
}
