#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { colord, extend } from 'colord';
import mixPlugin from 'colord/plugins/mix';

extend([mixPlugin]);

// TypeScript interfaces for configuration
interface ThemeColors {
	primary: string;
	secondary: string;
	accent: string;
	neutral: string;
	success: string;
	warning: string;
	error: string;
}

interface ColorVariation {
	50: string;
	100: string;
	200: string;
	300: string;
	400: string;
	500: string;
	600: string;
	700: string;
	800: string;
	900: string;
}

interface SemanticColors {
	primary: ColorVariation;
	secondary: ColorVariation;
	accent: ColorVariation;
	neutral: ColorVariation;
	success: ColorVariation;
	warning: ColorVariation;
	error: ColorVariation;
}

interface ThemeConfig {
	themes: Record<string, ThemeColors>;
	output: {
		typescript?: string;
		scss?: string;
	};
}

interface GeneratedThemes {
	[themeName: string]: SemanticColors;
}

// Parse command line arguments
const args = process.argv.slice(2);
const configFile = args[0] || './theme-config.json';

if (args.includes('--help') || args.includes('-h')) {
	console.log(`
Theme Generator

Usage: tsx generate-themes.ts [config-file]

Options:
  -h, --help     Show this help message
  
Config file format (JSON):
{
  "themes": {
    "cold": {
      "primary": "#2563eb",
      "secondary": "#0891b2", 
      "accent": "#06b6d4",
      "neutral": "#6b7280",
      "success": "#10b981",
      "warning": "#f59e0b",
      "error": "#ef4444"
    },
    "corporate": {
      "primary": "#1f2937",
      "secondary": "#374151",
      "accent": "#4f46e5",
      "neutral": "#6b7280",
      "success": "#059669",
      "warning": "#d97706",
      "error": "#dc2626"
    }
  },
  "output": {
    "typescript": "./src/lib/themes.ts",
    "scss": "./src/styles/themes.scss"
  }
}

Each theme color should be the 500-level base color (medium shade).
The script will generate variations from 50 (lightest) to 900 (darkest).
  `);
	process.exit(0);
}

