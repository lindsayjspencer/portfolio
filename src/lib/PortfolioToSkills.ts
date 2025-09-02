import type { Graph, SkillNode, ProjectNode, EdgeRel } from './PortfolioStore';
import type { SkillsDirective } from './ai/directiveTools';
import type {
	ForceDirectedGraphData,
	ForceDirectedGraphNode,
	ForceDirectedGraphLink,
} from '~/components/ForceGraph/Common';
import { filterNodesByType, type SkillMatrix } from './ViewTransitions';

// ===== Skills Cluster Types =====

export interface SkillCluster {
	id: string; // stable key, e.g. domain name or "cluster-1"
	label: string; // display label
	skillIds: string[]; // member skills
	centroid?: { x: number; y: number }; // computed later (renderer)
	score?: number; // optional aggregate (usage/recency)
	color?: string; // renderer tint
}

export interface SkillGraph {
	skills: SkillNode[];
	links: Record<string, number>; // pair->weight mapping
}

// ===== Core Skill Graph Construction =====

/**
 * Builds skill-skill co-occurrence graph via projects
 * Each project connects all its skills to each other with weight += 1
 */
export function buildSkillGraph(graph: Graph, skills: SkillNode[]): SkillGraph {
	const ids = new Set(skills.map((s) => s.id));
	const links: Record<string, number> = {};

	for (const p of graph.nodes.filter((n) => n.type === 'project')) {
		const used = graph.edges
			.filter((e) => e.rel === 'used' && (e.source === p.id || e.target === p.id))
			.map((e) => (e.source === p.id ? e.target : e.source))
			.filter((id): id is string => typeof id === 'string' && ids.has(id));

		// Connect every pair of skills used by this project
		for (let i = 0; i < used.length; i++) {
			for (let j = i + 1; j < used.length; j++) {
				const skillA = used[i]!;
				const skillB = used[j]!;
				const key = skillA < skillB ? `${skillA}|${skillB}` : `${skillB}|${skillA}`;
				links[key] = (links[key] ?? 0) + 1;
			}
		}
	}

	return { skills, links };
}

// ===== Domain-Based Clustering =====

const DOMAIN_TAGS = ['frontend', 'backend', 'cloud', 'data-viz', 'testing', 'devops'];

/**
 * Clusters skills by domain tags (frontend, backend, etc.)
 */
export function clusterByDomain(skills: SkillNode[]): SkillCluster[] {
	const buckets = new Map<string, string[]>();

	for (const s of skills) {
		const domains = s.tags?.filter((t) => DOMAIN_TAGS.includes(t)) ?? [];
		const targetDomains = domains.length ? domains : ['Other'];

		targetDomains.forEach((domain) => {
			if (!buckets.has(domain)) buckets.set(domain, []);
			buckets.get(domain)?.push(s.id);
		});
	}

	return [...buckets.entries()].map(([label, skillIds], i) => ({
		id: `domain-${i}`,
		label,
		skillIds,
	}));
}

// ===== Usage/Recency-Based Community Detection =====

/**
 * Simple heuristic clustering based on skill co-occurrence weights
 * Uses iterative centre-based assignment similar to k-means
 */
