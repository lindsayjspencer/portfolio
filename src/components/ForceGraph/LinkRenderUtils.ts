import type { LinkObject, NodeObject } from 'react-force-graph-2d';
import type { useTheme } from '~/contexts/theme-context';
import type { ForceDirectedGraphNode, ForceDirectedGraphLink, ExtendedNodeObject } from './Common';
import { isExtendedNodeObject } from './Common';
import { DrawingUtils } from './DrawingUtils';
import { RENDER_CONFIG } from './constants';

export interface LinkColors {
	default: string;
	skill: string; // for 'used', 'learned'
	project: string; // for 'built'
	role: string; // for 'worked_as'
	evidence: string; // for 'evidence'
	timeline: string; // for 'happened_during', 'timeline-marker'
	leadership: string; // for 'led', 'mentored'
	impact: string; // for 'impacted'
}

export class LinkRenderUtils {
	/**
	 * Gets the color configuration for links based on theme
	 */
	static getLinkColors(themeColors: ReturnType<typeof useTheme>['themeColors']): LinkColors {
		return {
			default: themeColors.neutral[300],
			skill: themeColors.success[500], // Green for skill relationships
			project: themeColors.primary[500], // Blue for projects
			role: themeColors.accent[500], // Purple for roles
			evidence: themeColors.error[500], // Red for values evidence
			timeline: themeColors.warning[500], // Yellow for time/story relationships
			leadership: themeColors.warning[600], // Orange for leadership
			impact: themeColors.accent[400], // Cyan for impact
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
			const linkColour = LinkRenderUtils.getLinkColor(link, themeColors);

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
		hasHighlights = false,
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

			const { width, height } = DrawingUtils.drawCustomNode(
				ctx,
				globalScale,
				{
					node,
					themeColors,
					isHovered,
					isSelected,
				},
				hasHighlights,
			);

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
	 * Determines link color based on relationship type and theme
	 */
	static getLinkColor(link: ForceDirectedGraphLink, themeColors: ReturnType<typeof useTheme>['themeColors']): string {
		const linkColors = LinkRenderUtils.getLinkColors(themeColors);

		// If link has a predefined colour, use it
		if (link.colour) return link.colour;

		// Otherwise, determine color based on relationship type
		switch (link.rel) {
			case 'used':
			case 'learned':
				return linkColors.skill;
			case 'built':
				return linkColors.project;
			case 'worked_as':
				return linkColors.role;
			case 'evidence':
				return linkColors.evidence;
			case 'happened_during':
			case 'timeline-marker':
				return linkColors.timeline;
			case 'led':
			case 'mentored':
				return linkColors.leadership;
			case 'impacted':
				return linkColors.impact;
			default:
				return linkColors.default;
		}
	}
}
