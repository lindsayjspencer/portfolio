import type {
	ForceDirectedGraphNode,
	ForceDirectedGraphData,
	ForceDirectedGraphLink,
} from '~/components/ForceGraph/Common';
import { type Graph, type Node, type Edge } from '~/lib/PortfolioStore';
import type { DirectiveType } from './DirectiveTool';

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

// Get color for links based on relationship type
function getLinkColor(edge: Edge): string {
	switch (edge.rel) {
		case 'used':
		case 'learned':
			return '#10b981'; // Green for skill relationships
		case 'built':
			return '#3b82f6'; // Blue for projects
		case 'worked_as':
			return '#8b5cf6'; // Purple for roles
		case 'evidence':
			return '#ef4444'; // Red for values evidence
		case 'happened_during':
		case 'timeline-marker':
			return '#f59e0b'; // Yellow for time/story relationships
		case 'led':
		case 'mentored':
			return '#f97316'; // Orange for leadership
		case 'impacted':
			return '#06b6d4'; // Cyan for impact
		default:
			return '#06b6d4'; // Use theme default
	}
}

// Common timeline infrastructure
function getCurrentMonth(): string {
	return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

function createTimelineSpine(months: string[], currentMonth: string): {
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
		(node.type === 'role' && node.period) ? node.period.start : ''
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
				end: 'present' as const
			}
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

// Transform portfolio data to timeline view (original combined timeline)
function transformToTimelineGraph(portfolio: Graph): Graph {
	const currentMonth = getCurrentMonth();
	const excludedTypes = new Set(['skill', 'value']);
	const filteredNodes = portfolio.nodes.filter((node) => !excludedTypes.has(node.type));

	// Extract unique timeline months from temporal nodes (start dates only)
	const timelineMonths = new Set<string>();
	filteredNodes.forEach((node) => {
		if ((node.type === 'role' || node.type === 'project') && node.period) {
			timelineMonths.add(node.period.start);
		}
	});
	timelineMonths.add(currentMonth); // Always include present

	const { timelineNodes, timelineEdges } = createTimelineSpine(Array.from(timelineMonths), currentMonth);

	// Filter nodes that have temporal data (only roles and projects, from already filtered nodes)
	const temporalNodes = filteredNodes.filter((node) => {
		return (node.type === 'role' || node.type === 'project') && node.period;
	});

	// Create attachment edges from timeline months to temporal nodes
	const attachmentEdges = createAttachmentEdges(temporalNodes, (node) => 
		(node.type === 'role' || node.type === 'project') ? node.period.start : ''
	);

	// Create filtered node ID map for fast lookup (already excluding skills, values, stories)
	const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
	const temporalNodeIds = new Set(temporalNodes.map((n) => n.id));

	// Filter edges to only include those between valid nodes (no skills, values, stories)
	const validEdges = portfolio.edges.filter((edge) => {
		const sourceExists = filteredNodeIds.has(edge.source);
		const targetExists = filteredNodeIds.has(edge.target);

		// Only keep edges where both source and target exist in filtered nodes
		return sourceExists && targetExists;
	});

	// Get edges that involve temporal nodes (but exclude person connections)
	const connectedEdges = validEdges.filter((edge) => {
		const sourceIsTemporal = temporalNodeIds.has(edge.source);
		const targetIsTemporal = temporalNodeIds.has(edge.target);
		const sourceNode = filteredNodes.find((n) => n.id === edge.source);
		const targetNode = filteredNodes.find((n) => n.id === edge.target);

		// Exclude person connections
		const sourceIsPerson = sourceNode?.type === 'person';
		const targetIsPerson = targetNode?.type === 'person';

		// Keep edges that involve temporal nodes, but exclude person connections
		return (sourceIsTemporal || targetIsTemporal) && !sourceIsPerson && !targetIsPerson;
	});

	// Start with temporal nodes (roles and projects)
	const connectedNodeIds = new Set(temporalNodes.map((n) => n.id));

	// Add connected nodes from edges
	connectedEdges.forEach((edge) => {
		connectedNodeIds.add(edge.source);
		connectedNodeIds.add(edge.target);
	});

	// Filter nodes to only include temporal and connected nodes (excluding person)
	const filteredOriginalNodes = filteredNodes.filter(
		(node) => connectedNodeIds.has(node.id) && node.type !== 'person',
	);

	// Combine all nodes and edges
	const allNodes = [...timelineNodes, ...filteredOriginalNodes];
	const allEdges = [...timelineEdges, ...attachmentEdges, ...connectedEdges];

	return {
		nodes: allNodes,
		edges: allEdges,
		meta: portfolio.meta,
	};
}

export function portfolioToForceGraph(portfolio: Graph, mode: DirectiveType['mode']): ForceDirectedGraphData {
	// Apply mode-specific transformations
	let transformedGraph = portfolio;

	if (mode === 'timeline') {
		transformedGraph = transformToTimelineGraph(portfolio);
	} else if (mode === 'career-timeline') {
		transformedGraph = transformToCareerTimelineGraph(portfolio);
	} else if (mode === 'skills-timeline') {
		transformedGraph = transformToSkillsTimelineGraph(portfolio);
	}

	// Create a map for quick node lookup
	const nodeMap = new Map(transformedGraph.nodes.map((node) => [node.id, node]));

	// Transform nodes
	const nodes: ForceDirectedGraphNode[] = transformedGraph.nodes.map((node) => ({
		itemName: node.label,
		...node,
		// Mark timeline nodes as non-selectable
		selectable: node.type === 'timeline-month' ? false : undefined,
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
				colour: getLinkColor(edge),
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
	mode: DirectiveType['mode'],
): ForceDirectedGraphData {
	if (!highlights || highlights.length === 0) {
		return portfolioToForceGraph(portfolio, mode);
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

	return portfolioToForceGraph(filteredGraph, mode);
}

// Helper to update node emphasis based on highlights
export function updateNodeEmphasis(data: ForceDirectedGraphData, highlights?: string[]): ForceDirectedGraphData {
	if (!highlights || highlights.length === 0) {
		return data;
	}

	const highlightSet = new Set(highlights);

	// You could modify node properties here for emphasis
	// For now, the highlighting is handled by the component itself

	return data;
}
