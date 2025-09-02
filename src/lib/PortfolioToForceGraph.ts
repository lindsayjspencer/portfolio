import type {
	ForceDirectedGraphNode,
	ForceDirectedGraphData,
	ForceDirectedGraphLink,
	AnchorNode,
} from '~/components/ForceGraph/Common';
import { makeAnchor, linkToAnchor, connectAnchors } from '~/components/ForceGraph/Common';
import { type Graph, type Node, type Edge, type SkillNode, type ProjectNode } from '~/lib/PortfolioStore';
import type { Directive, CompareDirective } from './ai/directiveTools';

// Utility to detect mobile layout and adjust anchor positions
function isMobileLayout(): boolean {
	if (typeof window === 'undefined') return false;
	return window.innerWidth <= 768;
}

function getAnchorPositions(type: 'venn' | 'sideBySide' | 'spectrum'): {
	left: { fx: number; fy: number };
	right: { fx: number; fy: number };
	center?: { fx: number; fy: number };
} {
	const isMobile = isMobileLayout();
	
	if (type === 'venn') {
		if (isMobile) {
			return {
				left: { fx: 0, fy: -150 },
				right: { fx: 0, fy: 150 },
				center: { fx: 0, fy: 0 }
			};
		}
		return {
			left: { fx: -220, fy: 0 },
			right: { fx: 220, fy: 0 },
			center: { fx: 0, fy: 0 }
		};
	}
	
	if (type === 'sideBySide') {
		if (isMobile) {
			return {
				left: { fx: 0, fy: -200 },
				right: { fx: 0, fy: 200 }
			};
		}
		return {
			left: { fx: -220, fy: 0 },
			right: { fx: 220, fy: 0 }
		};
	}
	
	if (type === 'spectrum') {
		if (isMobile) {
			return {
				left: { fx: 0, fy: -180 },
				right: { fx: 0, fy: 180 },
				center: { fx: 0, fy: 0 }
			};
		}
		return {
			left: { fx: -240, fy: 0 },
			right: { fx: 240, fy: 0 },
			center: { fx: 0, fy: 0 }
		};
	}
	
	return { left: { fx: -220, fy: 0 }, right: { fx: 220, fy: 0 } };
}

export type SyntheticNode = TimelineNode | TagNode | AnchorNode;

// Timeline-specific types
type TimelineNode = Node & {
	type: 'timeline-month';
};

