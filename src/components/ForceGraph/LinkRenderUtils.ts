import type { LinkObject, NodeObject } from 'react-force-graph-2d';
import type { useTheme } from '~/contexts/theme-context';
import type { ForceDirectedGraphNode, ForceDirectedGraphLink, ExtendedNodeObject } from './Common';
import { isExtendedNodeObject } from './Common';
import { DrawingUtils } from './DrawingUtils';
import { RENDER_CONFIG } from './constants';

export interface LinkColors {
	default: string;
}

export class LinkRenderUtils {
	/**
	 * Gets the color configuration for links based on theme
	 */
	static getLinkColors(themeColors: ReturnType<typeof useTheme>['themeColors']): LinkColors {
		return {
			default: themeColors.neutral[300],
		};
	}

	/**
	 * Creates a render function for link directional particles (arrows)
	 */
	static getLinkParticleRenderFunction(themeColors: ReturnType<typeof useTheme>['themeColors']) {
		const linkColors = LinkRenderUtils.getLinkColors(themeColors);

		return (
			x: number,
			y: number,
			link: LinkObject<ForceDirectedGraphNode, ForceDirectedGraphLink>,
			ctx: CanvasRenderingContext2D,
			globalScale: number,
		) => {
			const sourceNode = link.source as NodeObject<ForceDirectedGraphNode>;
			const targetNode = link.target as NodeObject<ForceDirectedGraphNode>;

			if (!isExtendedNodeObject(sourceNode) || !isExtendedNodeObject(targetNode)) return;

			const baseSize = 3;
			const linkColour = link.colour ?? linkColors.default;

			const size = baseSize / globalScale;
			const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);

			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(angle);
			ctx.translate(-x, -y);

			ctx.fillStyle = linkColour;
			ctx.beginPath();
			ctx.moveTo(x + size, y); // Tip of the arrow
			ctx.lineTo(x - size, y - size); // Bottom-left
			ctx.lineTo(x - size, y + size); // Bottom-right
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		};
	}

	/**
	 * Creates a render function for nodes that handles highlighting and selection
	 */
	static getNodeRenderFunction(
		hoverNodeId: string | null,
		selectedNodes: Set<string>,
		themeColors: ReturnType<typeof useTheme>['themeColors'],
	) {
		return (
			providedNode: NodeObject<ForceDirectedGraphNode>,
			ctx: CanvasRenderingContext2D,
			globalScale: number,
		) => {
			if (providedNode.x === undefined || providedNode.y === undefined) return;
			const node = providedNode as ExtendedNodeObject;

			const isHovered = node.id === hoverNodeId;
			const isSelected = selectedNodes.has(node.id);

			const { width, height } = DrawingUtils.drawCustomNode(ctx, globalScale, {
				node,
				themeColors,
				isHovered,
				isSelected,
			});

			node.backgroundDimensions = {
				width,
				height,
			};
		};
	}

	/**
	 * Calculates link speed based on highlight status
	 */
	static getLinkSpeed(link: ForceDirectedGraphLink, linksInvolvedInHighlight: Set<string>): number {
		if (linksInvolvedInHighlight.has(link.id)) return link.value * RENDER_CONFIG.particleSpeed.highlighted;
		return link.value * RENDER_CONFIG.particleSpeed.normal;
	}

	/**
	 * Calculates link width based on hover and highlight status
	 */
	static getLinkWidth(
		link: ForceDirectedGraphLink,
		hoverLinkId: string | null,
		linksInvolvedInHighlight: Set<string>,
	): number {
		if (link.id === hoverLinkId) return RENDER_CONFIG.linkWidth.hovered;
		if (linksInvolvedInHighlight.has(link.id)) return RENDER_CONFIG.linkWidth.highlighted;
		return RENDER_CONFIG.linkWidth.normal;
	}

	/**
	 * Determines link color based on dependency status and theme
	 */
	static getLinkColor(link: ForceDirectedGraphLink, themeColors: ReturnType<typeof useTheme>['themeColors']): string {
		const linkColors = LinkRenderUtils.getLinkColors(themeColors);
		return link.colour ?? linkColors.default;
	}
}
