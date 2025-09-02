'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods, ForceGraphProps, LinkObject, NodeObject } from 'react-force-graph-2d';
import Store, { useStoreState } from 'react-granular-store';
import Tippy, { type TippyProps } from '@tippyjs/react';
import useInterval from '~/hooks/UseInterval';
import { useTheme } from '~/contexts/theme-context';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import { MaterialIcon, Spinner } from '../Ui';
import './ForceDirectedGraph.scss';
import Starfield from './Starfield';
import FpsCounter, { type FpsCounterRef } from './FpsCounter';
import {
	type ForceDirectedGraphNode,
	type ForceDirectedGraphLink,
	type ForceDirectedGraphData,
	isExtendedNodeObject,
} from './Common';
import { ZoomUtils, type ZoomPadding } from './ZoomUtils';
import { LinkRenderUtils } from './LinkRenderUtils';
import { GraphDataUtils } from './GraphDataUtils';
import { InteractionUtils, type TooltipData, type NodeSelectionState } from './InteractionUtils';
import {
	GRAPH_BOUNDS,
	ZOOM_CONFIG,
	DEFAULT_ZOOM_PADDING,
	FORCE_CONFIG,
	RENDER_CONFIG,
	UI_CONFIG,
	calculateResponsiveMinZoom,
} from './constants';
import { forceCollide } from 'd3-force-3d';

export interface ForceDirectedGraphProps
	extends ForceGraphProps<
		NodeObject<ForceDirectedGraphNode>,
		LinkObject<ForceDirectedGraphNode, ForceDirectedGraphLink>
	> {
	nodeData: ForceDirectedGraphData;
	store?: ForceDirectedGraphStore;
	rootId?: string;
	zoomPadding?: ZoomPadding;
	getNodeTooltip?: (node: ForceDirectedGraphNode) => TippyProps | null;
	onCollisionForceSetup?: (
		forceGraphRef:
			| ForceGraphMethods<
					NodeObject<ForceDirectedGraphNode>,
					LinkObject<ForceDirectedGraphNode, ForceDirectedGraphLink>
			  >
			| undefined,
	) => void;
	starfieldStartVisible?: boolean; // whether starfield should start visible (for stable state)
	onStarfieldReady?: (fadeController: {
		fadeIn: (duration: number) => void;
		fadeOut: (duration: number) => void;
		resetAlpha: (alpha: number) => void;
	}) => void;
}

export class ForceDirectedGraphStore extends Store<{ selectedNodes: Set<string> }> {
	constructor() {
		super({ selectedNodes: new Set() });
	}
}

const defaultStore = new ForceDirectedGraphStore();

export interface ForceDirectedGraphHandle {
	enableAutoZoom: () => void;
	disableAutoZoom: () => void;
	isAutoZoomEnabled: () => boolean;
}

