import type { useTheme } from '~/contexts/theme-context';
import type { ExtendedNodeObject, ForceDirectedGraphNode } from './Common';

// Type definitions for drawing utilities
interface GraphNodeThemeSet {
	// Main background and borders
	nodeBackground: string;
	nodeBorder: string;
	nodeLeftBorder: string;
	nodeText: string;

	// Left resource type indicator
	resourceIndicatorColor: string;
	resourceIndicatorIcon: string;
	resourceTypeIconColor: string;

	// Version badge
	versionBackground: string;
	versionBorder: string;
	versionText: string;

	// Error icon
	errorIconColor: string;

	// Selection state
	selectedBackground: string;
	selectedBorder: string;
	selectedLeftBorder: string;
	selectedShadowColor: string;
}

interface CustomNodeSettings {
	node: ExtendedNodeObject;
	themeColors: ReturnType<typeof useTheme>['themeColors'];
	isHovered: boolean;
	isSelected: boolean;
}

// Internal types for shared functionality
interface NodeDimensions {
	scale: (value: number) => number;
	cornerRadius: number;
	padding: number;
	iconSize: number;
	outlineWidth: number;
	leftBorderWidth: number;
}

interface NodeLayout {
	x: number;
	y: number;
	totalWidth: number;
	height: number;
	textStartX: number;
	iconX: number;
	iconY: number;
}

export class DrawingUtils {
	/**
	 * Calculates common node dimensions based on global scale and selection state
	 */
	private static calculateNodeDimensions(globalScale: number, isSelected: boolean): NodeDimensions {
		const scale = (value: number) => value / globalScale;
		return {
			scale,
			cornerRadius: scale(6),
			padding: scale(8),
			iconSize: scale(16),
			outlineWidth: scale(isSelected ? 2 : 1.5),
			leftBorderWidth: scale(6),
		};
	}

	/**
	 * Applies shadow effects based on node state
	 */
	private static applyShadow(
		ctx: CanvasRenderingContext2D,
		isSelected: boolean,
		isHighlighted: boolean,
		selectedShadowColor: string,
	) {
		if (isSelected) {
			ctx.shadowColor = selectedShadowColor;
			ctx.shadowOffsetX = 5;
			ctx.shadowOffsetY = 5;
			ctx.shadowBlur = 10;
		} else if (isHighlighted) {
			ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
			ctx.shadowOffsetX = 3;
			ctx.shadowOffsetY = 3;
			ctx.shadowBlur = 8;
		}
	}

	/**
	 * Clears shadow effects
	 */
	private static clearShadow(ctx: CanvasRenderingContext2D, isSelected: boolean, isHighlighted: boolean) {
		if (isSelected || isHighlighted) {
			ctx.shadowColor = 'transparent';
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = 0;
		}
	}

	/**
	 * Draws the main node background and border
	 */
	private static drawNodeBackground(
		ctx: CanvasRenderingContext2D,
		layout: NodeLayout,
		dimensions: NodeDimensions,
		style: GraphNodeThemeSet,
		isSelected: boolean,
		isHighlighted: boolean,
	) {
		const { x, y, totalWidth, height } = layout;
		const { cornerRadius, outlineWidth } = dimensions;

		// Set fill and stroke styles
		ctx.fillStyle = style.nodeBackground;
		ctx.strokeStyle = style.nodeBorder;
		ctx.lineWidth = outlineWidth;

		// Apply shadow
		DrawingUtils.applyShadow(ctx, isSelected, isHighlighted, style.selectedShadowColor);

		// Draw background
		DrawingUtils.drawRoundRect(ctx, x - totalWidth / 2, y - height / 2, totalWidth, height, cornerRadius);
		ctx.fill();

		// Clear shadow before stroke
		DrawingUtils.clearShadow(ctx, isSelected, isHighlighted);

		// Draw border
		ctx.stroke();
	}

