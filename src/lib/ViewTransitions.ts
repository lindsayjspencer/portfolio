import type { Graph, Node, ProjectNode, SkillNode, ValueNode, RoleNode, StoryNode, Metric } from './PortfolioStore';
import type { ForceDirectedGraphData } from '~/components/ForceGraph/Common';
import {
	portfolioToForceGraph,
	portfolioToCompareSkillsGraph,
	portfolioToCompareProjectsGraph,
	portfolioToCompareFrontendVsBackendGraph,
} from './PortfolioToForceGraph';
import {
	toProjectCard,
	buildCaseStudyViewModel,
	portfolioToRadialProjects,
	type ProjectCard,
	type CaseStudyViewModel,
} from './PortfolioToProject';
import { createSkillClusters, createSkillMatrix, skillsToForceGraph } from './PortfolioToSkills';
import {
	getDirectiveVariant,
	type Directive,
} from './ai/directiveTools';

export type TransitionPhase = 'entering' | 'stable' | 'exiting';

// ===== Data Processing Utility Types =====

interface SkillCluster {
	id: string; // stable key, e.g. domain name or "cluster-1"
	label: string; // display label
	skillIds: string[]; // member skills
	centroid?: { x: number; y: number }; // computed later (renderer)
	score?: number; // optional aggregate (usage/recency)
	color?: string; // renderer tint
}

export interface SkillMatrix {
	rows: { id: string; label: string; level?: 'expert' | 'advanced' | 'intermediate' }[]; // skills
	cols: { id: string; label: string; yearEnd?: number }[]; // projects
	values: number[][]; // rows × cols
	rowTotals?: number[]; // sum per skill
	colTotals?: number[]; // sum per project
	rowOrder?: number[]; // optional permutation for clustered ordering
	colOrder?: number[];
}

export interface ValueEvidence {
	valueId: string;
	valueLabel: string;
	valueSummary?: string;
	roles: RoleNode[];
	projects: ProjectNode[];
	stories: StoryNode[];
}

// ===== Mode-Specific DataSnapshot Types =====

interface BaseDataSnapshot {
	directive: Directive;
	timestamp: number;
}

// Timeline DataSnapshots
interface TimelineCareerSnapshot extends BaseDataSnapshot {
	mode: 'timeline';
	variant: 'career';
	forceGraphData: ForceDirectedGraphData;
}

interface TimelineProjectsSnapshot extends BaseDataSnapshot {
	mode: 'timeline';
	variant: 'projects';
	forceGraphData: ForceDirectedGraphData;
}

interface TimelineSkillsSnapshot extends BaseDataSnapshot {
	mode: 'timeline';
	variant: 'skills';
	forceGraphData: ForceDirectedGraphData;
}

type TimelineDataSnapshot = TimelineCareerSnapshot | TimelineProjectsSnapshot | TimelineSkillsSnapshot;

// Projects DataSnapshots
export interface ProjectsGridSnapshot extends BaseDataSnapshot {
	mode: 'projects';
	variant: 'grid';
	projects: ProjectCard[];
	metrics?: Metric[];
	pinnedProjects?: ProjectCard[];
}

interface ProjectsRadialSnapshot extends BaseDataSnapshot {
	mode: 'projects';
	variant: 'radial';
	forceGraphData: ForceDirectedGraphData;
	projects: ProjectCard[];
	metrics?: Metric[];
	pinnedProjects?: ProjectCard[];
}

interface ProjectsCaseStudySnapshot extends BaseDataSnapshot {
	mode: 'projects';
	variant: 'case-study';
	projects: ProjectCard[];
	metrics?: Metric[];
	pinnedProjects?: ProjectCard[];
	caseStudy: CaseStudyViewModel;
}

type ProjectsDataSnapshot = ProjectsGridSnapshot | ProjectsRadialSnapshot | ProjectsCaseStudySnapshot;

