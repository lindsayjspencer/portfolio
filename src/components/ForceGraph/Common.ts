import type { NodeObject } from 'react-force-graph-2d';
import type { EdgeRel, Node } from '~/lib/PortfolioStore';
import type { SyntheticNode } from '~/lib/PortfolioToForceGraph';

export interface ForceDirectedGraphData {
	nodes: ForceDirectedGraphNode[];
	links: ForceDirectedGraphLink[];
}

// Simplified base type to avoid complex union issues
export type ForceDirectedGraphNode = Node & {
	itemName: string;
	selectable?: boolean;
	isHighlighted?: boolean;
	singleLine?: boolean;
};

export interface ForceDirectedGraphLink {
	id: string;
	source: string | ForceDirectedGraphNode;
	target: string | ForceDirectedGraphNode;
	value: number;
	rel: EdgeRel;
	colour?: string;
	arrowColour?: string;
}

export type ExtendedNodeObject = NodeObject<ForceDirectedGraphNode> & {
	x: number;
	y: number;
	backgroundDimensions: {
		width: number;
		height: number;
	};
};

export const isExtendedNodeObject = (node: NodeObject<ForceDirectedGraphNode>): node is ExtendedNodeObject => {
	return (
		typeof node.x === 'number' &&
		typeof node.y === 'number' &&
		typeof (node as ExtendedNodeObject).backgroundDimensions?.width === 'number' &&
		typeof (node as ExtendedNodeObject).backgroundDimensions?.height === 'number'
	);
};

// Shared geometry types
export type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