	/**
	 * Draws the colored left border
	 */
	private static drawLeftBorder(
		ctx: CanvasRenderingContext2D,
		layout: NodeLayout,
		dimensions: NodeDimensions,
		leftBorderColor: string,
	) {
		const { x, y, totalWidth, height } = layout;
		const { cornerRadius, leftBorderWidth } = dimensions;

		ctx.fillStyle = leftBorderColor;
		DrawingUtils.drawRoundRect(ctx, x - totalWidth / 2, y - height / 2, leftBorderWidth, height, {
			tl: cornerRadius,
			tr: 0,
			br: 0,
			bl: cornerRadius,
		});
		ctx.fill();
	}

	/**
	 * Draws the node icon
	 */
	private static drawNodeIcon(
		ctx: CanvasRenderingContext2D,
		layout: NodeLayout,
		dimensions: NodeDimensions,
		iconColor: string,
		iconName: string,
	) {
		const { iconX, iconY } = layout;
		const { iconSize } = dimensions;
		DrawingUtils.drawMaterialIcon(ctx, iconX, iconY, iconSize, iconColor, iconName);
	}

	/**
	 * Sets up text rendering context and returns text positioning
	 */
	private static setupTextRendering(ctx: CanvasRenderingContext2D): void {
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
	}

	/**
	 * Creates a complete node layout object with all positioning calculations
	 */
	private static createNodeLayout(
		x: number,
		y: number,
		totalWidth: number,
		height: number,
		dimensions: NodeDimensions,
	): NodeLayout {
		const { padding, iconSize, leftBorderWidth } = dimensions;

		return {
			x,
			y,
			totalWidth,
			height,
			textStartX: x - totalWidth / 2 + padding + iconSize + padding,
			iconX: leftBorderWidth / 2 + x - totalWidth / 2 + padding + iconSize / 2,
			iconY: y,
		};
	}