export function clusterByCommunity(graph: Graph, skillGraph: SkillGraph): SkillCluster[] {
	const { skills, links } = skillGraph;

	// Build adjacency map
	const adj = new Map<string, Map<string, number>>();
	for (const [pair, w] of Object.entries(links)) {
		const parts = pair.split('|');
		if (parts.length !== 2) continue;
		const [a, b] = parts as [string, string];
		if (!adj.has(a)) adj.set(a, new Map());
		if (!adj.has(b)) adj.set(b, new Map());
		const aMap = adj.get(a)!;
		const bMap = adj.get(b)!;
		aMap.set(b, (aMap.get(b) ?? 0) + w);
		bMap.set(a, (bMap.get(a) ?? 0) + w);
	}

	const skillIds = skills.map((s) => s.id);
	const degree = (id: string) => [...(adj.get(id)?.values() ?? [])].reduce((a, b) => a + b, 0);

	// Seed centres: top degree nodes
	const sorted = skillIds.slice().sort((a, b) => degree(b) - degree(a));
	const K = Math.min(5, Math.max(2, Math.round(sorted.length / 6)));
	const centres = new Set(sorted.slice(0, K));

	let assign = new Map<string, string>(); // skill -> centre

	// Iterative assignment (3 iterations)
	for (let iter = 0; iter < 3; iter++) {
		// Assign each skill to best connected centre
		for (const s of skillIds) {
			const centresArray = [...centres];
			if (centresArray.length === 0) continue;
			let bestC = centresArray[0];
			let bestW = -1;
			for (const c of centres) {
				const w = adj.get(s)?.get(c) ?? 0;
				if (w > bestW) {
					bestW = w;
					bestC = c;
				}
			}
			if (bestC) assign.set(s, bestC);
		}

		// Re-pick centres: highest degree within each cluster
		const byC = new Map<string, string[]>();
		for (const s of skillIds) {
			const c = assign.get(s);
			if (c && !byC.has(c)) byC.set(c, []);
			if (c) byC.get(c)?.push(s);
		}

		const nextCentres = new Set<string>();
		for (const [, members] of byC) {
			if (members.length > 0) {
				members.sort((a, b) => degree(b) - degree(a));
				nextCentres.add(members[0]!);
			}
		}

		centres.clear();
		for (const x of nextCentres) centres.add(x);
	}

	// Build final clusters
	const groups = new Map<string, string[]>();
	for (const s of skillIds) {
		const c = assign.get(s);
		if (c && !groups.has(c)) groups.set(c, []);
		if (c) groups.get(c)?.push(s);
	}

	let i = 0;
	return [...groups.entries()].map(([centre, skillIds]) => ({
		id: `cluster-${i++}`,
		label: graph.nodes.find((n) => n.id === centre)?.label ?? 'Cluster',
		skillIds,
	}));
}

// ===== Main Skill Clusters Creation =====

/**
 * Creates skill clusters based on the directive's clusterBy strategy
 */
export function createSkillClusters(graph: Graph, data: SkillsDirective): SkillCluster[] {
	const allSkills = filterNodesByType<SkillNode>(graph.nodes, 'skill');
	// const filtered = data.focusLevel ? allSkills.filter((s) => s.level === data.focusLevel) : allSkills;
	const filtered = allSkills;

	if (filtered.length === 0) {
		return [];
	}

	// Domain-based clustering
	if (data.clusterBy === 'domain') {
		return clusterByDomain(filtered);
	}

	// Usage/recency-based clustering (both use same community detection)
	const skillGraph = buildSkillGraph(graph, filtered);
	return clusterByCommunity(graph, skillGraph);
}

// ===== Force Graph Transformation for Skills Clusters =====

/**
 * Transforms skills data into force graph format showing skill co-occurrence
 * Used for skills/clusters variant
 */
export function skillsToForceGraph(graph: Graph, data: SkillsDirective): ForceDirectedGraphData {
	const allSkills = filterNodesByType<SkillNode>(graph.nodes, 'skill');
	// const filtered = data.focusLevel ? allSkills.filter((s) => s.level === data.focusLevel) : allSkills;
	const filtered = allSkills;

	// Build skill graph for co-occurrence data
	const skillGraph = buildSkillGraph(graph, filtered);
	const highlightSet = new Set(data.highlights || []);

	// Transform skills to force graph nodes
	const nodes: ForceDirectedGraphNode[] = skillGraph.skills.map((skill) => ({
		...skill, // Include all original skill properties
		itemName: skill.label,
		selectable: true,
		isHighlighted: highlightSet.has(skill.id),
		size: calculateSkillNodeSize(graph, skill.id),
		dimmed:
			highlightSet.size > 0 &&
			!highlightSet.has(skill.id) &&
			!isNeighborOfHighlighted(skill.id, skillGraph.links, highlightSet),
	}));

	// Transform co-occurrence links to force graph links
	const links: ForceDirectedGraphLink[] = Object.entries(skillGraph.links)
		.filter(([pair]) => pair.split('|').length === 2)
		.map(([pair, weight]) => {
			const [source, target] = pair.split('|') as [string, string];
			return {
				id: `${source}-${target}`,
				source,
				target,
				value: weight,
				rel: 'used' as EdgeRel, // Use existing EdgeRel type
			};
		});

	return { nodes, links };
}

