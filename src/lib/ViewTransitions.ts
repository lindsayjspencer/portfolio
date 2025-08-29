import type { DirectiveType } from './DirectiveTool';
import type { ForceDirectedGraphData } from '~/components/ForceGraph/Common';
import type { Graph } from './PortfolioStore';
import { getFilteredForceGraphData, portfolioToForceGraph } from './PortfolioToForceGraph';

export type TransitionPhase = 'entering' | 'stable' | 'exiting';

export interface DataSnapshot {
	forceGraphData: ForceDirectedGraphData;
	directive: DirectiveType;
}

export interface ViewInstanceState {
	mode: DirectiveType['mode'];
	phase: TransitionPhase;
	zIndex: number;
	key: string; // Unique key for React rendering
	dataSnapshot: DataSnapshot; // Required snapshot of data/directive at instance creation
}

export interface ViewTransitionState {
	instances: ViewInstanceState[];
	isTransitioning: boolean;
}

export interface TransitionCallbacks {
	onTransitionIn: (duration: number) => Promise<void>;
	onTransitionOut: (duration: number) => Promise<void>;
}

/**
 * Per-component transition timing configuration
 */
export const COMPONENT_TRANSITION_TIMINGS = {
	landing: { in: 400, out: 300 },
	timeline: { in: 1000, out: 1000 }, // ForceGraph needs more time for complex animations
	play: { in: 2000, out: 2000 },
	projects: { in: 400, out: 300 },
	skills: { in: 400, out: 300 },
	values: { in: 400, out: 300 },
	compare: { in: 400, out: 300 },
} as const;

/**
 * Creates a data snapshot for a view instance
 */
export function createDataSnapshot(graph: Graph, directive: DirectiveType): DataSnapshot {
	const { mode, highlights } = directive;
	const forceGraphData =
		highlights && highlights.length > 0
			? getFilteredForceGraphData(graph, highlights, mode)
			: portfolioToForceGraph(graph, mode);

	return {
		forceGraphData,
		directive,
	};
}
