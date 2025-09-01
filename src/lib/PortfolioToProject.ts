import type { Graph, ProjectNode, SkillNode, Metric, Link } from './PortfolioStore';
import type { ForceDirectedGraphData } from '~/components/ForceGraph/Common';
import type { ProjectsDirective } from './ai/directiveTools';
import { getCaseStudyByProjectId } from '~/data/case-studies';

// ===== Enhanced Project Types =====

export type ProjectCard = ProjectNode & {
	// Derived time fields
	yearStart?: number;
	yearEnd?: number;
	durationMonths?: number;

	// Derived relationship fields
	skillCount: number;
	primaryTech: string[];

	// Derived metrics
	impactScore?: number;

	// UI state
	isPinned?: boolean;
	isHighlighted?: boolean;
};

export type CaseStudyViewModel = {
	project: ProjectNode;
	period?: string;
	context?: string;
	role?: string;
	objectives?: string[];
	contributions?: string[];
	outcomes?: string[];
	links?: Link[];
	tech?: string[];
	screenshots?: { src: string; alt?: string }[];
	// New: richer case study content if available
	hero?: { src: string; alt?: string };
	sections?: (
		| { kind: 'intro'; title?: string; body?: string }
		| { kind: 'image'; title?: string; image: { src: string; alt?: string; caption?: string } }
		| { kind: 'gallery'; title?: string; images: { src: string; alt?: string }[] }
		| { kind: 'bullets'; title?: string; items: string[] }
		| { kind: 'quote'; quote: string; by?: string }
		| { kind: 'metrics'; title?: string; metrics: { label: string; value: string }[] }
	)[];
};

// ===== Core Transformation Functions =====

/**
 * Transforms a ProjectNode into an enriched ProjectCard with derived fields
 */
export function toProjectCard(
	project: ProjectNode,
	graph: Graph,
	highlights: Set<string>,
	pinnedIds: Set<string> = new Set(),
): ProjectCard {
	// Extract time information
	const periodStart = project.period?.start;
	const periodEnd = project.period?.end;

	if (!periodStart || !periodEnd) {
		throw new Error(`Project ${project.id} missing required period data`);
	}

	// Parse years from period (format: "YYYY-MM")
	const yearStart = parseInt(periodStart.split('-')[0]!);
	const yearEnd = periodEnd === 'present' ? new Date().getFullYear() : parseInt(periodEnd.split('-')[0]!);

	// Calculate duration in months
	const startDate = new Date(periodStart + '-01');
	const endDate = periodEnd === 'present' ? new Date() : new Date(periodEnd + '-01');
	const durationMonths = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

	// Find connected skills via 'used' edges
	const connectedSkills = graph.edges
		.filter((edge) => edge.rel === 'used' && (edge.source === project.id || edge.target === project.id))
		.map((edge) => (edge.source === project.id ? edge.target : edge.source))
		.map((skillId) => graph.nodes.find((node) => node.id === skillId && node.type === 'skill'))
		.filter((node): node is SkillNode => !!node);

	// Extract primary technologies (first 5 skills)
	const primaryTech = connectedSkills.slice(0, 5).map((skill) => skill.label);

	// Calculate impact score from metrics
	const impactScore = project.metrics?.reduce((acc, metric) => {
		// Try to extract numeric value from metric.value string
		const numericMatch = metric.value.match(/-?\d+\.?\d*/);
		return acc + (numericMatch ? parseFloat(numericMatch[0]) : 0);
	}, 0);

	return {
		...project,
		yearStart,
		yearEnd,
		durationMonths,
		skillCount: connectedSkills.length,
		primaryTech,
		impactScore,
		isPinned: pinnedIds.has(project.id),
		isHighlighted: highlights.has(project.id),
	};
}

// deriveProjectMetrics function removed - metrics display removed from UI

/**
 * Builds a detailed case study view model for a specific project
 */