const ForceDirectedGraph = forwardRef<ForceDirectedGraphHandle, ForceDirectedGraphProps>((props, ref) => {
	const {
		nodeData: graphData,
		store = defaultStore,
		width,
		height,
		dagMode,
		zoomPadding,
		getNodeTooltip,
		onCollisionForceSetup,
		starfieldStartVisible = false,
		onStarfieldReady,
		...rest
	} = props;

	const [selectedNodes, setSelectedNodes] = useStoreState(store, 'selectedNodes');
	const { themeColors } = useTheme();
	const { openPanel, closePanel } = usePortfolioStore();

	// Create selection state object for InteractionUtils
	const selectionState: NodeSelectionState = {
		selectedNodes,
		setSelectedNodes,
		openPanel,
		closePanel,
	};

	const forceGraph =
		useRef<
			ForceGraphMethods<
				NodeObject<ForceDirectedGraphNode>,
				LinkObject<ForceDirectedGraphNode, ForceDirectedGraphLink>
			>
		>();

	useEffect(() => {
		if (onCollisionForceSetup) {
			// Let parent component handle collision force setup completely
			onCollisionForceSetup(forceGraph.current);
		} else {
			forceGraph.current?.d3Force('collision', forceCollide(10));
		}
	}, [dagMode, onCollisionForceSetup]);

	const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
	const [hoverLinkId, setHoverLinkId] = useState<string | null>(null);
	const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

	// FPS counter ref
	const fpsCounterRef = useRef<FpsCounterRef>(null);

	const nodeRenderFunction = useMemo(() => {
		const hasHighlights = graphData.nodes.some((node) => node.isHighlighted);
		return LinkRenderUtils.getNodeRenderFunction(hoverNodeId, selectedNodes, themeColors, hasHighlights);
	}, [hoverNodeId, selectedNodes, themeColors, graphData.nodes]);

	const linkParticleRenderFunction = useMemo(
		() => LinkRenderUtils.getLinkParticleRenderFunction(themeColors),
		[themeColors],
	);

	const linksInvolvedInHighlight = useMemo(() => {
		return GraphDataUtils.getLinksInvolvedInHighlight(graphData, selectedNodes);
	}, [selectedNodes, graphData]);

	// Auto zoom functionality
	// Automatically zoom to fit the graph when it changes, but have any user interaction disable auto zoom
	const [autoZoom, setAutoZoom] = useState(false);

	// Responsive minimum zoom based on screen dimensions
	const [minZoom, setMinZoom] = useState(() => {
		const graphWidth = width ?? (typeof window !== 'undefined' ? window.innerWidth : 800);
		const graphHeight = height ?? (typeof window !== 'undefined' ? window.innerHeight : 600);
		return calculateResponsiveMinZoom(graphWidth, graphHeight);
	});

	// Default padding if none provided
	const effectivePadding = zoomPadding ?? DEFAULT_ZOOM_PADDING;

	useInterval(() => {
		if (forceGraph.current && autoZoom) {
			const graphWidth = width ?? (typeof window !== 'undefined' ? window.innerWidth : 800);
			const graphHeight = height ?? (typeof window !== 'undefined' ? window.innerHeight : 600);
			ZoomUtils.customZoomToFit(
				forceGraph.current,
				graphData,
				graphWidth,
				graphHeight,
				effectivePadding,
				ZOOM_CONFIG.zoomToFitTime,
			);
		}
	}, ZOOM_CONFIG.autoZoomInterval);

	// Update minimum zoom when screen size changes
	useEffect(() => {
		const graphWidth = width ?? (typeof window !== 'undefined' ? window.innerWidth : 800);
		const graphHeight = height ?? (typeof window !== 'undefined' ? window.innerHeight : 600);
		const newMinZoom = calculateResponsiveMinZoom(graphWidth, graphHeight);

		if (newMinZoom !== minZoom) {
			setMinZoom(newMinZoom);
			// Trigger auto zoom when minimum zoom changes to re-fit the view
			setAutoZoom(true);
		}
	}, [width, height, minZoom]);

	// Restart auto zoom after graph data changes, but turn it off after 1 second
	useEffect(() => setAutoZoom(true), [width, height, dagMode]);
	useEffect(() => {
		const timeout = setTimeout(() => setAutoZoom(false), ZOOM_CONFIG.autoZoomDisableDelay);
		return () => clearTimeout(timeout);
	}, [autoZoom, graphData, width, height, dagMode]);

	// Any canvas interaction should disable auto zoom
	const onCanvasInteraction = useCallback(() => {
		setAutoZoom(false);
	}, []);

	// Expose imperative handle for external control
	useImperativeHandle(ref, () => ({
		enableAutoZoom: () => setAutoZoom(true),
		disableAutoZoom: () => setAutoZoom(false),
		isAutoZoomEnabled: () => autoZoom,
	}));

	// Update tooltip position when node is hovered
	const updateTooltip = useCallback(
		(node: NodeObject<ForceDirectedGraphNode> | null) => {
			const tooltipData = InteractionUtils.updateTooltip(node, getNodeTooltip, forceGraph);
			setTooltipData(tooltipData);
		},
		[getNodeTooltip],
	);

	// Zoom interaction is disabled when auto zoom is enabled
	// Need to use a timeout to account for the last zoomToFit call
	const [enableZoomInteraction, setEnableZoomInteraction] = useState(true);
	useEffect(() => {
		if (autoZoom) {
			setEnableZoomInteraction(false);
		} else {
			const timeout = setTimeout(() => setEnableZoomInteraction(true), ZOOM_CONFIG.zoomToFitTime);
			return () => {
				clearTimeout(timeout);
			};
		}
	}, [autoZoom]);

	// outside component body or in a ref:
	const programmaticZoomRef = useRef(false);
	const rafRef = useRef<number | null>(null);

	// WebGL render function ref and fade controller
	const webglRenderRef = useRef<((transform: DOMMatrix) => void) | null>(null);
	const fadeControllerRef = useRef<{
		fadeIn: (duration: number) => void;
		fadeOut: (duration: number) => void;
		resetAlpha: (alpha: number) => void;
	} | null>(null);

	const onReady = useCallback(
		(
			renderFn: (transform: DOMMatrix) => void,
			fadeController?: {
				fadeIn: (duration: number) => void;
				fadeOut: (duration: number) => void;
				resetAlpha: (alpha: number) => void;
			},
		) => {
			webglRenderRef.current = renderFn;
			fadeControllerRef.current = fadeController || null;
			if (fadeController && onStarfieldReady) {
				onStarfieldReady(fadeController);
			}
		},
		[onStarfieldReady],
	);

	return (
		<div className="force-graph-container" style={{ position: 'relative' }}>
			<Starfield
				bounds={GRAPH_BOUNDS}
				starCount={RENDER_CONFIG.starfield.starCount}
				color={[
					RENDER_CONFIG.starfield.color,
					RENDER_CONFIG.starfield.color,
					RENDER_CONFIG.starfield.color,
				].join(',')}
				startInvisible={!starfieldStartVisible}
				onReady={onReady}
			/>
			<ForceGraph2D<ForceDirectedGraphNode, ForceDirectedGraphLink>
				width={width ?? (typeof window !== 'undefined' ? window.innerWidth : 800)}
				height={height ?? (typeof window !== 'undefined' ? window.innerHeight : 600)}
				graphData={graphData}
				ref={forceGraph}
				dagMode={dagMode}
				cooldownTime={FORCE_CONFIG.cooldownTime}
				enableZoomInteraction={enableZoomInteraction}
				autoPauseRedraw={false}
				onEngineStop={() => setAutoZoom(false)}
				linkDirectionalParticles="value"
				linkDirectionalParticleSpeed={(d) => LinkRenderUtils.getLinkSpeed(d, linksInvolvedInHighlight)}
				linkDirectionalParticleCanvasObject={linkParticleRenderFunction}
				nodeCanvasObject={(providedNode, ctx, globalScale) => {
					if (InteractionUtils.shouldRenderNode(providedNode.id, selectedNodes, hoverNodeId)) return;
					nodeRenderFunction(providedNode, ctx, globalScale);
				}}
				onRenderFramePre={(ctx, globalScale) => {
					// Sync transform to WebGL
					const transform = ctx.getTransform();
					if (webglRenderRef.current) {
						webglRenderRef.current(transform);
					}
				}}
				onRenderFramePost={(ctx, globalScale) => {
					// Update FPS counter
					fpsCounterRef.current?.updateFps();

					for (const node of graphData.nodes) {
						if (InteractionUtils.shouldRenderNode(node.id, selectedNodes, hoverNodeId)) {
							nodeRenderFunction(node, ctx, globalScale);
						}
						if (node.id === hoverNodeId) {
							updateTooltip(node);
						}
					}
					if (hoverNodeId === null) {
						setTooltipData(null);
					}
				}}
				minZoom={minZoom}
				nodePointerAreaPaint={(node, color, ctx) => {
					if (!isExtendedNodeObject(node)) return;
					ctx.fillStyle = color;
					ctx.fillRect(
						node.x - node.backgroundDimensions.width / 2,
						node.y - node.backgroundDimensions.height / 2,
						node.backgroundDimensions.width,
						node.backgroundDimensions.height,
					);
				}}
				linkColor={(link) => LinkRenderUtils.getLinkColor(link, themeColors)}
				linkWidth={(link) => LinkRenderUtils.getLinkWidth(link, hoverLinkId, linksInvolvedInHighlight)}
				onNodeHover={(node) =>
					InteractionUtils.handleNodeHover(node, setHoverNodeId, setTooltipData, getNodeTooltip, forceGraph)
				}
				onNodeClick={(node, event) =>
					InteractionUtils.handleNodeClick(node, event, selectionState, onCanvasInteraction)
				}
				onBackgroundClick={() => InteractionUtils.handleBackgroundClick(selectionState, onCanvasInteraction)}
				onLinkHover={(link) => InteractionUtils.handleLinkHover(link, setHoverLinkId)}
				onLinkClick={() => InteractionUtils.handleGenericInteraction(onCanvasInteraction)}
				onLinkRightClick={() => InteractionUtils.handleGenericInteraction(onCanvasInteraction)}
				onNodeRightClick={() => InteractionUtils.handleGenericInteraction(onCanvasInteraction)}
				onNodeDrag={() => InteractionUtils.handleGenericInteraction(onCanvasInteraction)}
				onBackgroundRightClick={() => InteractionUtils.handleGenericInteraction(onCanvasInteraction)}
				onZoom={({ x, y, k }) => {
					// ignore our own programmatic centre changes
					if (programmaticZoomRef.current || !forceGraph.current) return;

					const c = ZoomUtils.clampWithMargin(x, y, GRAPH_BOUNDS);
					if (ZoomUtils.needsRecentre(x, y, c)) {
						ZoomUtils.safeCenterAt(forceGraph.current, c.x, c.y, programmaticZoomRef, rafRef);
					}
				}}
				{...rest}
			/>
			<div className="auto-zoom-button-container">
				{autoZoom ? (
					<div className="auto-zoom-spinner">
						<Spinner size={UI_CONFIG.spinnerSize} color="primary-500" />
					</div>
				) : (
					<button onClick={() => setAutoZoom(true)} className="auto-zoom-button" title="Fit to view">
						<MaterialIcon name={'fit_page'} size={16} color="neutral-600" />
					</button>
				)}
			</div>
			<FpsCounter ref={fpsCounterRef} />
			{tooltipData && (
				<Tippy
					visible={true}
					placement="top"
					interactive={true}
					arrow={true}
					duration={UI_CONFIG.tooltip.duration}
					offset={UI_CONFIG.tooltip.offset}
					getReferenceClientRect={() => InteractionUtils.createTooltipRect(tooltipData.x, tooltipData.y)}
					className="dependency-graph-tooltip"
					{...tooltipData.TippyProps}
				>
					<div />
				</Tippy>
			)}
		</div>
	);
});

ForceDirectedGraph.displayName = 'ForceDirectedGraph';

export default ForceDirectedGraph;