// Helper function to generate color variations
function generateColorVariations(baseColor: string): ColorVariation {
	try {
		const color = colord(baseColor);

		// Validate that the color is valid
		if (!color.isValid()) {
			throw new Error(`Invalid color: ${baseColor}`);
		}

		// Generate tints (lighter) and shades (darker)
		const variations: ColorVariation = {
			// 50-400: progressively lighter (tints)
			50: color.mix('#ffffff', 0.95).toHex(),
			100: color.mix('#ffffff', 0.9).toHex(),
			200: color.mix('#ffffff', 0.75).toHex(),
			300: color.mix('#ffffff', 0.6).toHex(),
			400: color.mix('#ffffff', 0.3).toHex(),

			// 500: base color
			500: color.toHex(),

			// 600-900: progressively darker (shades)
			600: color.mix('#000000', 0.2).toHex(),
			700: color.mix('#000000', 0.4).toHex(),
			800: color.mix('#000000', 0.6).toHex(),
			900: color.mix('#000000', 0.8).toHex(),
		};

		return variations;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to generate color variations for ${baseColor}: ${errorMessage}`);
	}
}

// Load configuration
try {
	console.log(`Loading configuration from: ${configFile}`);

	if (!fs.existsSync(configFile)) {
		console.error(`Configuration file not found: ${configFile}`);
		console.log('Run with --help for usage information');
		process.exit(1);
	}

	let config: ThemeConfig;
	try {
		const configContent = fs.readFileSync(configFile, 'utf8');
		config = JSON.parse(configContent) as ThemeConfig;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`Failed to parse configuration file: ${errorMessage}`);
		console.log('Please ensure the file contains valid JSON');
		process.exit(1);
	}

	// Validate configuration structure
	if (!config.themes || typeof config.themes !== 'object') {
		console.error('Invalid configuration: missing or invalid "themes" section');
		process.exit(1);
	}

	if (!config.output || typeof config.output !== 'object') {
		console.error('Invalid configuration: missing or invalid "output" section');
		process.exit(1);
	}

	// Validate that we have at least one theme
	if (Object.keys(config.themes).length === 0) {
		console.error('Invalid configuration: no themes defined');
		process.exit(1);
	}

	// Validate semantic color roles for each theme
	const requiredColors: (keyof ThemeColors)[] = [
		'primary',
		'secondary',
		'accent',
		'neutral',
		'success',
		'warning',
		'error',
	];
	for (const [themeName, colors] of Object.entries(config.themes)) {
		if (!colors || typeof colors !== 'object') {
			console.error(`Invalid theme "${themeName}": theme must be an object`);
			process.exit(1);
		}

		for (const requiredColor of requiredColors) {
			if (!colors[requiredColor]) {
				console.error(`Invalid theme "${themeName}": missing required color "${requiredColor}"`);
				process.exit(1);
			}
		}
	}

	console.log('Generating color variations...');

	// Generate themes with color variations
	const generatedThemes: GeneratedThemes = {};

	for (const [themeName, colors] of Object.entries(config.themes)) {
		console.log(`Processing theme: ${themeName}`);
		generatedThemes[themeName] = {} as SemanticColors;

		for (const [colorRole, baseColor] of Object.entries(colors)) {
			try {
				generatedThemes[themeName][colorRole as keyof SemanticColors] = generateColorVariations(baseColor);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error(`Error processing color "${colorRole}" in theme "${themeName}": ${errorMessage}`);
				process.exit(1);
			}
		}
	}

	// Generate TypeScript file
	if (config.output.typescript) {
		console.log(`Generating TypeScript file: ${config.output.typescript}`);

		const themeNames = Object.keys(generatedThemes);
		const tsContent = `// Auto-generated theme file - DO NOT EDIT MANUALLY
// Generated on ${new Date().toISOString()}

export type ColorVariation = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

export type ColorVariations = Record<ColorVariation, string>;

export type SemanticColor = 'primary' | 'secondary' | 'accent' | 'neutral' | 'success' | 'warning' | 'error';

export type SemanticColors = Record<SemanticColor, ColorVariations>;

export type ThemeName = ${themeNames.map((name) => `'${name}'`).join(' | ')};

export type Theme = {
  name: ThemeName;
  colors: SemanticColors;
};

export const themes: Record<ThemeName, SemanticColors> = ${JSON.stringify(generatedThemes, null, 2)};

export function getTheme(name: ThemeName): SemanticColors {
  return themes[name];
}

export function getThemeNames(): ThemeName[] {
  return Object.keys(themes) as ThemeName[];
}
`;

		// Ensure output directory exists
		const tsDir = path.dirname(config.output.typescript);
		if (!fs.existsSync(tsDir)) {
			fs.mkdirSync(tsDir, { recursive: true });
		}

		fs.writeFileSync(config.output.typescript, tsContent);
	}

	// Generate SCSS file
	if (config.output.scss) {
		console.log(`Generating SCSS file: ${config.output.scss}`);

		let scssContent = `// Auto-generated theme file - DO NOT EDIT MANUALLY
// Generated on ${new Date().toISOString()}

// Base theme variables (default to first theme)
`;

		// Generate CSS custom properties for each theme
		for (const [themeName, colors] of Object.entries(generatedThemes)) {
			scssContent += `
.theme-${themeName} {
`;

			for (const [colorRole, variations] of Object.entries(colors)) {
				for (const [shade, hex] of Object.entries(variations)) {
					scssContent += `  --color-${colorRole}-${shade}: ${hex};
`;
				}
			}

			scssContent += `}
`;
		}

		// Add utility mixins and classes
		scssContent += `
// Utility mixin to use theme colors
@mixin theme-color($property, $role, $shade: 500) {
  #{$property}: var(--color-#{$role}-#{$shade});
}

// Example utility classes
.text-primary { @include theme-color(color, primary); }
.text-secondary { @include theme-color(color, secondary); }
.text-accent { @include theme-color(color, accent); }
.text-neutral { @include theme-color(color, neutral); }
.text-success { @include theme-color(color, success); }
.text-warning { @include theme-color(color, warning); }
.text-error { @include theme-color(color, error); }

.bg-primary { @include theme-color(background-color, primary); }
.bg-secondary { @include theme-color(background-color, secondary); }
.bg-accent { @include theme-color(background-color, accent); }
.bg-neutral { @include theme-color(background-color, neutral); }
.bg-success { @include theme-color(background-color, success); }
.bg-warning { @include theme-color(background-color, warning); }
.bg-error { @include theme-color(background-color, error); }
`;

		// Ensure output directory exists
		const scssDir = path.dirname(config.output.scss);
		if (!fs.existsSync(scssDir)) {
			fs.mkdirSync(scssDir, { recursive: true });
		}

		fs.writeFileSync(config.output.scss, scssContent);
	}

	console.log('✅ Theme generation completed successfully!');
	console.log(`Generated ${Object.keys(generatedThemes).length} themes:`);
	Object.keys(generatedThemes).forEach((name) => {
		console.log(`  - ${name}`);
	});
} catch (error) {
	const errorMessage = error instanceof Error ? error.message : String(error);
	console.error('❌ Error generating themes:', errorMessage);
	process.exit(1);
}
