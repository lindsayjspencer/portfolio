import type { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-2d';
import type {
	ForceDirectedGraphNode,
	ForceDirectedGraphLink,
	ForceDirectedGraphData,
	ExtendedNodeObject,
	Bounds,
} from './Common';
import { ZOOM_CONFIG } from './constants';

export interface ZoomPadding {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

export class ZoomUtils {
	private static readonly EPS = 1e-3;

	/**
	 * Performs a custom zoom-to-fit operation that accounts for node dimensions and padding.
	 * If any nodes are highlighted, only highlights are considered for zoom bounds.
	 */
	static customZoomToFit(
		forceGraph: ForceGraphMethods<
			NodeObject<ForceDirectedGraphNode>,
			LinkObject<ForceDirectedGraphNode, ForceDirectedGraphLink>
		>,
		graphData: ForceDirectedGraphData,
		width: number,
		height: number,
		padding: ZoomPadding,
		transitionDuration: number = 300,
	) {
		if (!graphData.nodes.length) return;

		// Check if any nodes are highlighted
		const hasHighlights = graphData.nodes.some((node) => node.isHighlighted);

		// Use only highlighted nodes if highlights exist, otherwise use all nodes
		const targetNodes = hasHighlights ? graphData.nodes.filter((node) => node.isHighlighted) : graphData.nodes;

		if (!targetNodes.length) return;

		// Calculate bounding box of target nodes including their dimensions
		const nodeExtents = targetNodes
			.map((node) => {
				const nodeObj = node as ExtendedNodeObject;
				if (nodeObj.x === undefined || nodeObj.y === undefined || !nodeObj.backgroundDimensions) {
					return null;
				}
				const halfWidth = nodeObj.backgroundDimensions.width / 2;
				const halfHeight = nodeObj.backgroundDimensions.height / 2;
				return {
					left: nodeObj.x - halfWidth,
					right: nodeObj.x + halfWidth,
					top: nodeObj.y - halfHeight,
					bottom: nodeObj.y + halfHeight,
				};
			})
			.filter((extent) => extent !== null);

		if (!nodeExtents.length) return;

		const minX = Math.min(...nodeExtents.map((extent) => extent.left));
		const maxX = Math.max(...nodeExtents.map((extent) => extent.right));
		const minY = Math.min(...nodeExtents.map((extent) => extent.top));
		const maxY = Math.max(...nodeExtents.map((extent) => extent.bottom));

		// Calculate the available viewport size after padding
		const availableWidth = width - padding.left - padding.right;
		const availableHeight = height - padding.top - padding.bottom;

		// Calculate the required zoom to fit the content in the available space
		const contentWidth = maxX - minX;
		const contentHeight = maxY - minY;

		const zoomX = contentWidth > 0 ? availableWidth / contentWidth : 1;
		const zoomY = contentHeight > 0 ? availableHeight / contentHeight : 1;
		const zoom = Math.min(zoomX, zoomY, ZOOM_CONFIG.maxZoom); // Cap zoom at maxZoom

		// Calculate the center of the content
		const contentCenterX = (minX + maxX) / 2;
		const contentCenterY = (minY + maxY) / 2;

		// Calculate the center of the available viewport (accounting for padding)
		const viewportCenterX = (width - padding.right + padding.left) / 2;
		const viewportCenterY = (height - padding.bottom + padding.top) / 2;

		// Apply zoom and center
		forceGraph.zoom(zoom, transitionDuration);
		forceGraph.centerAt(
			contentCenterX - (viewportCenterX - width / 2) / zoom,
			contentCenterY - (viewportCenterY - height / 2) / zoom,
			transitionDuration,
		);
	}

	/**
	 * Safely centers the graph at specified coordinates using RAF to prevent conflicts
	 */
	static safeCenterAt(
		forceGraph: ForceGraphMethods<
			NodeObject<ForceDirectedGraphNode>,
			LinkObject<ForceDirectedGraphNode, ForceDirectedGraphLink>
		>,
		x: number,
		y: number,
		programmaticZoomRef: React.MutableRefObject<boolean>,
		rafRef: React.MutableRefObject<number | null>,
	) {
		if (rafRef.current) cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(() => {
			programmaticZoomRef.current = true;
			// duration 0 still fires onZoom; we're guarded
			forceGraph?.centerAt(x, y, 0);
			// allow a tick for d3-zoom to finish before re-enabling
			requestAnimationFrame(() => {
				programmaticZoomRef.current = false;
			});
		});
	}

	/**
	 * Clamps coordinates within bounds with a margin to prevent edge snapping
	 */
	static clampWithMargin(x: number, y: number, bounds: Bounds, margin: number = 2) {
		return {
			x: Math.min(Math.max(x, bounds.minX + margin), bounds.maxX - margin),
			y: Math.min(Math.max(y, bounds.minY + margin), bounds.maxY - margin),
		};
	}

	/**
	 * Determines if recentering is needed based on coordinate differences
	 */
	static needsRecentre(x: number, y: number, targetCoords: { x: number; y: number }) {
		return Math.abs(targetCoords.x - x) > ZoomUtils.EPS || Math.abs(targetCoords.y - y) > ZoomUtils.EPS;
	}

	/**
	 * Converts canvas coordinates to screen coordinates
	 */
	static canvasToScreenCoords(
		forceGraph:
			| ForceGraphMethods<
					NodeObject<ForceDirectedGraphNode>,
					LinkObject<ForceDirectedGraphNode, ForceDirectedGraphLink>
			  >
			| undefined,
		canvasX: number,
		canvasY: number,
	) {
		if (!forceGraph) return null;

		// Use the built-in graph2ScreenCoords method to convert graph coordinates to screen coordinates
		const screenCoords = forceGraph.graph2ScreenCoords(canvasX, canvasY);
		if (!screenCoords) return null;

		// Get the canvas element to add its offset to the screen coordinates
		const graphContainer =
			document.querySelector('.force-graph-container canvas') || document.querySelector('canvas');
		if (!graphContainer) return screenCoords;

		const canvas = graphContainer as HTMLCanvasElement;
		const rect = canvas.getBoundingClientRect();

		// Add the canvas offset to get the final screen coordinates
		return {
			x: rect.left + screenCoords.x,
			y: rect.top + screenCoords.y,
		};
	}
}
