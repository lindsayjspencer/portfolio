import type { Graph, Node, ProjectNode, SkillNode, ValueNode, RoleNode, StoryNode, Metric } from './PortfolioStore';
import type { ForceDirectedGraphData } from '~/components/ForceGraph/Common';
import { portfolioToForceGraph } from './PortfolioToForceGraph';
import {
	toProjectCard,
	buildCaseStudyViewModel,
	portfolioToRadialProjects,
	filterNodesByType,
	type ProjectCard,
	type CaseStudyViewModel,
} from './PortfolioToProject';
import type {
	Directive,
	TimelineDirective,
	ProjectsDirective,
	SkillsDirective,
	ValuesDirective,
	CompareDirective,
	ExploreDirective,
	LandingDirective,
	ResumeDirective,
} from './ai/directiveTools';

export type TransitionPhase = 'entering' | 'stable' | 'exiting';

// ===== Data Processing Utility Types =====

export interface SkillCluster {
	// TODO: Implement skill cluster structure
}

export interface SkillMatrix {
	// TODO: Implement skill matrix structure
}

export interface ValueEvidence {
	// TODO: Implement value evidence structure
}

export interface ComparisonData {
	// TODO: Implement comparison data structure
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
interface SkillsClustersSnapshot extends BaseDataSnapshot {
	mode: 'skills';
	variant: 'clusters';
	forceGraphData: ForceDirectedGraphData;
	skills: SkillNode[];
	clusters: SkillCluster[];
	focusLevel?: 'expert' | 'advanced' | 'intermediate';
	clusterBy: 'domain' | 'recency' | 'usage';
}

interface SkillsMatrixSnapshot extends BaseDataSnapshot {
	mode: 'skills';
	variant: 'matrix';
	skills: SkillNode[];
	matrix: SkillMatrix;
	focusLevel?: 'expert' | 'advanced' | 'intermediate';
	clusterBy: 'domain' | 'recency' | 'usage';
}

type SkillsDataSnapshot = SkillsClustersSnapshot | SkillsMatrixSnapshot;

// Values DataSnapshots
interface ValuesMindmapSnapshot extends BaseDataSnapshot {
	mode: 'values';
	variant: 'mindmap';
	forceGraphData: ForceDirectedGraphData;
	values: ValueNode[];
	emphasizeStories?: boolean;
}

interface ValuesEvidenceSnapshot extends BaseDataSnapshot {
	mode: 'values';
	variant: 'evidence';
	values: ValueNode[];
	evidence: ValueEvidence[];
	emphasizeStories?: boolean;
}

type ValuesDataSnapshot = ValuesMindmapSnapshot | ValuesEvidenceSnapshot;

// Compare DataSnapshots
interface CompareSkillsSnapshot extends BaseDataSnapshot {
	mode: 'compare';
	variant: 'skills';
	leftSkill: SkillNode | null;
	rightSkill: SkillNode | null;
	overlap: SkillNode[];
	showOverlap: boolean;
}

interface CompareProjectsSnapshot extends BaseDataSnapshot {
	mode: 'compare';
	variant: 'projects';
	leftProject: ProjectNode | null;
	rightProject: ProjectNode | null;
	overlap: ProjectNode[];
	showOverlap: boolean;
}

interface CompareFrontendVsBackendSnapshot extends BaseDataSnapshot {
	mode: 'compare';
	variant: 'frontend-vs-backend';
	frontendSkills: SkillNode[];
	backendSkills: SkillNode[];
	fullStackSkills: SkillNode[];
	showOverlap: boolean;
}

type CompareDataSnapshot = CompareSkillsSnapshot | CompareProjectsSnapshot | CompareFrontendVsBackendSnapshot;

// Explore DataSnapshots
interface ExploreAllSnapshot extends BaseDataSnapshot {
	mode: 'explore';
	variant: 'all';
	forceGraphData: ForceDirectedGraphData;
	allNodes: Node[];
}

interface ExploreFilteredSnapshot extends BaseDataSnapshot {
	mode: 'explore';
	variant: 'filtered';
	forceGraphData: ForceDirectedGraphData;
	filteredNodes: Node[];
	filterTags: string[];
}

type ExploreDataSnapshot = ExploreAllSnapshot | ExploreFilteredSnapshot;

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
	| ExploreDataSnapshot
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

// ===== Data Processing Utility Functions =====

function createSkillClusters(graph: Graph, data: SkillsDirective): SkillCluster[] {
	// TODO: Implement skill clustering logic
	return [];
}

function createSkillMatrix(graph: Graph, data: SkillsDirective): SkillMatrix {
	// TODO: Implement skill matrix logic
	return {};
}

function createValueEvidence(graph: Graph, data: ValuesDirective): ValueEvidence[] {
	// TODO: Implement value evidence processing
	return [];
}

function findNodeById<T extends Node>(graph: Graph, id: string, type: T['type']): T | null {
	const node = graph.nodes.find((n) => n.id === id && n.type === type);
	return node as T | null;
}

// Note: filterNodesByType moved to PortfolioToProject.ts

function filterNodesByTags(nodes: Node[], tags?: string[]): Node[] {
	if (!tags || tags.length === 0) return nodes;
	return nodes.filter((node) => node.tags?.some((tag) => tags.includes(tag)));
}

// ===== Main createDataSnapshot Function =====

/**
 * Creates a mode and variant-specific data snapshot for a view instance
 */
export function createDataSnapshot(graph: Graph, directive: Directive): DataSnapshot {
	const baseData = {
		directive,
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
			const allProjects = allProjectNodes.map((project) =>
				toProjectCard(project, graph, highlights, pinnedIds)
			);

			// Sort projects: pinned → start date (newest first) → alphabetical
			allProjects.sort((a, b) =>
				(Number(b.isPinned) - Number(a.isPinned)) ||
				((b.yearStart ?? 0) - (a.yearStart ?? 0)) ||
				a.label.localeCompare(b.label)
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
						forceGraphData: portfolioToRadialProjects(graph, directive.data),
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
			const filteredSkills = directive.data.focusLevel
				? allSkills.filter((s) => s.level === directive.data.focusLevel)
				: allSkills;

			switch (directive.data.variant) {
				case 'clusters':
					return {
						...baseData,
						mode: 'skills',
						variant: 'clusters',
						forceGraphData: portfolioToForceGraph(graph, directive),
						skills: filteredSkills,
						clusters: createSkillClusters(graph, directive.data),
						focusLevel: directive.data.focusLevel,
						clusterBy: directive.data.clusterBy,
					};
				case 'matrix':
					return {
						...baseData,
						mode: 'skills',
						variant: 'matrix',
						skills: filteredSkills,
						matrix: createSkillMatrix(graph, directive.data),
						focusLevel: directive.data.focusLevel,
						clusterBy: directive.data.clusterBy,
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
						emphasizeStories: directive.data.emphasizeStories,
					};
				case 'evidence':
					return {
						...baseData,
						mode: 'values',
						variant: 'evidence',
						values: allValues,
						evidence: createValueEvidence(graph, directive.data),
						emphasizeStories: directive.data.emphasizeStories,
					};
			}
		}

		case 'compare': {
			switch (directive.data.variant) {
				case 'skills': {
					const leftSkill = findNodeById<SkillNode>(graph, directive.data.leftId, 'skill');
					const rightSkill = findNodeById<SkillNode>(graph, directive.data.rightId, 'skill');
					return {
						...baseData,
						mode: 'compare',
						variant: 'skills',
						leftSkill,
						rightSkill,
						overlap: [], // TODO: Calculate skill overlap
						showOverlap: directive.data.showOverlap,
					};
				}
				case 'projects': {
					const leftProject = findNodeById<ProjectNode>(graph, directive.data.leftId, 'project');
					const rightProject = findNodeById<ProjectNode>(graph, directive.data.rightId, 'project');
					return {
						...baseData,
						mode: 'compare',
						variant: 'projects',
						leftProject,
						rightProject,
						overlap: [], // TODO: Calculate project overlap
						showOverlap: directive.data.showOverlap,
					};
				}
				case 'frontend-vs-backend': {
					const allSkills = filterNodesByType<SkillNode>(graph.nodes, 'skill');
					return {
						...baseData,
						mode: 'compare',
						variant: 'frontend-vs-backend',
						frontendSkills: allSkills.filter((s) => s.tags?.includes('frontend')),
						backendSkills: allSkills.filter((s) => s.tags?.includes('backend')),
						fullStackSkills: allSkills.filter(
							(s) => s.tags?.includes('frontend') && s.tags?.includes('backend'),
						),
						showOverlap: directive.data.showOverlap,
					};
				}
			}
		}

		case 'explore': {
			const allNodes = graph.nodes;

			switch (directive.data.variant) {
				case 'all':
					return {
						...baseData,
						mode: 'explore',
						variant: 'all',
						forceGraphData: portfolioToForceGraph(graph, directive),
						allNodes,
					};
				case 'filtered':
					return {
						...baseData,
						mode: 'explore',
						variant: 'filtered',
						forceGraphData: portfolioToForceGraph(graph, directive),
						filteredNodes: filterNodesByTags(allNodes, directive.data.filterTags),
						filterTags: directive.data.filterTags || [],
					};
			}
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
			// Fallback - should never reach here with proper typing
			throw new Error(`Unknown directive mode: ${(directive as any).mode}`);
	}
}