// Skills DataSnapshots
interface SkillsTechnicalSnapshot extends BaseDataSnapshot {
	mode: 'skills';
	variant: 'technical';
	forceGraphData: ForceDirectedGraphData;
	skills: SkillNode[];
	clusters: SkillCluster[];
}

interface SkillsSoftSnapshot extends BaseDataSnapshot {
	mode: 'skills';
	variant: 'soft';
	forceGraphData: ForceDirectedGraphData;
	skills: SkillNode[];
	clusters: SkillCluster[];
}

interface SkillsMatrixSnapshot extends BaseDataSnapshot {
	mode: 'skills';
	variant: 'matrix';
	skills: SkillNode[];
	matrix: SkillMatrix;
}

type SkillsDataSnapshot = SkillsTechnicalSnapshot | SkillsSoftSnapshot | SkillsMatrixSnapshot;

// Values DataSnapshots
interface ValuesMindmapSnapshot extends BaseDataSnapshot {
	mode: 'values';
	variant: 'mindmap';
	forceGraphData: ForceDirectedGraphData;
	values: ValueNode[];
}

export interface ValuesEvidenceSnapshot extends BaseDataSnapshot {
	mode: 'values';
	variant: 'evidence';
	values: ValueNode[];
	evidence: ValueEvidence[];
}

type ValuesDataSnapshot = ValuesMindmapSnapshot | ValuesEvidenceSnapshot;

// Compare DataSnapshots
interface CompareSkillsSnapshot extends BaseDataSnapshot {
	mode: 'compare';
	variant: 'skills';
	forceGraphData: ForceDirectedGraphData;
	leftSkill: SkillNode | null;
	rightSkill: SkillNode | null;
	overlap: SkillNode[];
}

interface CompareProjectsSnapshot extends BaseDataSnapshot {
	mode: 'compare';
	variant: 'projects';
	forceGraphData: ForceDirectedGraphData;
	leftProject: ProjectNode | null;
	rightProject: ProjectNode | null;
	overlap: ProjectNode[];
}

interface CompareFrontendVsBackendSnapshot extends BaseDataSnapshot {
	mode: 'compare';
	variant: 'frontend-vs-backend';
	forceGraphData: ForceDirectedGraphData;
	frontendSkills: SkillNode[];
	backendSkills: SkillNode[];
	fullStackSkills: SkillNode[];
}

type CompareDataSnapshot = CompareSkillsSnapshot | CompareProjectsSnapshot | CompareFrontendVsBackendSnapshot;

// Explore DataSnapshots
export interface ExploreSnapshot extends BaseDataSnapshot {
	mode: 'explore';
	forceGraphData: ForceDirectedGraphData;
	nodes: Node[];
}

// Landing DataSnapshot (no variants)
interface LandingSnapshot extends BaseDataSnapshot {
	mode: 'landing';
}

// Resume DataSnapshot (no variants)
interface ResumeSnapshot extends BaseDataSnapshot {
	mode: 'resume';
}

// ===== Discriminated Union =====
export type DataSnapshot =
	| TimelineDataSnapshot
	| ProjectsDataSnapshot
	| SkillsDataSnapshot
	| ValuesDataSnapshot
	| CompareDataSnapshot
	| ExploreSnapshot
	| LandingSnapshot
	| ResumeSnapshot;

export interface ViewInstanceState {
	mode: Directive['mode'];
	phase: TransitionPhase;
	zIndex: number;
	key: string; // Unique key for React rendering
	dataSnapshot: DataSnapshot; // Required snapshot of data/directive at instance creation
}

export interface ViewTransitionState {
	instances: ViewInstanceState[];
	isTransitioning: boolean;
}

export interface TransitionDecision {
	shouldTransition: boolean;
	reason: 'mode-changed' | 'variant-changed' | 'structure-changed' | 'cosmetic-only';
	prevSignature: string;
	nextSignature: string;
	prevVariant: string | null;
	nextVariant: string | null;
}

