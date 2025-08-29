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

export class DrawingUtils {
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

		const getColourSet = (colourSet: { primary: string; secondary: string; light: string }) => ({
			...baseTheme,
			nodeBorder: colourSet.secondary,
			nodeLeftBorder: colourSet.secondary,
			resourceIndicatorColor: colourSet.primary,
			resourceTypeIconColor: colourSet.secondary,
			selectedBackground: colourSet.light,
			selectedBorder: colourSet.primary,
			selectedLeftBorder: colourSet.primary,
			selectedShadowColor: colourSet.secondary,
		});

		// Resource type specific colors using semantic theme colors
		switch (type) {
			case 'role': {
				return {
					...getColourSet({
						primary: themeColors.accent[500],
						secondary: themeColors.accent[300],
						light: themeColors.accent[50],
					}),
					resourceIndicatorIcon: 'work',
				};
			}

			case 'skill': {
				return {
					...getColourSet({
						primary: themeColors.error[500],
						secondary: themeColors.error[300],
						light: themeColors.error[50],
					}),
					resourceIndicatorIcon: 'star', // Will be overridden by skill level
				};
			}

			case 'project': {
				return {
					...getColourSet({
						primary: themeColors.primary[500],
						secondary: themeColors.primary[300],
						light: themeColors.primary[50],
					}),
					resourceIndicatorIcon: 'extension',
				};
			}

			case 'award': {
				return {
					...getColourSet({
						primary: themeColors.neutral[500],
						secondary: themeColors.neutral[300],
						light: themeColors.neutral[50],
					}),
					resourceIndicatorIcon: 'smart_toy',
				};
			}

			case 'cert': {
				return {
					...getColourSet({
						primary: themeColors.secondary[500],
						secondary: themeColors.secondary[300],
						light: themeColors.secondary[50],
					}),
					resourceIndicatorIcon: 'widgets',
				};
			}

			case 'education': {
				return {
					...getColourSet({
						primary: themeColors.accent[500],
						secondary: themeColors.accent[300],
						light: themeColors.accent[50],
					}),
					resourceIndicatorIcon: 'lan',
				};
			}

			case 'person': {
				return {
					...getColourSet({
						primary: themeColors.success[500],
						secondary: themeColors.success[300],
						light: themeColors.success[50],
					}),
					resourceIndicatorIcon: 'palette',
				};
			}

			case 'timeline-month': {
				return {
					...getColourSet({
						primary: themeColors.success[500],
						secondary: themeColors.success[300],
						light: themeColors.success[50],
					}),
					resourceIndicatorIcon: 'calendar_today',
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
	static drawCustomNode = (ctx: CanvasRenderingContext2D, globalScale: number, settings: CustomNodeSettings) => {
		const { node, themeColors, isSelected } = settings;
		const { x, y, itemName, type } = node;

		const calculatedTheme = DrawingUtils.getTheme(node, themeColors);

		// --- Styles ---
		const styles = {
			selected: {
				...calculatedTheme,
				nodeBackground: calculatedTheme.selectedBackground,
				nodeBorder: calculatedTheme.selectedBorder,
				nodeLeftBorder: calculatedTheme.selectedLeftBorder,
			},
			unselected: {
				...calculatedTheme,
			},
		};

		const currentStyle = isSelected ? styles.selected : styles.unselected;

		// --- Dimensions ---
		const scale = (value: number) => value / globalScale;
		const cornerRadius = scale(6);
		const padding = scale(8);
		const iconSize = scale(16);
		const outlineWidth = scale(isSelected ? 2 : 1.5);
		const leftBorderWidth = scale(6);

		// --- Handle Role-specific rendering ---
		if (type === 'role') {
			return DrawingUtils.drawRoleNode(ctx, globalScale, settings, currentStyle, calculatedTheme);
		}

		// --- Handle Skill-specific rendering ---
		if (type === 'skill') {
			return DrawingUtils.drawSkillNode(ctx, globalScale, settings, currentStyle, calculatedTheme);
		}

		// --- Handle Project-specific rendering ---
		if (type === 'project') {
			return DrawingUtils.drawProjectNode(ctx, globalScale, settings, currentStyle, calculatedTheme);
		}

		// --- Default node rendering ---
		const height = scale(25);

		// --- Text ---
		ctx.font = `normal ${scale(14)}px 'Lato', sans-serif`;
		const nameTextWidth = ctx.measureText(itemName).width;

		// --- Calculate total width ---
		const totalWidth = padding + iconSize + padding + nameTextWidth + padding; // Extra padding at the end

		// --- Draw main body ---
		ctx.fillStyle = currentStyle.nodeBackground;
		ctx.strokeStyle = currentStyle.nodeBorder;
		ctx.lineWidth = outlineWidth;

		if (isSelected) {
			ctx.shadowColor = currentStyle.selectedShadowColor;
			ctx.shadowOffsetX = 5; // 5 pixels to the right
			ctx.shadowOffsetY = 5; // 5 pixels downwards
			ctx.shadowBlur = 10; // 10 pixels of blur
		}

		DrawingUtils.drawRoundRect(ctx, x - totalWidth / 2, y - height / 2, totalWidth, height, cornerRadius);
		ctx.fill();

		if (isSelected) {
			ctx.shadowColor = 'transparent'; // Reset shadow before stroke
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = 0;
		}

		ctx.stroke();

		// --- Draw left colored border ---
		ctx.fillStyle = currentStyle.nodeLeftBorder;
		DrawingUtils.drawRoundRect(ctx, x - totalWidth / 2, y - height / 2, leftBorderWidth, height, {
			tl: cornerRadius,
			tr: 0,
			br: 0,
			bl: cornerRadius,
		});
		ctx.fill();

		// --- Draw Icon ---
		const iconX = leftBorderWidth / 2 + x - totalWidth / 2 + padding + iconSize / 2;
		const iconY = y + scale(0.5); // Center vertically
		DrawingUtils.drawMaterialIcon(
			ctx,
			iconX,
			iconY,
			iconSize,
			currentStyle.resourceTypeIconColor,
			calculatedTheme.resourceIndicatorIcon,
		);

		// --- Draw Text ---
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';

		// Item name
		ctx.fillStyle = currentStyle.nodeText;
		ctx.font = `normal ${scale(14)}px 'Lato', sans-serif`;
		const nameX = x - totalWidth / 2 + padding + iconSize + padding;
		ctx.fillText(itemName, nameX, y);

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
		globalScale: number,
		settings: CustomNodeSettings,
		currentStyle: GraphNodeThemeSet,
		calculatedTheme: GraphNodeThemeSet,
	) => {
		const { node, isSelected } = settings;
		const { x, y, itemName } = node;

		// --- Parse role label into title and company ---
		const parts = itemName.split(' — ');
		const roleTitle = parts[0] || itemName;
		const company = parts[1] || '';

		// --- Dimensions ---
		const scale = (value: number) => value / globalScale;
		const height = scale(40); // Taller for two lines with more padding
		const cornerRadius = scale(6);
		const padding = scale(8);
		const iconSize = scale(16);
		const outlineWidth = scale(isSelected ? 2 : 1.5);
		const leftBorderWidth = scale(6);
		const lineSpacing = scale(3);

		// --- Text measurements ---
		ctx.font = `normal ${scale(14)}px 'Lato', sans-serif`;
		const titleTextWidth = ctx.measureText(roleTitle).width;

		ctx.font = `normal ${scale(12)}px 'Lato', sans-serif`;
		const companyTextWidth = company ? ctx.measureText(company).width : 0;

		// Use the wider text to determine node width
		const maxTextWidth = Math.max(titleTextWidth, companyTextWidth);
		const totalWidth = padding + iconSize + padding + maxTextWidth + padding;

		// --- Draw main body ---
		ctx.fillStyle = currentStyle.nodeBackground;
		ctx.strokeStyle = currentStyle.nodeBorder;
		ctx.lineWidth = outlineWidth;

		if (isSelected) {
			ctx.shadowColor = currentStyle.selectedShadowColor;
			ctx.shadowOffsetX = 5;
			ctx.shadowOffsetY = 5;
			ctx.shadowBlur = 10;
		}

		DrawingUtils.drawRoundRect(ctx, x - totalWidth / 2, y - height / 2, totalWidth, height, cornerRadius);
		ctx.fill();

		if (isSelected) {
			ctx.shadowColor = 'transparent';
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = 0;
		}

		ctx.stroke();

		// --- Draw left colored border ---
		ctx.fillStyle = currentStyle.nodeLeftBorder;
		DrawingUtils.drawRoundRect(ctx, x - totalWidth / 2, y - height / 2, leftBorderWidth, height, {
			tl: cornerRadius,
			tr: 0,
			br: 0,
			bl: cornerRadius,
		});
		ctx.fill();

		// --- Draw Icon ---
		const iconX = leftBorderWidth / 2 + x - totalWidth / 2 + padding + iconSize / 2;
		const iconY = y; // Center vertically
		DrawingUtils.drawMaterialIcon(
			ctx,
			iconX,
			iconY,
			iconSize,
			currentStyle.resourceTypeIconColor,
			calculatedTheme.resourceIndicatorIcon,
		);

		// --- Draw Text ---
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		const textStartX = x - totalWidth / 2 + padding + iconSize + padding;

		// Role title (primary text)
		ctx.fillStyle = currentStyle.nodeText;
		ctx.font = `normal ${scale(14)}px 'Lato', sans-serif`;
		const titleY = company ? y - scale(8) : y; // Move up if there's a company line
		ctx.fillText(roleTitle, textStartX, titleY);

		// Company name (secondary text)
		if (company) {
			ctx.fillStyle = currentStyle.resourceTypeIconColor; // Use icon color for secondary text
			ctx.font = `normal ${scale(12)}px 'Lato', sans-serif`;
			const companyY = y + scale(8);
			ctx.fillText(company, textStartX, companyY);
		}

		return {
			width: totalWidth,
			height: height,
		};
	};

	/**
	 * Draws a skill-specific node with level and tags
	 */
	private static drawSkillNode = (
		ctx: CanvasRenderingContext2D,
		globalScale: number,
		settings: CustomNodeSettings,
		currentStyle: GraphNodeThemeSet,
		calculatedTheme: GraphNodeThemeSet,
	) => {
		const { node, isSelected } = settings;
		const { x, y, itemName } = node;

		// Extract skill-specific properties
		const level = node.level || 'intermediate';
		const tags = node.tags || [];
		const primaryTag = tags[0] || '';

		// Get level-specific icon and display text
		const getLevelInfo = (level: string) => {
			switch (level) {
				case 'expert':
					return { icon: 'star', display: 'Expert' };
				case 'advanced':
					return { icon: 'bolt', display: 'Advanced' };
				case 'intermediate':
					return { icon: 'auto_awesome', display: 'Intermediate' };
				default:
					return { icon: 'auto_awesome', display: 'Intermediate' };
			}
		};

		const levelInfo = getLevelInfo(level);
		const subtitle = primaryTag
			? `${levelInfo.display} • ${primaryTag.charAt(0).toUpperCase() + primaryTag.slice(1)}`
			: levelInfo.display;

		// --- Dimensions ---
		const scale = (value: number) => value / globalScale;
		const height = scale(40); // Same as role nodes
		const cornerRadius = scale(6);
		const padding = scale(8);
		const iconSize = scale(16);
		const outlineWidth = scale(isSelected ? 2 : 1.5);
		const leftBorderWidth = scale(6);

		// --- Text measurements ---
		ctx.font = `normal ${scale(14)}px 'Lato', sans-serif`;
		const skillTextWidth = ctx.measureText(itemName).width;

		ctx.font = `normal ${scale(12)}px 'Lato', sans-serif`;
		const subtitleTextWidth = ctx.measureText(subtitle).width;

		// Use the wider text to determine node width
		const maxTextWidth = Math.max(skillTextWidth, subtitleTextWidth);
		const totalWidth = padding + iconSize + padding + maxTextWidth + padding;

		// --- Draw main body ---
		ctx.fillStyle = currentStyle.nodeBackground;
		ctx.strokeStyle = currentStyle.nodeBorder;
		ctx.lineWidth = outlineWidth;

		if (isSelected) {
			ctx.shadowColor = currentStyle.selectedShadowColor;
			ctx.shadowOffsetX = 5;
			ctx.shadowOffsetY = 5;
			ctx.shadowBlur = 10;
		}

		DrawingUtils.drawRoundRect(ctx, x - totalWidth / 2, y - height / 2, totalWidth, height, cornerRadius);
		ctx.fill();

		if (isSelected) {
			ctx.shadowColor = 'transparent';
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = 0;
		}

		ctx.stroke();

		// --- Draw left colored border ---
		ctx.fillStyle = currentStyle.nodeLeftBorder;
		DrawingUtils.drawRoundRect(ctx, x - totalWidth / 2, y - height / 2, leftBorderWidth, height, {
			tl: cornerRadius,
			tr: 0,
			br: 0,
			bl: cornerRadius,
		});
		ctx.fill();

		// --- Draw Level Icon (instead of resource type icon) ---
		const iconX = leftBorderWidth / 2 + x - totalWidth / 2 + padding + iconSize / 2;
		const iconY = y; // Center vertically
		DrawingUtils.drawMaterialIcon(ctx, iconX, iconY, iconSize, currentStyle.resourceTypeIconColor, levelInfo.icon);

		// --- Draw Text ---
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		const textStartX = x - totalWidth / 2 + padding + iconSize + padding;

		// Skill name (primary text)
		ctx.fillStyle = currentStyle.nodeText;
		ctx.font = `normal ${scale(14)}px 'Lato', sans-serif`;
		const skillY = y - scale(8); // Move up for subtitle
		ctx.fillText(itemName, textStartX, skillY);

		// Level + tag (secondary text)
		ctx.fillStyle = currentStyle.resourceTypeIconColor; // Use icon color for secondary text
		ctx.font = `normal ${scale(12)}px 'Lato', sans-serif`;
		const subtitleY = y + scale(8);
		ctx.fillText(subtitle, textStartX, subtitleY);

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
		globalScale: number,
		settings: CustomNodeSettings,
		currentStyle: GraphNodeThemeSet,
		calculatedTheme: GraphNodeThemeSet,
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

		// --- Dimensions ---
		const scale = (value: number) => value / globalScale;
		const height = scale(40); // Same as role and skill nodes
		const cornerRadius = scale(6);
		const padding = scale(8);
		const iconSize = scale(16);
		const outlineWidth = scale(isSelected ? 2 : 1.5);
		const leftBorderWidth = scale(6);

		// --- Text measurements ---
		ctx.font = `normal ${scale(14)}px 'Lato', sans-serif`;
		const projectTextWidth = ctx.measureText(itemName).width;

		ctx.font = `normal ${scale(12)}px 'Lato', sans-serif`;
		const subtitleTextWidth = subtitle ? ctx.measureText(subtitle).width : 0;

		// Use the wider text to determine node width
		const maxTextWidth = Math.max(projectTextWidth, subtitleTextWidth);
		const totalWidth = padding + iconSize + padding + maxTextWidth + padding;

		// --- Draw main body ---
		ctx.fillStyle = currentStyle.nodeBackground;
		ctx.strokeStyle = currentStyle.nodeBorder;
		ctx.lineWidth = outlineWidth;

		if (isSelected) {
			ctx.shadowColor = currentStyle.selectedShadowColor;
			ctx.shadowOffsetX = 5;
			ctx.shadowOffsetY = 5;
			ctx.shadowBlur = 10;
		}

		DrawingUtils.drawRoundRect(ctx, x - totalWidth / 2, y - height / 2, totalWidth, height, cornerRadius);
		ctx.fill();

		if (isSelected) {
			ctx.shadowColor = 'transparent';
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = 0;
		}

		ctx.stroke();

		// --- Draw left colored border ---
		ctx.fillStyle = currentStyle.nodeLeftBorder;
		DrawingUtils.drawRoundRect(ctx, x - totalWidth / 2, y - height / 2, leftBorderWidth, height, {
			tl: cornerRadius,
			tr: 0,
			br: 0,
			bl: cornerRadius,
		});
		ctx.fill();

		// --- Draw Project Icon ---
		const iconX = leftBorderWidth / 2 + x - totalWidth / 2 + padding + iconSize / 2;
		const iconY = y; // Center vertically
		DrawingUtils.drawMaterialIcon(ctx, iconX, iconY, iconSize, currentStyle.resourceTypeIconColor, 'rocket_launch');

		// --- Draw Text ---
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		const textStartX = x - totalWidth / 2 + padding + iconSize + padding;

		// Project name (primary text)
		ctx.fillStyle = currentStyle.nodeText;
		ctx.font = `normal ${scale(14)}px 'Lato', sans-serif`;
		const projectY = subtitle ? y - scale(8) : y; // Move up if there's a subtitle
		ctx.fillText(itemName, textStartX, projectY);

		// Time + tags (secondary text)
		if (subtitle) {
			ctx.fillStyle = currentStyle.resourceTypeIconColor; // Use icon color for secondary text
			ctx.font = `normal ${scale(12)}px 'Lato', sans-serif`;
			const subtitleY = y + scale(8);
			ctx.fillText(subtitle, textStartX, subtitleY);
		}

		return {
			width: totalWidth,
			height: height,
		};
	};
}
