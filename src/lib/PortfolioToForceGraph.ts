import type {
	ForceDirectedGraphNode,
	ForceDirectedGraphData,
	ForceDirectedGraphLink,
} from '~/components/ForceGraph/Common';
import { type Graph, type Node, type Edge } from '~/lib/PortfolioStore';
import type { Directive } from './ai/directiveTools';

export type SyntheticNode = TimelineNode;

// Timeline-specific types
type TimelineNode = Node & {
	type: 'timeline-month';
};

// Generate a reasonable value for link weight based on relationship
function calculateLinkValue(edge: Edge, sourceNode: Node, targetNode: Node): number {
	// Base value
	let value = 1;

	// Increase value for important relationships
	if (edge.rel === 'used' || edge.rel === 'built' || edge.rel === 'worked_as') {
		value = 3;
	} else if (edge.rel === 'learned' || edge.rel === 'evidence') {
		value = 2;
	} else if (edge.rel === 'happened_during' || edge.rel === 'timeline') {
		value = 1.5;
	}

	// Boost for person connections (central node)
	if (sourceNode.type === 'person' || targetNode.type === 'person') {
		value += 2;
	}

	return value;
}

// Common timeline infrastructure
function getCurrentMonth(): string {
	return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

function createTimelineSpine(
	months: string[],
	currentMonth: string,
): {
	timelineNodes: TimelineNode[];
	timelineEdges: Edge[];
} {
	const sortedMonths = Array.from(months).sort();

	// Create timeline nodes (non-selectable)
	const timelineNodes: TimelineNode[] = sortedMonths.map((month) => ({
		id: `timeline_${month}`,
		type: 'timeline-month',
		label: month === currentMonth ? 'Present' : month,
		summary: `Timeline: ${month}`,
		tags: ['timeline'],
	}));

	// Create timeline spine edges (connect consecutive months)
	const timelineEdges: Edge[] = [];
	for (let i = 0; i < sortedMonths.length - 1; i++) {
		timelineEdges.push({
			id: `timeline_spine_${i}`,
			source: `timeline_${sortedMonths[i]}`,
			target: `timeline_${sortedMonths[i + 1]}`,
			rel: 'timeline-marker',
		});
	}

	return { timelineNodes, timelineEdges };
}

function createAttachmentEdges<T extends Node>(nodes: T[], getStartMonth: (node: T) => string): Edge[] {
	return nodes.map((node, index) => ({
		id: `timeline_attach_${index}`,
		source: `timeline_${getStartMonth(node)}`,
		target: node.id,
		rel: 'timeline',
	}));
}

// Transform portfolio data to career timeline view (roles only)
function transformToCareerTimelineGraph(portfolio: Graph): Graph {
	const currentMonth = getCurrentMonth();
	const filteredNodes = portfolio.nodes.filter((node) => node.type === 'role');

	// Extract unique timeline months from role nodes (start dates only)
	const timelineMonths = new Set<string>();
	filteredNodes.forEach((node) => {
		if (node.type === 'role' && node.period) {
			timelineMonths.add(node.period.start);
		}
	});
	timelineMonths.add(currentMonth); // Always include present

	const { timelineNodes, timelineEdges } = createTimelineSpine(Array.from(timelineMonths), currentMonth);
	const attachmentEdges = createAttachmentEdges(filteredNodes, (node) =>
		node.type === 'role' && node.period ? node.period.start : '',
	);

	return {
		nodes: [...timelineNodes, ...filteredNodes],
		edges: [...timelineEdges, ...attachmentEdges],
		meta: portfolio.meta,
	};
}

// Transform portfolio data to skills timeline view (skills with "learned" dates)
function transformToSkillsTimelineGraph(portfolio: Graph): Graph {
	const currentMonth = getCurrentMonth();
	const skillNodes = portfolio.nodes.filter((node) => node.type === 'skill');

	// Transform skill nodes to show when they were first learned
	const transformedSkills = skillNodes.map((skill) => {
		const firstYear = skill.years ? Math.min(...skill.years) : new Date().getFullYear();
		const startDate = `${firstYear}-01`;

		return {
			...skill,
			period: {
				start: startDate,
				end: 'present' as const,
			},
		} as Node & { period: { start: string; end: string } };
	});

	// Extract unique timeline months from transformed skills (start dates only)
	const timelineMonths = new Set<string>();
	transformedSkills.forEach((skill) => {
		if (skill.period) {
			timelineMonths.add(skill.period.start);
		}
	});
	timelineMonths.add(currentMonth); // Always include present

	const { timelineNodes, timelineEdges } = createTimelineSpine(Array.from(timelineMonths), currentMonth);
	const attachmentEdges = createAttachmentEdges(transformedSkills, (skill) => skill.period.start);

	return {
		nodes: [...timelineNodes, ...transformedSkills],
		edges: [...timelineEdges, ...attachmentEdges],
		meta: portfolio.meta,
	};
}

// Transform portfolio data to projects timeline view (projects only)
function transformToProjectsTimelineGraph(portfolio: Graph): Graph {
	const currentMonth = getCurrentMonth();
	const filteredNodes = portfolio.nodes.filter((node) => node.type === 'project');

	// Extract unique timeline months from project nodes (start dates only)
	const timelineMonths = new Set<string>();
	filteredNodes.forEach((node) => {
		if (node.type === 'project' && node.period) {
			timelineMonths.add(node.period.start);
		}
	});
	timelineMonths.add(currentMonth); // Always include present

	const { timelineNodes, timelineEdges } = createTimelineSpine(Array.from(timelineMonths), currentMonth);
	const attachmentEdges = createAttachmentEdges(filteredNodes, (node) =>
		node.type === 'project' && node.period ? node.period.start : '',
	);

	return {
		nodes: [...timelineNodes, ...filteredNodes],
		edges: [...timelineEdges, ...attachmentEdges],
		meta: portfolio.meta,
	};
}

export function portfolioToForceGraph(portfolio: Graph, directive: Directive): ForceDirectedGraphData {
	// Apply mode-specific transformations
	let transformedGraph = portfolio;

	if (directive.mode === 'timeline') {
		// Use the variant to determine which timeline type
		if (directive.data.variant === 'career') {
			transformedGraph = transformToCareerTimelineGraph(portfolio);
		} else if (directive.data.variant === 'skills') {
			transformedGraph = transformToSkillsTimelineGraph(portfolio);
		} else if (directive.data.variant === 'projects') {
			transformedGraph = transformToProjectsTimelineGraph(portfolio);
		}
	}

	// Create a map for quick node lookup
	const nodeMap = new Map(transformedGraph.nodes.map((node) => [node.id, node]));

	// Get highlights from directive
	const highlights = directive.data.highlights || [];
	const highlightSet = new Set(highlights);

	// Transform nodes
	const nodes: ForceDirectedGraphNode[] = transformedGraph.nodes.map((node) => ({
		itemName: node.label,
		...node,
		// Mark timeline nodes as non-selectable
		selectable: node.type === 'timeline-month' ? false : undefined,
		// Mark nodes as highlighted if they're in the highlights array
		isHighlighted: highlightSet.has(node.id),
	}));

	// Transform edges (only include edges where both nodes exist)
	const links: ForceDirectedGraphLink[] = transformedGraph.edges
		.filter((link) => nodeMap.get(link.source) && nodeMap.get(link.target))
		.map((edge) => {
			const sourceNode = nodeMap.get(edge.source);
			const targetNode = nodeMap.get(edge.target);

			return {
				id: edge.id,
				source: edge.source,
				target: edge.target,
				rel: edge.rel,
				value: calculateLinkValue(edge, sourceNode!, targetNode!),
				colour: undefined,
			};
		});

	return {
		nodes,
		links,
	};
}

// Helper to get filtered data based on directive highlights
export function getFilteredForceGraphData(
	portfolio: Graph,
	highlights: string[],
	directive: Directive,
): ForceDirectedGraphData {
	if (!highlights || highlights.length === 0) {
		return portfolioToForceGraph(portfolio, directive);
	}

	// Get highlighted nodes and their connected nodes
	const highlightedNodeIds = new Set(highlights);
	const connectedNodeIds = new Set<string>();

	// Find all edges connected to highlighted nodes
	const relevantEdges = portfolio.edges.filter((edge) => {
		const isRelevant = highlightedNodeIds.has(edge.source) || highlightedNodeIds.has(edge.target);
		if (isRelevant) {
			connectedNodeIds.add(edge.source);
			connectedNodeIds.add(edge.target);
		}
		return isRelevant;
	});

	// Get all relevant nodes (highlighted + connected)
	const relevantNodes = portfolio.nodes.filter((node) => connectedNodeIds.has(node.id));

	// Create filtered graph
	const filteredGraph: Graph = {
		nodes: relevantNodes,
		edges: relevantEdges,
	};

	return portfolioToForceGraph(filteredGraph, directive);
}