export interface TransitionCallbacks {
	onTransitionIn: (duration: number) => Promise<void>;
	onTransitionOut: (duration: number) => Promise<void>;
}

/**
 * Per-component transition timing configuration
 */
export const COMPONENT_TRANSITION_TIMINGS = {
	landing: { in: 500, out: 500 },
	timeline: { in: 1000, out: 400 }, // ForceGraph needs more time for complex animations
	explore: { in: 1000, out: 400 },
	projects: { in: 400, out: 300 },
	skills: { in: 400, out: 300 },
	values: { in: 400, out: 300 },
	compare: { in: 400, out: 300 },
	resume: { in: 400, out: 300 },
} as const;

const PRESENTATIONAL_IGNORE_FIELDS: ReadonlySet<string> = new Set(['highlights']);

// ===== Data Processing Utility Functions =====

/**
 * Create a deep clone of a value. Uses structuredClone when available (Node 18+/modern browsers),
 * falling back to JSON for plain data. This is used to freeze the directive inside a snapshot
 * so later in-place mutations (e.g., highlights array) don't mutate past snapshots.
 */
function deepClone<T>(value: T): T {
	const structuredCloneFn = globalThis.structuredClone;
	if (typeof structuredCloneFn === 'function') {
		return structuredCloneFn(value);
	}
	// Fallback suitable for Directive's plain data
	return JSON.parse(JSON.stringify(value)) as T;
}

function isDefined<T>(value: T | undefined): value is T {
	return value !== undefined;
}

function createValueEvidence(graph: Graph): ValueEvidence[] {
	const values = filterNodesByType<ValueNode>(graph.nodes, 'value');
	const allRoles = filterNodesByType<RoleNode>(graph.nodes, 'role');
	const allProjects = filterNodesByType<ProjectNode>(graph.nodes, 'project');
	const allStories = filterNodesByType<StoryNode>(graph.nodes, 'story');

	// Treat these relations as valid "evidence-like" connections to a value
	const evidenceLike = new Set<Graph['edges'][number]['rel']>(['evidence', 'impacted']);

	return values.map((value) => {
		// Gather direct evidence edges pointing TO this value
		const evidenceEdges = graph.edges.filter((edge) => edge.target === value.id && evidenceLike.has(edge.rel));

		// Use Sets to dedupe
		const roleIds = new Set<string>();
		const projectIds = new Set<string>();
		const storyIds = new Set<string>();

		// Categorize direct evidence by source type
		for (const edge of evidenceEdges) {
			const sourceNode = graph.nodes.find((n) => n.id === edge.source);
			if (!sourceNode) continue;

			if (sourceNode.type === 'role') roleIds.add(sourceNode.id);
			else if (sourceNode.type === 'project') projectIds.add(sourceNode.id);
			else if (sourceNode.type === 'story') storyIds.add(sourceNode.id);
		}

		// Also include stories that happened during any of the roles/projects that evidence this value
		const happenedDuring = graph.edges.filter((e) => e.rel === 'happened_during');
		for (const edge of happenedDuring) {
			// story -> (role|project)
			const storyNode = graph.nodes.find((n) => n.id === edge.source);
			if (storyNode?.type !== 'story') continue;

			if (roleIds.has(edge.target) || projectIds.has(edge.target)) {
				storyIds.add(storyNode.id);
			}
		}

		// Materialize nodes from ids
		const roles: RoleNode[] = Array.from(roleIds)
			.map((id) => allRoles.find((r) => r.id === id))
			.filter(isDefined);

		const projects: ProjectNode[] = Array.from(projectIds)
			.map((id) => allProjects.find((p) => p.id === id))
			.filter(isDefined);

		const stories: StoryNode[] = Array.from(storyIds)
			.map((id) => allStories.find((s) => s.id === id))
			.filter(isDefined);

		return {
			valueId: value.id,
			valueLabel: value.label,
			valueSummary: value.summary,
			roles,
			projects,
			stories,
		};
	});
}