/**
 * Calculate node size based on how many projects use this skill
 */
function calculateSkillNodeSize(graph: Graph, skillId: string): number {
	const usageCount = graph.edges.filter(
		(e) => e.rel === 'used' && (e.source === skillId || e.target === skillId),
	).length;

	// Size range: 8-20 based on usage
	return Math.max(8, Math.min(20, 8 + usageCount * 2));
}

/**
 * Check if a skill is a neighbor of any highlighted skill
 */
function isNeighborOfHighlighted(skillId: string, links: Record<string, number>, highlightSet: Set<string>): boolean {
	for (const pair of Object.keys(links)) {
		const parts = pair.split('|');
		if (parts.length !== 2) continue;
		const [a, b] = parts as [string, string];
		if ((a === skillId && highlightSet.has(b)) || (b === skillId && highlightSet.has(a))) {
			return true;
		}
	}
	return false;
}

// ===== Skills Matrix Implementation =====

/**
 * Creates a skills × projects matrix showing skill usage across projects
 * Used for skills/matrix variant
 */
export function createSkillMatrix(graph: Graph, data: SkillsDirective): SkillMatrix {
	const allSkills = filterNodesByType<SkillNode>(graph.nodes, 'skill');
	// const skills = data.focusLevel ? allSkills.filter((s) => s.level === data.focusLevel) : allSkills;
	const skills = allSkills;

	const projects = filterNodesByType<ProjectNode>(graph.nodes, 'project').sort(
		(a, b) => (b.years?.[1] ?? 0) - (a.years?.[1] ?? 0),
	); // recent first

	const rows = skills.map((s) => ({ id: s.id, label: s.label, level: s.level }));
	const cols = projects.map((p) => ({ id: p.id, label: p.label, yearEnd: p.years?.[1] }));

	// Fast lookup for edges: skill-project relationships
	const used = new Set<string>(); // `${skillId}|${projectId}`
	for (const e of graph.edges) {
		if (e.rel !== 'used') continue;
		const sType = graph.nodes.find((n) => n.id === e.source)?.type;
		const tType = graph.nodes.find((n) => n.id === e.target)?.type;
		let skillId: string | null = null;
		let projId: string | null = null;

		if (sType === 'skill' && tType === 'project') {
			skillId = e.source;
			projId = e.target;
		} else if (sType === 'project' && tType === 'skill') {
			skillId = e.target;
			projId = e.source;
		}

		if (skillId && projId) used.add(`${skillId}|${projId}`);
	}

	// Build matrix values
	const values = rows.map((r) => cols.map((c) => (used.has(`${r.id}|${c.id}`) ? 1 : 0)));

	// Calculate totals
	const rowTotals = values.map((row) => row.reduce((sum: number, val: number) => sum + val, 0));
	const colTotals = cols.map((_, j) => values.reduce((sum: number, row) => sum + row[j]!, 0));

	// Optional ordering: cluster rows/cols to group similar patterns
	const rowOrder = rows
		.map((_, i) => i)
		.sort((i, j) => rowTotals[j]! - rowTotals[i]! || rows[i]!.label.localeCompare(rows[j]!.label));
	const colOrder = cols
		.map((_, i) => i)
		.sort((i, j) => colTotals[j]! - colTotals[i]! || cols[i]!.label.localeCompare(cols[j]!.label));

	return { rows, cols, values, rowTotals, colTotals, rowOrder, colOrder };
}
