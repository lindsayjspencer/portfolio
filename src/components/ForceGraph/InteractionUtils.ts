import type { NodeObject } from 'react-force-graph-2d';
import type { TippyProps } from '@tippyjs/react';
import type { ForceDirectedGraphNode } from './Common';
import { ZoomUtils } from './ZoomUtils';

export interface TooltipData {
	x: number;
	y: number;
	TippyProps: TippyProps;
}

export interface NodeSelectionState {
	selectedNodes: Set<string>;
	setSelectedNodes: (nodes: Set<string>) => void;
}

export class InteractionUtils {
	/**
	 * Handles node click interactions with support for multi-selection and toggle behavior
	 */
	static handleNodeClick(
		node: NodeObject<ForceDirectedGraphNode> | null,
		event: MouseEvent,
		selectionState: NodeSelectionState,
		onCanvasInteraction: () => void,
	) {
		onCanvasInteraction();

		if (node) {
			const { selectedNodes, setSelectedNodes } = selectionState;

			if (event.shiftKey) {
				// Multi-selection mode with Shift key
				const newSelectedNodes = new Set(selectedNodes);
				if (selectedNodes.has(node.id)) {
					newSelectedNodes.delete(node.id);
				} else {
					newSelectedNodes.add(node.id);
				}
				setSelectedNodes(newSelectedNodes);
			} else {
				// Single selection mode
				if (selectedNodes.size === 1 && selectedNodes.has(node.id)) {
					// Deselect if clicking on the only selected node
					setSelectedNodes(new Set());
				} else {
					// Select this node only
					setSelectedNodes(new Set([node.id]));
				}
			}
		} else {
			// Click on background - clear selection
			selectionState.setSelectedNodes(new Set());
		}
	}

	/**
	 * Handles background click to clear selection
	 */
	static handleBackgroundClick(
		selectionState: NodeSelectionState,
		onCanvasInteraction: () => void,
	) {
		onCanvasInteraction();
		selectionState.setSelectedNodes(new Set());
	}

	/**
	 * Updates tooltip data based on hovered node
	 */
	static updateTooltip(
		node: NodeObject<NodeObject<ForceDirectedGraphNode>> | null,
		getNodeTooltip: ((node: ForceDirectedGraphNode) => TippyProps | null) | undefined,
		forceGraphRef: React.RefObject<any>,
	): TooltipData | null {
		if (!node || typeof node.x !== 'number' || typeof node.y !== 'number' || !getNodeTooltip) {
			return null;
		}

		const nodeTooltip = getNodeTooltip(node);
		if (!nodeTooltip) {
			return null;
		}

		const screenCoords = ZoomUtils.canvasToScreenCoords(forceGraphRef.current, node.x, node.y);
		if (!screenCoords) {
			return null;
		}

		return {
			x: screenCoords.x,
			y: screenCoords.y,
			TippyProps: nodeTooltip,
		};
	}

	/**
	 * Handles hover state changes for nodes
	 */
	static handleNodeHover(
		node: NodeObject<ForceDirectedGraphNode> | null,
		setHoverNodeId: (id: string | null) => void,
		setTooltipData: (data: TooltipData | null) => void,
		getNodeTooltip: ((node: ForceDirectedGraphNode) => TippyProps | null) | undefined,
		forceGraphRef: React.RefObject<any>,
	) {
		const nodeId = node ? node.id : null;
		setHoverNodeId(nodeId);

		const tooltipData = InteractionUtils.updateTooltip(node, getNodeTooltip, forceGraphRef);
		setTooltipData(tooltipData);
	}

	/**
	 * Handles hover state changes for links
	 */
	static handleLinkHover(
		link: any,
		setHoverLinkId: (id: string | null) => void,
	) {
		setHoverLinkId(link?.id ?? null);
	}

	/**
	 * Generic interaction handler that disables auto-zoom
	 */
	static handleGenericInteraction(onCanvasInteraction: () => void) {
		onCanvasInteraction();
	}

	/**
	 * Creates a tooltip reference rectangle for positioning
	 */
	static createTooltipRect(x: number, y: number): DOMRect {
		return {
			width: 0,
			height: 0,
			top: y,
			bottom: y,
			left: x,
			right: x,
			x: x,
			y: y,
			toJSON: () => ({}),
		} as DOMRect;
	}

	/**
	 * Determines if a node should be rendered in the current frame based on selection/hover state
	 */
	static shouldRenderNode(
		nodeId: string,
		selectedNodes: Set<string>,
		hoverNodeId: string | null,
	): boolean {
		return selectedNodes.has(nodeId) || nodeId === hoverNodeId;
	}

	/**
	 * Handles keyboard interactions for the graph
	 */
	static handleKeyDown(
		event: KeyboardEvent,
		selectionState: NodeSelectionState,
	) {
		switch (event.key) {
			case 'Escape':
				// Clear selection on Escape
				selectionState.setSelectedNodes(new Set());
				break;
			case 'a':
			case 'A':
				// Select all on Ctrl+A (could be extended in the future)
				if (event.ctrlKey || event.metaKey) {
					event.preventDefault();
					// Could implement select all functionality here
				}
				break;
		}
	}
}