// Tag-specific types
type TagNode = Node & {
	type: 'tag';
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

// Transform portfolio data to values mindmap view (person → values → evidence + tags)
function transformToValuesMindmapGraph(portfolio: Graph, directive: Directive): Graph {
	const me = portfolio.nodes.find((n) => n.type === 'person')!;
	const values = portfolio.nodes.filter((n) => n.type === 'value');
	const stories = portfolio.nodes.filter((n) => n.type === 'story');
	const projects = portfolio.nodes.filter((n) => n.type === 'project');

	const nodes: Node[] = [me, ...values];
	const edges: Edge[] = [];
	const tagNodes: TagNode[] = [];

	// Add person → value edges
	for (const value of values) {
		edges.push({
			id: `pv_${value.id}`,
			source: me.id,
			target: value.id,
			rel: 'values',
		});

		// Create tag nodes from value tags and connect them to the value
		if (value.tags && value.tags.length > 0) {
			value.tags.forEach((tag, index) => {
				const tagId = `tag_${value.id}_${tag}`;
				const tagNode: TagNode = {
					id: tagId,
					type: 'tag',
					label: tag,
					summary: `Tag: ${tag}`,
					tags: ['tag'],
				};

				tagNodes.push(tagNode);
				edges.push({
					id: `vt_${value.id}_${index}`,
					source: value.id,
					target: tagId,
					rel: 'evidence',
				});
			});
		}
	}

	// Add tag nodes to the main nodes array
	nodes.push(...tagNodes);

	// Add evidence (roles/stories/projects) → value based on existing edges
	const evidenceRels = new Set(['evidence', 'practiced', 'exemplifies', 'happened_during']);
	for (const edge of portfolio.edges) {
		if (!edge.rel || !edge.source || !edge.target) continue;
		const sourceNode = portfolio.nodes.find((n) => n.id === edge.source);
		const targetNode = portfolio.nodes.find((n) => n.id === edge.target);
		if (!sourceNode || !targetNode) continue;

		// Keep only (role|story|project)→value evidence edges
		if (
			targetNode.type === 'value' &&
			(sourceNode.type === 'role' || sourceNode.type === 'story' || sourceNode.type === 'project') &&
			evidenceRels.has(edge.rel)
		) {
			if (!nodes.some((n) => n.id === sourceNode.id)) {
				nodes.push(sourceNode);
			}
			edges.push({
				id: `ve_${edge.id}`,
				source: targetNode.id, // value as source
				target: sourceNode.id, // evidence as target
				rel: 'evidence',
			});
		}
	}

	return {
		nodes,
		edges,
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
	} else if (directive.mode === 'values' && directive.data.variant === 'mindmap') {
		transformedGraph = transformToValuesMindmapGraph(portfolio, directive);
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
		// Mark timeline and tag nodes as non-selectable
		selectable: node.type === 'timeline-month' || node.type === 'tag' ? false : undefined,
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

// Compare transform functions

// Transform portfolio data to compare skills (Venn-style layout)
export function portfolioToCompareSkillsGraph(portfolio: Graph, directive: CompareDirective): ForceDirectedGraphData {
	const leftSkillId = directive.leftId;
	const rightSkillId = directive.rightId;

	const leftSkill = portfolio.nodes.find((n): n is SkillNode => n.id === leftSkillId && n.type === 'skill');
	const rightSkill = portfolio.nodes.find((n): n is SkillNode => n.id === rightSkillId && n.type === 'skill');

	if (!leftSkill || !rightSkill) {
		return { nodes: [], links: [] };
	}

	// Create anchor nodes with responsive positioning
	const positions = getAnchorPositions('venn');
	const leftAnchor = makeAnchor('anchor_leftSkill', 'skill-left', leftSkill.label, {
		...positions.left,
		radius: 28,
		tint: '#3b82f6',
	});
	const rightAnchor = makeAnchor('anchor_rightSkill', 'skill-right', rightSkill.label, {
		...positions.right,
		radius: 28,
		tint: '#ef4444',
	});
	const overlapAnchor = makeAnchor('anchor_overlap', 'skill-overlap', 'Overlap', {
		...positions.center!,
		radius: 18,
		tint: '#8b5cf6',
	});

	const nodes: ForceDirectedGraphNode[] = [
		{ ...leftAnchor, itemName: leftAnchor.label, selectable: false, isHighlighted: false },
		{ ...rightAnchor, itemName: rightAnchor.label, selectable: false, isHighlighted: false },
		{ ...overlapAnchor, itemName: overlapAnchor.label, selectable: false, isHighlighted: false },
	];
	const links: ForceDirectedGraphLink[] = [];

	// Add frame connection between anchors
	links.push(connectAnchors(leftAnchor.id, rightAnchor.id, 'frame'));

	// Find projects that use these skills
	const projectNodes = portfolio.nodes.filter((n): n is ProjectNode => n.type === 'project');
	const usedEdges = portfolio.edges.filter((e) => e.rel === 'used');

	for (const project of projectNodes) {
		const usesLeft = usedEdges.some((e) => e.source === project.id && e.target === leftSkillId);
		const usesRight = usedEdges.some((e) => e.source === project.id && e.target === rightSkillId);

		if (usesLeft && usesRight) {
			// Project uses both skills - connect to both anchors and overlap
			nodes.push({
				...project,
				itemName: project.label,
				isHighlighted: directive.highlights?.includes(project.id) ?? false,
			});
			links.push(linkToAnchor(project.id, leftAnchor.id, 'both', 'overlap'));
			links.push(linkToAnchor(project.id, rightAnchor.id, 'both', 'overlap'));
			links.push(linkToAnchor(project.id, overlapAnchor.id, 'both2', 'overlap', 0.5));
		} else if (usesLeft) {
			// Project uses only left skill
			nodes.push({
				...project,
				itemName: project.label,
				isHighlighted: directive.highlights?.includes(project.id) ?? false,
			});
			links.push(linkToAnchor(project.id, leftAnchor.id, 'left'));
		} else if (usesRight) {
			// Project uses only right skill
			nodes.push({
				...project,
				itemName: project.label,
				isHighlighted: directive.highlights?.includes(project.id) ?? false,
			});
			links.push(linkToAnchor(project.id, rightAnchor.id, 'right'));
		}
	}

	return { nodes, links };
}

// Transform portfolio data to compare projects (side-by-side layout)
export function portfolioToCompareProjectsGraph(portfolio: Graph, directive: CompareDirective): ForceDirectedGraphData {
	const leftProjectId = directive.leftId;
	const rightProjectId = directive.rightId;

	const leftProject = portfolio.nodes.find((n): n is ProjectNode => n.id === leftProjectId && n.type === 'project');
	const rightProject = portfolio.nodes.find((n): n is ProjectNode => n.id === rightProjectId && n.type === 'project');

	if (!leftProject || !rightProject) {
		return { nodes: [], links: [] };
	}

	// Create anchor nodes with responsive positioning
	const positions = getAnchorPositions('sideBySide');
	const leftAnchor = makeAnchor('anchor_leftProject', 'project-left', leftProject.label, {
		...positions.left,
		radius: 30,
		tint: '#3b82f6',
	});
	const rightAnchor = makeAnchor('anchor_rightProject', 'project-right', rightProject.label, {
		...positions.right,
		radius: 30,
		tint: '#ef4444',
	});

	const nodes: ForceDirectedGraphNode[] = [
		{ ...leftAnchor, itemName: leftAnchor.label, selectable: false, isHighlighted: false },
		{ ...rightAnchor, itemName: rightAnchor.label, selectable: false, isHighlighted: false },
	];
	const links: ForceDirectedGraphLink[] = [];

	// Add frame connection between anchors
	links.push(connectAnchors(leftAnchor.id, rightAnchor.id, 'frame'));

	// Find skills that are used by these projects
	const skillNodes = portfolio.nodes.filter((n): n is SkillNode => n.type === 'skill');
	const usedEdges = portfolio.edges.filter((e) => e.rel === 'used');

	for (const skill of skillNodes) {
		const skillInLeft = usedEdges.some((e) => e.source === leftProjectId && e.target === skill.id);
		const skillInRight = usedEdges.some((e) => e.source === rightProjectId && e.target === skill.id);

		if (skillInLeft && skillInRight) {
			// Skill is used by both projects - connect to both anchors
			nodes.push({
				...skill,
				itemName: skill.label,
				isHighlighted: directive.highlights?.includes(skill.id) ?? false,
			});
			links.push(linkToAnchor(skill.id, leftAnchor.id, 'both', 'overlap'));
			links.push(linkToAnchor(skill.id, rightAnchor.id, 'both', 'overlap'));
		} else if (skillInLeft) {
			// Skill is used only by left project
			nodes.push({
				...skill,
				itemName: skill.label,
				isHighlighted: directive.highlights?.includes(skill.id) ?? false,
			});
			links.push(linkToAnchor(skill.id, leftAnchor.id, 'left'));
		} else if (skillInRight) {
			// Skill is used only by right project
			nodes.push({
				...skill,
				itemName: skill.label,
				isHighlighted: directive.highlights?.includes(skill.id) ?? false,
			});
			links.push(linkToAnchor(skill.id, rightAnchor.id, 'right'));
		}
	}

	return { nodes, links };
}

// Transform portfolio data to compare frontend vs backend (spectrum layout)
export function portfolioToCompareFrontendVsBackendGraph(
	portfolio: Graph,
	directive: CompareDirective,
): ForceDirectedGraphData {
	// Create anchor nodes with responsive positioning
	const positions = getAnchorPositions('spectrum');
	const frontendAnchor = makeAnchor('axis_frontend', 'axis-frontend', 'Frontend', {
		...positions.left,
		radius: 28,
		tint: '#10b981',
	});
	const backendAnchor = makeAnchor('axis_backend', 'axis-backend', 'Backend', {
		...positions.right,
		radius: 28,
		tint: '#f59e0b',
	});
	const fullstackAnchor = makeAnchor('axis_fullstack', 'axis-fullstack', 'Full-stack', {
		...positions.center!,
		radius: 24,
		tint: '#3b82f6',
	});

	const nodes: ForceDirectedGraphNode[] = [
		{ ...frontendAnchor, itemName: frontendAnchor.label, selectable: false, isHighlighted: false },
		{ ...backendAnchor, itemName: backendAnchor.label, selectable: false, isHighlighted: false },
		{ ...fullstackAnchor, itemName: fullstackAnchor.label, selectable: false, isHighlighted: false },
	];
	const links: ForceDirectedGraphLink[] = [];

	// Add frame connections between anchors
	links.push(connectAnchors(frontendAnchor.id, fullstackAnchor.id, 'frame'));
	links.push(connectAnchors(fullstackAnchor.id, backendAnchor.id, 'frame'));

	// Find skills and categorize them
	const skillNodes = portfolio.nodes.filter((n): n is SkillNode => n.type === 'skill');

	for (const skill of skillNodes) {
		const isFrontend = skill.tags?.includes('frontend');
		const isBackend = skill.tags?.includes('backend');

		if (isFrontend && isBackend) {
			// Full-stack skill
			nodes.push({
				...skill,
				itemName: skill.label,
				isHighlighted: directive.highlights?.includes(skill.id) ?? false,
			});
			links.push(linkToAnchor(skill.id, fullstackAnchor.id, 'fs', 'overlap'));
		} else if (isFrontend) {
			// Frontend-only skill
			nodes.push({
				...skill,
				itemName: skill.label,
				isHighlighted: directive.highlights?.includes(skill.id) ?? false,
			});
			links.push(linkToAnchor(skill.id, frontendAnchor.id, 'fe'));
		} else if (isBackend) {
			// Backend-only skill
			nodes.push({
				...skill,
				itemName: skill.label,
				isHighlighted: directive.highlights?.includes(skill.id) ?? false,
			});
			links.push(linkToAnchor(skill.id, backendAnchor.id, 'be'));
		}
	}

	// Optionally add projects that heavily use frontend/backend skills
	const projectNodes = portfolio.nodes.filter((n): n is ProjectNode => n.type === 'project');
	const usedEdges = portfolio.edges.filter((e) => e.rel === 'used');

	for (const project of projectNodes) {
		const projectSkills = usedEdges
			.filter((e) => e.source === project.id)
			.map((e) => skillNodes.find((s) => s.id === e.target))
			.filter(Boolean) as SkillNode[];

		const frontendCount = projectSkills.filter((s) => s.tags?.includes('frontend')).length;
		const backendCount = projectSkills.filter((s) => s.tags?.includes('backend')).length;

		// Only include projects with significant skill usage
		if (frontendCount >= 2 || backendCount >= 2) {
			nodes.push({
				...project,
				itemName: project.label,
				isHighlighted: directive.highlights?.includes(project.id) ?? false,
			});

			if (frontendCount >= 2 && backendCount >= 2) {
				links.push(linkToAnchor(project.id, fullstackAnchor.id, 'fs', 'evidence', 0.3));
			} else if (frontendCount >= 2) {
				links.push(linkToAnchor(project.id, frontendAnchor.id, 'fe', 'evidence', 0.3));
			} else if (backendCount >= 2) {
				links.push(linkToAnchor(project.id, backendAnchor.id, 'be', 'evidence', 0.3));
			}
		}
	}

	return { nodes, links };
}
