import type { NodeObject } from 'react-force-graph-2d';
import type { EdgeRel, Node } from '~/lib/PortfolioStore';

// Import BaseNode privately for AnchorNode
interface BaseNode {
	id: string;
	type: string;
	label: string;
	summary?: string;
	description?: string;
	tags?: string[];
	years?: [number, number];
}

export interface ForceDirectedGraphData {
	nodes: ForceDirectedGraphNode[];
	links: ForceDirectedGraphLink[];
}

// UI props added to all nodes rendered by the ForceDirectedGraph
type ForceNodeUI = {
	itemName: string;
	selectable?: boolean;
	isHighlighted?: boolean;
	singleLine?: boolean;
};

// AnchorNode type (synthetic node type)
export type AnchorNode = BaseNode & {
	type: 'anchor'; // synthetic node type (NOT part of portfolio Graph)
	anchorKind: AnchorKind; // layout intent
	// seed positions (px); ForceGraph reads these as fixed if set
	fx?: number;
	fy?: number;
	// optional style hints for renderer
	radius?: number; // draw size
	tint?: string; // colour hint (e.g. for hulls/badges)
};

// All nodes rendered in the force graph = portfolio Node OR AnchorNode + UI props
export type ForceDirectedGraphNode = (Node | AnchorNode) & ForceNodeUI;

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

// Anchor types for compare views
export type AnchorKind =
	// compare: skills (venn)
	| 'skill-left'
	| 'skill-right'
	| 'skill-overlap'
	// compare: projects (side-by-side)
	| 'project-left'
	| 'project-right'
	| 'project-overlap'
	// compare: frontend vs backend (spectrum)
	| 'axis-frontend'
	| 'axis-backend'
	| 'axis-fullstack';

// Type guard to detect anchor nodes within the force-graph domain
export const isAnchorNode = (n: ForceDirectedGraphNode): n is AnchorNode & ForceNodeUI =>
	n.type === 'anchor' && 'anchorKind' in n;

// (Optional) link rels your renderer can style
export type CompareLinkRel =
	| 'attracts' // anchor → child
	| 'overlap' // child belongs to both sides
	| 'compares' // anchor ↔ anchor (thin, for context)
	| 'evidence' // if you show supporting edges
	| 'belongs_to'; // generic grouping

// Factory helpers for clean transforms
export function makeAnchor(
	id: string,
	kind: AnchorKind,
	label: string,
	opts?: { fx?: number; fy?: number; radius?: number; tint?: string },
): AnchorNode & ForceNodeUI {
	return {
		id,
		type: 'anchor',
		anchorKind: kind,
		itemName: label,
		label,
		selectable: false,
		isHighlighted: false,
		...(opts?.fx !== undefined ? { fx: opts.fx } : {}),
		...(opts?.fy !== undefined ? { fy: opts.fy } : {}),
		...(opts?.radius !== undefined ? { radius: opts.radius } : {}),
		...(opts?.tint !== undefined ? { tint: opts.tint } : {}),
	};
}

export function linkToAnchor(
	childId: string,
	anchorId: string,
	idSuffix: string,
	rel: CompareLinkRel | EdgeRel = 'attracts',
	value = 1,
): ForceDirectedGraphLink {
	return {
		id: `a_${anchorId}_${childId}_${idSuffix}`,
		source: anchorId,
		target: childId,
		value,
		rel: rel as EdgeRel,
	};
}

export function connectAnchors(
	aId: string,
	bId: string,
	idSuffix: string,
	rel: CompareLinkRel | EdgeRel = 'compares',
): ForceDirectedGraphLink {
	return {
		id: `aa_${aId}_${bId}_${idSuffix}`,
		source: aId,
		target: bId,
		value: 0.2,
		rel: rel as EdgeRel,
	};
}