export function buildCaseStudyViewModel(project: ProjectNode, graph: Graph): CaseStudyViewModel {
	// Optional: attach richer case study content from registry
	let hero: CaseStudyViewModel['hero'] | undefined;
	let sections: CaseStudyViewModel['sections'] | undefined;
	let screenshots: CaseStudyViewModel['screenshots'] | undefined;

	try {
		const cs = getCaseStudyByProjectId(project.id);
		if (cs) {
			hero = cs.hero ? { src: cs.hero.src, alt: cs.hero.alt } : undefined;
			sections = cs.sections as CaseStudyViewModel['sections'];
			// derive a flat screenshots list for simple UIs
			screenshots = [
				...(cs.hero ? [{ src: cs.hero.src, alt: cs.hero.alt }] : []),
				...cs.sections.flatMap((s) =>
					s.kind === 'image'
						? [{ src: s.image.src, alt: s.image.alt }]
						: s.kind === 'gallery'
							? s.images.map((im) => ({ src: im.src, alt: im.alt }))
							: [],
				),
				...(cs.gallery ?? []).map((im) => ({ src: im.src, alt: im.alt })),
			];
		}
	} catch {
		// no-op if registry not present
	}
	// Find connected skills
	const connectedSkills = graph.edges
		.filter((edge) => edge.rel === 'used' && (edge.source === project.id || edge.target === project.id))
		.map((edge) => (edge.source === project.id ? edge.target : edge.source))
		.map((skillId) => graph.nodes.find((node) => node.id === skillId && node.type === 'skill'))
		.filter((node): node is SkillNode => !!node);

	// Format period string
	const period = project.period
		? `${project.period.start} — ${project.period.end}`
		: project.years
			? `${project.years[0]} — ${project.years[1]}`
			: undefined;

	// Format outcomes from metrics
	const outcomes = project.metrics?.map((metric) => `${metric.label}: ${metric.value}`) || [];

	// Extract tech stack
	const tech = connectedSkills.map((skill) => skill.label);

	return {
		project,
		period,
		context: project.summary || project.description,
		objectives: [], // TODO: Add to schema if needed
		contributions: [], // TODO: Add to schema if needed
		outcomes,
		links: project.links || [],
		tech,
		screenshots,
		hero,
		sections,
	};
}

/**
 * Creates a clean DAG for radial projects view: person → projects → skills
 * Ensures single root, outward-only edges, and proper layer structure for dagMode="radialout"
 */
export function portfolioToRadialProjects(graph: Graph, directive: ProjectsDirective): ForceDirectedGraphData {
	// Find the person node (should be exactly one - our single root)
	const personNode = graph.nodes.find((node) => node.type === 'person');
	if (!personNode) {
		throw new Error('No person node found in graph - required as single root for radial DAG');
	}

	// Get all project nodes that person has built
	const personProjectIds = new Set(
		graph.edges.filter((edge) => edge.rel === 'built' && edge.source === personNode.id).map((edge) => edge.target),
	);

	const projectNodes = graph.nodes.filter(
		(node) => node.type === 'project' && personProjectIds.has(node.id),
	) as ProjectNode[];

	// Get skills connected to these projects (outward direction only: project → skill)
	const projectSkillEdges = graph.edges.filter((edge) => {
		if (edge.rel !== 'used') return false;

		// Ensure direction is project → skill (outward from project layer)
		const sourceIsProject = projectNodes.some((p) => p.id === edge.source);
		const targetIsSkill = graph.nodes.some((n) => n.id === edge.target && n.type === 'skill');

		return sourceIsProject && targetIsSkill;
	});

	const skillIds = new Set(projectSkillEdges.map((edge) => edge.target));
	const skillNodes = graph.nodes.filter((node) => node.type === 'skill' && skillIds.has(node.id)) as SkillNode[];

	// Build clean DAG nodes with proper layer assignment
	// Clear any existing fx/fy pins to avoid conflicts with dagMode
	const nodes = [
		// Layer 0: Person (center - single root)
		{
			...personNode,
			itemName: personNode.label,
			layer: 0,
			// Ensure no pinning conflicts with DAG layout
			fx: undefined,
			fy: undefined,
		},
		// Layer 1: Projects (first ring)
		...projectNodes.map((project) => ({
			...project,
			itemName: project.label,
			layer: 1,
			fx: undefined,
			fy: undefined,
		})),
		// Layer 2: Skills (second ring) - use singleLine for compact display
		...skillNodes.map((skill) => ({
			...skill,
			itemName: skill.label,
			layer: 2,
			fx: undefined,
			fy: undefined,
			singleLine: true, // Use compact single-line rendering to reduce clutter
		})),
	];

	// Build clean DAG edges - strictly outward only
	const links = [
		// Person → Projects (layer 0 → layer 1)
		...projectNodes.map((project) => ({
			id: `${personNode.id}-${project.id}`,
			source: personNode.id,
			target: project.id,
			rel: 'built' as const,
			value: 3,
		})),
		// Projects → Skills (layer 1 → layer 2)
		...projectSkillEdges.map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			rel: edge.rel,
			value: 2,
		})),
	];

	// Validate DAG properties (single root, no cycles for radial layout)
	validateRadialDAG({ nodes, links }, personNode.id);

	return { nodes, links };
}