function findNodeById<T extends Node>(graph: Graph, id: string, type: T['type']): T | null {
	const node = graph.nodes.find((n) => n.id === id && n.type === type);
	return node as T | null;
}

// Note: filterNodesByType moved to PortfolioToProject.ts

// ===== Main createDataSnapshot Function =====

/**
 * Creates a mode and variant-specific data snapshot for a view instance
 */
export function createDataSnapshot(graph: Graph, directive: Directive): DataSnapshot {
	const baseData = {
		directive: deepClone(directive),
		timestamp: Date.now(),
	};

	switch (directive.mode) {
		case 'timeline': {
			const forceGraphData = portfolioToForceGraph(graph, directive);

			switch (directive.data.variant) {
				case 'career':
					return {
						...baseData,
						mode: 'timeline',
						variant: 'career',
						forceGraphData,
					};
				case 'projects':
					return {
						...baseData,
						mode: 'timeline',
						variant: 'projects',
						forceGraphData,
					};
				case 'skills':
					return {
						...baseData,
						mode: 'timeline',
						variant: 'skills',
						forceGraphData,
					};
			}
		}

		case 'projects': {
			const allProjectNodes = filterNodesByType<ProjectNode>(graph.nodes, 'project');
			const highlights = new Set<string>(directive.data.highlights ?? []);
			const pinnedIds = new Set<string>(directive.data.pinned ?? []);

			// Transform projects to enriched ProjectCards
			const allProjects = allProjectNodes.map((project) => toProjectCard(project, graph, highlights, pinnedIds));

			// Sort projects: pinned → start date (newest first) → alphabetical
			allProjects.sort(
				(a, b) =>
					Number(b.isPinned) - Number(a.isPinned) ||
					(b.yearStart ?? 0) - (a.yearStart ?? 0) ||
					a.label.localeCompare(b.label),
			);

			const pinnedProjects = allProjects.filter((p) => p.isPinned);

			switch (directive.data.variant) {
				case 'grid':
					return {
						...baseData,
						mode: 'projects',
						variant: 'grid',
						projects: allProjects,
						metrics: undefined,
						pinnedProjects,
					};
				case 'radial':
					return {
						...baseData,
						mode: 'projects',
						variant: 'radial',
						forceGraphData: portfolioToRadialProjects(graph),
						projects: allProjects,
						metrics: undefined,
						pinnedProjects,
					};
				case 'case-study': {
					// Select focus project for case study
					const focusProject = (() => {
						const fromHighlights = allProjectNodes.find((p) => highlights.has(p.id));
						const fromPinned = allProjectNodes.find((p) => pinnedIds.has(p.id));
						const fallback = allProjectNodes
							.slice()
							.sort((a, b) => (b.years?.[1] ?? 0) - (a.years?.[1] ?? 0))[0];

						return fromHighlights ?? fromPinned ?? fallback;
					})();

					if (!focusProject) {
						throw new Error('No projects available for case study');
					}

					const caseStudy = buildCaseStudyViewModel(focusProject, graph);

					return {
						...baseData,
						mode: 'projects',
						variant: 'case-study',
						projects: allProjects,
						metrics: undefined,
						pinnedProjects,
						caseStudy,
					};
				}
			}
		}

		case 'skills': {
			const allSkills = filterNodesByType<SkillNode>(graph.nodes, 'skill');

			switch (directive.data.variant) {
				case 'technical': {
					const dataWithType = { ...directive.data, skillType: 'technical' as const };
					return {
						...baseData,
						mode: 'skills',
						variant: 'technical',
						forceGraphData: skillsToForceGraph(graph, dataWithType),
						skills: allSkills.filter((s) => s.skill_type !== 'soft'),
						clusters: createSkillClusters(graph, dataWithType),
					};
				}
				case 'soft': {
					const dataWithType = { ...directive.data, skillType: 'soft' as const };
					return {
						...baseData,
						mode: 'skills',
						variant: 'soft',
						forceGraphData: skillsToForceGraph(graph, dataWithType),
						skills: allSkills.filter((s) => s.skill_type === 'soft'),
						clusters: createSkillClusters(graph, dataWithType),
					};
				}
				case 'matrix':
					return {
						...baseData,
						mode: 'skills',
						variant: 'matrix',
						skills: allSkills,
						matrix: createSkillMatrix(graph),
					};
			}
		}

		case 'values': {
			const allValues = filterNodesByType<ValueNode>(graph.nodes, 'value');

			switch (directive.data.variant) {
				case 'mindmap':
					return {
						...baseData,
						mode: 'values',
						variant: 'mindmap',
						forceGraphData: portfolioToForceGraph(graph, directive),
						values: allValues,
					};
				case 'evidence':
					return {
						...baseData,
						mode: 'values',
						variant: 'evidence',
						values: allValues,
						evidence: createValueEvidence(graph),
					};
			}
		}

		case 'compare': {
			switch (directive.data.variant) {
				case 'skills': {
					const leftSkill = findNodeById<SkillNode>(graph, directive.data.leftId, 'skill');
					const rightSkill = findNodeById<SkillNode>(graph, directive.data.rightId, 'skill');
					const forceGraphData = portfolioToCompareSkillsGraph(graph, directive.data);

					// Calculate overlap - projects that use both skills
					const usedEdges = graph.edges.filter((e) => e.rel === 'used');
					const projectsUsingLeft = new Set(
						usedEdges.filter((e) => e.target === directive.data.leftId).map((e) => e.source),
					);
					const projectsUsingRight = new Set(
						usedEdges.filter((e) => e.target === directive.data.rightId).map((e) => e.source),
					);
					const overlapProjectIds = [...projectsUsingLeft].filter((id) => projectsUsingRight.has(id));
					const overlap = graph.nodes.filter(
						(n): n is SkillNode =>
							n.type === 'skill' &&
							overlapProjectIds.some((pid) =>
								usedEdges.some((e) => e.source === pid && e.target === n.id),
							),
					);

					return {
						...baseData,
						mode: 'compare',
						variant: 'skills',
						forceGraphData,
						leftSkill,
						rightSkill,
						overlap,
					};
				}
				case 'projects': {
					const leftProject = findNodeById<ProjectNode>(graph, directive.data.leftId, 'project');
					const rightProject = findNodeById<ProjectNode>(graph, directive.data.rightId, 'project');
					const forceGraphData = portfolioToCompareProjectsGraph(graph, directive.data);

					// Calculate overlap - skills used by both projects
					const usedEdges = graph.edges.filter((e) => e.rel === 'used');
					const skillsInLeft = new Set(
						usedEdges.filter((e) => e.source === directive.data.leftId).map((e) => e.target),
					);
					const skillsInRight = new Set(
						usedEdges.filter((e) => e.source === directive.data.rightId).map((e) => e.target),
					);
					const overlapSkillIds = [...skillsInLeft].filter((id) => skillsInRight.has(id));
					const overlap = graph.nodes.filter(
						(n): n is ProjectNode =>
							n.type === 'project' &&
							overlapSkillIds.some((sid) => usedEdges.some((e) => e.source === n.id && e.target === sid)),
					);

					return {
						...baseData,
						mode: 'compare',
						variant: 'projects',
						forceGraphData,
						leftProject,
						rightProject,
						overlap,
					};
				}
				case 'frontend-vs-backend': {
					const allSkills = filterNodesByType<SkillNode>(graph.nodes, 'skill');
					const forceGraphData = portfolioToCompareFrontendVsBackendGraph(graph, directive.data);

					return {
						...baseData,
						mode: 'compare',
						variant: 'frontend-vs-backend',
						forceGraphData,
						frontendSkills: allSkills.filter((s) => s.tags?.includes('frontend')),
						backendSkills: allSkills.filter((s) => s.tags?.includes('backend')),
						fullStackSkills: allSkills.filter(
							(s) => s.tags?.includes('frontend') && s.tags?.includes('backend'),
						),
					};
				}
			}
		}

		case 'explore': {
			return {
				...baseData,
				mode: 'explore',
				forceGraphData: portfolioToForceGraph(graph, directive),
				nodes: graph.nodes,
			};
		}

		case 'landing': {
			return {
				...baseData,
				mode: 'landing',
			};
		}

		case 'resume':
			return {
				...baseData,
				mode: 'resume',
			};

		default:
			return assertNever(directive);
	}
}

