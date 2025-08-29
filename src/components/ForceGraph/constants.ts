import type { ZoomPadding } from './ZoomUtils';

/**
 * Graph world bounds - defines the navigable area of the graph
 * Units are in world coordinates (not pixels)
 */
export const GRAPH_BOUNDS = {
	minX: -300,
	maxX: 300,
	minY: -200,
	maxY: 200,
} as const;

/**
 * Auto-zoom timing configuration
 */
export const ZOOM_CONFIG = {
	/** Duration for zoom-to-fit animations in milliseconds */
	zoomToFitTime: 1000,
	
	/** How often to check and apply auto-zoom (fraction of zoomToFitTime) */
	autoZoomInterval: 1000 / 3, // zoomToFitTime / 3
	
	/** Delay before disabling auto-zoom after graph changes */
	autoZoomDisableDelay: 2000,
	
	/** Maximum zoom level (10x) */
	maxZoom: 10,
	
	/** Minimum zoom level */
	minZoom: 2,
} as const;

/**
 * Default padding for zoom-to-fit operations
 * Ensures content doesn't touch the edges of the viewport
 */
export const DEFAULT_ZOOM_PADDING: ZoomPadding = {
	top: 50,
	right: 50,
	bottom: 50,
	left: 50,
} as const;

/**
 * Force simulation configuration
 */
export const FORCE_CONFIG = {
	/** Collision detection radius for DAG mode */
	collisionRadius: 20,
	
	/** Simulation cooldown time in milliseconds */
	cooldownTime: 3000,
} as const;

/**
 * Rendering configuration
 */
export const RENDER_CONFIG = {
	/** WebGL starfield configuration */
	starfield: {
		starCount: 1200,
		color: 200, // RGB value (200, 200, 200)
	},
	
	/** Link particle animation speeds */
	particleSpeed: {
		highlighted: 0.0015,
		normal: 0.0001,
	},
	
	/** Link width configurations */
	linkWidth: {
		hovered: 5,
		highlighted: 3,
		normal: 1,
	},
} as const;

/**
 * UI component configuration
 */
export const UI_CONFIG = {
	/** Tooltip configuration */
	tooltip: {
		offset: [0, 24] as [number, number],
		duration: [0, 0] as [number, number],
	},
	
	/** Auto-zoom spinner size */
	spinnerSize: 16,
} as const;