	/**
	 * Draws a rounded rectangle on the canvas
	 */
	static drawRoundRect(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		width: number,
		height: number,
		radius: number | { tl: number; tr: number; br: number; bl: number },
	) {
		if (typeof radius === 'number') {
			radius = { tl: radius, tr: radius, br: radius, bl: radius };
		}
		ctx.beginPath();
		ctx.moveTo(x + radius.tl, y);
		ctx.lineTo(x + width - radius.tr, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
		ctx.lineTo(x + width, y + height - radius.br);
		ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
		ctx.lineTo(x + radius.bl, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
		ctx.lineTo(x, y + radius.tl);
		ctx.quadraticCurveTo(x, y, x + radius.tl, y);
		ctx.closePath();
	}

	/**
	 * Draws a Material Design icon on the canvas
	 */
	static drawMaterialIcon(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		size: number,
		color: string,
		iconName: string,
	) {
		ctx.fillStyle = color;
		ctx.font = `normal ${size}px 'Material Symbols Rounded'`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(iconName, x, y);
	}

	/**
	 * Gets the theme configuration for a specific node type
	 */
	static getTheme(
		node: ForceDirectedGraphNode,
		themeColors: ReturnType<typeof useTheme>['themeColors'],
		isHighlighted?: boolean,
		hasHighlights?: boolean,
	): GraphNodeThemeSet {
		const { type } = node;

		// Base version colors
		const versionColors = {
			background: themeColors.neutral[100],
			border: themeColors.neutral[300],
			text: themeColors.neutral[800],
		};

		// Base theme structure
		const baseTheme = {
			nodeBackground: themeColors.neutral[50],
			nodeText: themeColors.neutral[900],
			versionBackground: versionColors.background,
			versionBorder: versionColors.border,
			versionText: versionColors.text,
			errorIconColor: themeColors.error[500],
			selectedShadowColor: 'rgba(0, 0, 0, 0.2)',
		};

		const getColourSet = (colourSet: { primary: string; secondary: string; light: string }) => {
			const baseColors = {
				...baseTheme,
				nodeBorder: colourSet.secondary,
				nodeLeftBorder: colourSet.secondary,
				resourceIndicatorColor: colourSet.primary,
				resourceTypeIconColor: colourSet.secondary,
				selectedBackground: colourSet.light,
				selectedBorder: colourSet.primary,
				selectedLeftBorder: colourSet.primary,
				selectedShadowColor: colourSet.secondary,
			};

			// Apply highlight/dim effects
			if (isHighlighted) {
				// Enhanced colors for highlighted nodes
				return {
					...baseColors,
					nodeBackground: colourSet.light,
					nodeBorder: colourSet.primary,
					nodeLeftBorder: colourSet.primary,
					resourceIndicatorColor: colourSet.primary,
					resourceTypeIconColor: colourSet.primary,
					nodeText: themeColors.neutral[900],
				};
			} else if (hasHighlights) {
				// Dimmed colors for non-highlighted nodes when highlights are present
				return {
					...baseColors,
					nodeBackground: themeColors.neutral[50],
					nodeBorder: themeColors.neutral[200],
					nodeLeftBorder: themeColors.neutral[300],
					resourceIndicatorColor: themeColors.neutral[400],
					resourceTypeIconColor: themeColors.neutral[400],
					nodeText: themeColors.neutral[500],
				};
			}

			return baseColors;
		};

		// Resource type specific colors using semantic theme colors
		switch (type) {
			case 'role': {
				return {
					...getColourSet({
						primary: themeColors.accent[500], // Blue - professional/work
						secondary: themeColors.accent[300],
						light: themeColors.accent[50],
					}),
					resourceIndicatorIcon: 'work',
				};
			}

			case 'skill': {
				// Get skill level-specific icon
				const level = node.level || 'intermediate';
				let skillIcon: string;
				switch (level) {
					case 'expert':
						skillIcon = 'star';
						break;
					case 'advanced':
						skillIcon = 'bolt';
						break;
					case 'intermediate':
					default:
						skillIcon = 'auto_awesome';
						break;
				}
				
				return {
					...getColourSet({
						primary: themeColors.error[500], // Red - skills/expertise
						secondary: themeColors.error[300],
						light: themeColors.error[50],
					}),
					resourceIndicatorIcon: skillIcon,
				};
			}

			case 'project': {
				return {
					...getColourSet({
						primary: themeColors.primary[500], // Purple - creative projects
						secondary: themeColors.primary[300],
						light: themeColors.primary[50],
					}),
					resourceIndicatorIcon: 'extension',
				};
			}

			case 'person': {
				return {
					...getColourSet({
						primary: themeColors.secondary[500], // Teal - person/identity
						secondary: themeColors.secondary[300],
						light: themeColors.secondary[50],
					}),
					resourceIndicatorIcon: 'person',
				};
			}

			case 'timeline-month': {
				return {
					...getColourSet({
						primary: themeColors.secondary[500], // Teal - timeline/dates
						secondary: themeColors.secondary[300],
						light: themeColors.secondary[50],
					}),
					resourceIndicatorIcon: 'calendar_today',
				};
			}
			case 'tag': {
				return {
					...getColourSet({
						primary: themeColors.neutral[400], // Gray - tags/metadata
						secondary: themeColors.neutral[200],
						light: themeColors.neutral[50],
					}),
					resourceIndicatorIcon: 'sell',
				};
			}

			case 'story': {
				return {
					...getColourSet({
						primary: themeColors.warning[500], // Orange - stories/experiences
						secondary: themeColors.warning[300],
						light: themeColors.warning[50],
					}),
					resourceIndicatorIcon: 'auto_stories',
				};
			}

			case 'value': {
				return {
					...getColourSet({
						primary: themeColors.success[500], // Green - values/principles
						secondary: themeColors.success[300],
						light: themeColors.success[50],
					}),
					resourceIndicatorIcon: 'favorite',
				};
			}

			default: {
				return {
					...getColourSet({
						primary: themeColors.neutral[500],
						secondary: themeColors.neutral[300],
						light: themeColors.neutral[50],
					}),
					resourceIndicatorIcon: 'star',
				};
			}
		}
	}

	/**
	 * Main function to draw custom nodes based on their type
	 */
	static drawCustomNode = (
		ctx: CanvasRenderingContext2D,
		globalScale: number,
		settings: CustomNodeSettings,
		hasHighlights = false,
	) => {
		const { node, themeColors, isSelected } = settings;
		const { x, y, itemName, type } = node;

		const calculatedTheme = DrawingUtils.getTheme(node, themeColors, node.isHighlighted, hasHighlights);
		const currentStyle = isSelected
			? {
					...calculatedTheme,
					nodeBackground: calculatedTheme.selectedBackground,
					nodeBorder: calculatedTheme.selectedBorder,
					nodeLeftBorder: calculatedTheme.selectedLeftBorder,
				}
			: calculatedTheme;

		// Get shared dimensions
		const dimensions = DrawingUtils.calculateNodeDimensions(globalScale, isSelected);

		// --- Handle single-line rendering for non-highlighted nodes when highlights exist OR when singleLine is set ---
		if ((hasHighlights && !node.isHighlighted) || node.singleLine) {
			// Use default single-line rendering for non-highlighted nodes or nodes with singleLine flag
			// (default rendering code below handles this)
		} else {
			// --- Handle type-specific rendering for highlighted nodes or when no highlights exist ---
			if (type === 'role') {
				return DrawingUtils.drawRoleNode(ctx, settings, currentStyle, calculatedTheme, dimensions);
			}

			if (type === 'skill') {
				return DrawingUtils.drawSkillNode(ctx, settings, currentStyle, calculatedTheme, dimensions);
			}

			if (type === 'project') {
				return DrawingUtils.drawProjectNode(ctx, settings, currentStyle, calculatedTheme, dimensions);
			}
		}

		// --- Default node rendering ---
		const height = dimensions.scale(25);

		// Calculate text width
		ctx.font = `normal ${dimensions.scale(14)}px 'Lato', sans-serif`;
		const nameTextWidth = ctx.measureText(itemName).width;
		const totalWidth =
			dimensions.padding + dimensions.iconSize + dimensions.padding + nameTextWidth + dimensions.padding;

		// Create layout
		const layout = DrawingUtils.createNodeLayout(x, y, totalWidth, height, dimensions);

		// Draw node components using shared functions
		DrawingUtils.drawNodeBackground(ctx, layout, dimensions, currentStyle, isSelected, !!node.isHighlighted);
		DrawingUtils.drawLeftBorder(ctx, layout, dimensions, currentStyle.nodeLeftBorder);

		// Draw icon (with slight Y adjustment for default nodes)
		const iconLayout = { ...layout, iconY: y + dimensions.scale(0.5) };
		DrawingUtils.drawNodeIcon(
			ctx,
			iconLayout,
			dimensions,
			currentStyle.resourceTypeIconColor,
			calculatedTheme.resourceIndicatorIcon,
		);

		// Draw text
		DrawingUtils.setupTextRendering(ctx);
		ctx.fillStyle = currentStyle.nodeText;
		ctx.font = `normal ${dimensions.scale(14)}px 'Lato', sans-serif`;
		ctx.fillText(itemName, layout.textStartX, y);

		return {
			width: totalWidth,
			height: height,
		};
	};

	/**
	 * Draws a role-specific node with title and company
	 */
	private static drawRoleNode = (
		ctx: CanvasRenderingContext2D,
		settings: CustomNodeSettings,
		currentStyle: GraphNodeThemeSet,
		calculatedTheme: GraphNodeThemeSet,
		dimensions: NodeDimensions,
	) => {
		const { node, isSelected } = settings;
		const { x, y, company, position } = node;

		const height = dimensions.scale(40); // Taller for two lines

		// Text measurements
		ctx.font = `normal ${dimensions.scale(14)}px 'Lato', sans-serif`;
		const titleTextWidth = ctx.measureText(position).width;

		ctx.font = `normal ${dimensions.scale(12)}px 'Lato', sans-serif`;
		const companyTextWidth = ctx.measureText(company).width;

		// Use the wider text to determine node width
		const maxTextWidth = Math.max(titleTextWidth, companyTextWidth);
		const totalWidth =
			dimensions.padding + dimensions.iconSize + dimensions.padding + maxTextWidth + dimensions.padding;

		// Create layout and draw shared components
		const layout = DrawingUtils.createNodeLayout(x, y, totalWidth, height, dimensions);
		DrawingUtils.drawNodeBackground(ctx, layout, dimensions, currentStyle, isSelected, !!node.isHighlighted);
		DrawingUtils.drawLeftBorder(ctx, layout, dimensions, currentStyle.nodeLeftBorder);
		DrawingUtils.drawNodeIcon(
			ctx,
			layout,
			dimensions,
			currentStyle.resourceTypeIconColor,
			calculatedTheme.resourceIndicatorIcon,
		);

		// Draw role-specific text
		DrawingUtils.setupTextRendering(ctx);

		// Role title (primary text)
		ctx.fillStyle = currentStyle.nodeText;
		ctx.font = `normal ${dimensions.scale(14)}px 'Lato', sans-serif`;
		const titleY = y - dimensions.scale(8);
		ctx.fillText(position, layout.textStartX, titleY);

		// Company name (secondary text)
		if (company) {
			ctx.fillStyle = currentStyle.resourceTypeIconColor;
			ctx.font = `normal ${dimensions.scale(12)}px 'Lato', sans-serif`;
			const companyY = y + dimensions.scale(8);
			ctx.fillText(company, layout.textStartX, companyY);
		}

		return {
			width: totalWidth,
			height: height,
		};
	};

	/**
	 * Gets level display text for skills
	 */
	private static getLevelDisplay = (level: string): string => {
		switch (level) {
			case 'expert':
				return 'Expert';
			case 'advanced':
				return 'Advanced';
			case 'intermediate':
			default:
				return 'Intermediate';
		}
	};

	/**
	 * Draws a skill-specific node with level and tags
	 */
	private static drawSkillNode = (
		ctx: CanvasRenderingContext2D,
		settings: CustomNodeSettings,
		currentStyle: GraphNodeThemeSet,
		calculatedTheme: GraphNodeThemeSet,
		dimensions: NodeDimensions,
	) => {
		const { node, isSelected } = settings;
		const { x, y, itemName } = node;

		// Extract skill-specific properties
		const level = node.level || 'intermediate';
		const tags = node.tags || [];
		const primaryTag = tags[0] || '';

		const levelDisplay = DrawingUtils.getLevelDisplay(level);
		const subtitle = primaryTag
			? `${levelDisplay} • ${primaryTag.charAt(0).toUpperCase() + primaryTag.slice(1)}`
			: levelDisplay;

		const height = dimensions.scale(40); // Same as role nodes

		// Text measurements
		ctx.font = `normal ${dimensions.scale(14)}px 'Lato', sans-serif`;
		const skillTextWidth = ctx.measureText(itemName).width;

		ctx.font = `normal ${dimensions.scale(12)}px 'Lato', sans-serif`;
		const subtitleTextWidth = ctx.measureText(subtitle).width;

		// Use the wider text to determine node width
		const maxTextWidth = Math.max(skillTextWidth, subtitleTextWidth);
		const totalWidth =
			dimensions.padding + dimensions.iconSize + dimensions.padding + maxTextWidth + dimensions.padding;

		// Create layout and draw shared components
		const layout = DrawingUtils.createNodeLayout(x, y, totalWidth, height, dimensions);
		DrawingUtils.drawNodeBackground(ctx, layout, dimensions, currentStyle, isSelected, !!node.isHighlighted);
		DrawingUtils.drawLeftBorder(ctx, layout, dimensions, currentStyle.nodeLeftBorder);

		// Draw skill icon (from theme)
		DrawingUtils.drawNodeIcon(ctx, layout, dimensions, currentStyle.resourceTypeIconColor, calculatedTheme.resourceIndicatorIcon);

		// Draw skill-specific text
		DrawingUtils.setupTextRendering(ctx);

		// Skill name (primary text)
		ctx.fillStyle = currentStyle.nodeText;
		ctx.font = `normal ${dimensions.scale(14)}px 'Lato', sans-serif`;
		const skillY = y - dimensions.scale(8); // Move up for subtitle
		ctx.fillText(itemName, layout.textStartX, skillY);

		// Level + tag (secondary text)
		ctx.fillStyle = currentStyle.resourceTypeIconColor;
		ctx.font = `normal ${dimensions.scale(12)}px 'Lato', sans-serif`;
		const subtitleY = y + dimensions.scale(8);
		ctx.fillText(subtitle, layout.textStartX, subtitleY);

		return {
			width: totalWidth,
			height: height,
		};
	};

	/**
	 * Draws a project-specific node with time period and tags
	 */
	private static drawProjectNode = (
		ctx: CanvasRenderingContext2D,
		settings: CustomNodeSettings,
		currentStyle: GraphNodeThemeSet,
		calculatedTheme: GraphNodeThemeSet,
		dimensions: NodeDimensions,
	) => {
		const { node, isSelected } = settings;
		const { x, y, itemName } = node;

		// Extract project-specific properties
		const period = node.period;
		const years = node.years || [];
		const tags = node.tags || [];

		// Format time period
		const formatTimePeriod = () => {
			if (period?.start && period?.end) {
				const startYear = period.start.substring(0, 4);
				const endYear = period.end === 'present' ? 'Present' : period.end.substring(0, 4);
				return startYear === endYear ? startYear : `${startYear}-${endYear}`;
			}
			if (years.length >= 2) {
				const [first, second] = years;
				// @ts-expect-error
				return first === second ? first.toString() : `${first}-${second}`;
			}
			return '';
		};

		// Get key tags (first 2 tags, capitalized)
		const getKeyTags = () => {
			return tags
				.slice(0, 2)
				.map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' '))
				.join(', ');
		};

		const timePeriod = formatTimePeriod();
		const keyTags = getKeyTags();
		const subtitle = [timePeriod, keyTags].filter(Boolean).join(' • ');

		const height = dimensions.scale(40); // Same as role and skill nodes

		// Text measurements
		ctx.font = `normal ${dimensions.scale(14)}px 'Lato', sans-serif`;
		const projectTextWidth = ctx.measureText(itemName).width;

		ctx.font = `normal ${dimensions.scale(12)}px 'Lato', sans-serif`;
		const subtitleTextWidth = subtitle ? ctx.measureText(subtitle).width : 0;

		// Use the wider text to determine node width
		const maxTextWidth = Math.max(projectTextWidth, subtitleTextWidth);
		const totalWidth =
			dimensions.padding + dimensions.iconSize + dimensions.padding + maxTextWidth + dimensions.padding;

		// Create layout and draw shared components
		const layout = DrawingUtils.createNodeLayout(x, y, totalWidth, height, dimensions);
		DrawingUtils.drawNodeBackground(ctx, layout, dimensions, currentStyle, isSelected, !!node.isHighlighted);
		DrawingUtils.drawLeftBorder(ctx, layout, dimensions, currentStyle.nodeLeftBorder);

		// Draw project icon
		DrawingUtils.drawNodeIcon(ctx, layout, dimensions, currentStyle.resourceTypeIconColor, 'rocket_launch');

		// Draw project-specific text
		DrawingUtils.setupTextRendering(ctx);

		// Project name (primary text)
		ctx.fillStyle = currentStyle.nodeText;
		ctx.font = `normal ${dimensions.scale(14)}px 'Lato', sans-serif`;
		const projectY = subtitle ? y - dimensions.scale(8) : y; // Move up if there's a subtitle
		ctx.fillText(itemName, layout.textStartX, projectY);

		// Time + tags (secondary text)
		if (subtitle) {
			ctx.fillStyle = currentStyle.resourceTypeIconColor;
			ctx.font = `normal ${dimensions.scale(12)}px 'Lato', sans-serif`;
			const subtitleY = y + dimensions.scale(8);
			ctx.fillText(subtitle, layout.textStartX, subtitleY);
		}

		return {
			width: totalWidth,
			height: height,
		};
	};
}