/**
 * Utility function to filter nodes by type (reused from ViewTransitions)
 */
export function filterNodesByType<T extends { type: string }>(nodes: { type: string }[], type: T['type']): T[] {
	return nodes.filter((node) => node.type === type) as T[];
}

function assertNever(_x: never): never {
	// Fallback - should never reach here with proper typing
	throw new Error('Unknown directive mode');
}

function sanitizeDirectiveData<T extends Directive['data']>(data: T, ignore: ReadonlySet<string>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const key of Object.keys(data) as Array<keyof T>) {
		const stringKey = String(key);
		if (ignore.has(stringKey)) {
			continue;
		}
		out[stringKey] = data[key];
	}
	return out;
}

// ===== Transition decision helpers =====

/**
 * Returns a stable, structural signature of a directive for transition equality checks.
 * By default, ignores purely presentational fields like highlights.
 */
export function structuralSignature(directive: Directive): string {
	const structural = {
		mode: directive.mode,
		data: sanitizeDirectiveData(directive.data, PRESENTATIONAL_IGNORE_FIELDS),
	} as const;

	return stableStringify(structural);
}

/**
 * Decide whether a change from prev -> next directives should trigger a full transition.
 * Rules:
 *  - Mode changed -> transition
 *  - Variant changed (including defined -> undefined) -> transition
 *  - Structural signature changed (after ignoring purely cosmetic keys) -> transition
 *  - Else -> no transition; update snapshot in place
 */