/**
 * Validates that the graph is a proper DAG for radial layout
 * Ensures single root and no cycles that would break dagMode
 */
function validateRadialDAG(data: ForceDirectedGraphData, expectedRootId: string): void {
	// Check for single root (indegree 0)
	const inDegree = new Map<string, number>();

	// Initialize all nodes with indegree 0
	for (const node of data.nodes) {
		inDegree.set(node.id, 0);
	}

	// Count incoming edges
	for (const link of data.links) {
		const targetId = typeof link.target === 'string' ? link.target : link.target.id;
		inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
	}

	// Find roots (nodes with no incoming edges)
	const roots = data.nodes.filter((node) => inDegree.get(node.id) === 0);

	// Ensure exactly one root
	if (roots.length !== 1) {
		throw new Error(
			`Radial DAG validation failed: expected exactly one root (${expectedRootId}), found ${roots.length}: [${roots.map((r) => r.id).join(', ')}]`,
		);
	}

	// Ensure the root is the expected person node
	if (roots[0]?.id !== expectedRootId) {
		throw new Error(
			`Radial DAG validation failed: root should be ${expectedRootId}, but found ${roots[0]?.id || 'undefined'}`,
		);
	}

	// Quick cycle detection: in a proper DAG, we should be able to process all nodes
	// by repeatedly removing nodes with indegree 0 (topological sort)
	const workingInDegree = new Map(inDegree);
	const processed = new Set<string>();
	let queue = [expectedRootId];

	while (queue.length > 0) {
		const current = queue.shift()!;
		processed.add(current);

		// Find outgoing edges from current node
		for (const link of data.links) {
			const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
			const targetId = typeof link.target === 'string' ? link.target : link.target.id;

			if (sourceId === current) {
				// Reduce indegree of target
				const newIndegree = (workingInDegree.get(targetId) || 0) - 1;
				workingInDegree.set(targetId, newIndegree);

				// If target now has indegree 0, it can be processed
				if (newIndegree === 0 && !processed.has(targetId)) {
					queue.push(targetId);
				}
			}
		}
	}

	// If we processed all nodes, no cycles exist
	if (processed.size !== data.nodes.length) {
		const unprocessed = data.nodes.filter((n) => !processed.has(n.id)).map((n) => n.id);
		throw new Error(`Radial DAG validation failed: cycle detected. Unprocessed nodes: [${unprocessed.join(', ')}]`);
	}
}

/**
 * Utility function to filter nodes by type (reused from ViewTransitions)
 */
export function filterNodesByType<T extends { type: string }>(nodes: { type: string }[], type: T['type']): T[] {
	return nodes.filter((node) => node.type === type) as T[];
}