export function getTransitionDecision(prev: Directive, next: Directive): TransitionDecision {
	const prevSignature = structuralSignature(prev);
	const nextSignature = structuralSignature(next);
	const prevVariant = getDirectiveVariant(prev);
	const nextVariant = getDirectiveVariant(next);

	if (prev.mode !== next.mode) {
		return {
			shouldTransition: true,
			reason: 'mode-changed',
			prevSignature,
			nextSignature,
			prevVariant,
			nextVariant,
		};
	}

	if (prevVariant !== nextVariant) {
		return {
			shouldTransition: true,
			reason: 'variant-changed',
			prevSignature,
			nextSignature,
			prevVariant,
			nextVariant,
		};
	}

	if (prevSignature !== nextSignature) {
		return {
			shouldTransition: true,
			reason: 'structure-changed',
			prevSignature,
			nextSignature,
			prevVariant,
			nextVariant,
		};
	}

	return {
		shouldTransition: false,
		reason: 'cosmetic-only',
		prevSignature,
		nextSignature,
		prevVariant,
		nextVariant,
	};
}

export function shouldTransition(prev: Directive, next: Directive): boolean {
	return getTransitionDecision(prev, next).shouldTransition;
}

/**
 * Stable stringify that sorts object keys recursively to ensure consistent signatures.
 */
function stableStringify(value: unknown): string {
	const seen = new WeakSet<object>();
	const helper = (input: unknown): unknown => {
		if (input === null || typeof input !== 'object') return input;
		if (seen.has(input)) return undefined; // avoid cycles (shouldn't occur for directives)
		seen.add(input);
		if (Array.isArray(input)) return input.map(helper);
		const out: Record<string, unknown> = {};
		const record = input as Record<string, unknown>;
		for (const key of Object.keys(record).sort()) {
			out[key] = helper(record[key]);
		}
		return out;
	};
	return JSON.stringify(helper(value));
}
