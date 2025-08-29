import { create } from 'zustand';
import portfolioData from '~/data/portfolio.json';
import type { DirectiveType } from './DirectiveTool';

// ===== Portfolio Graph Types =====

export type NodeType =
	| 'person'
	| 'role'
	| 'project'
	| 'skill'
	| 'value'
	| 'story'
	| 'year'
	| 'education'
	| 'cert'
	| 'award'
	| 'talk'
	| 'timeline-month';

export type SkillLevel = 'expert' | 'advanced' | 'intermediate';

export type Period = {
	/** ISO "YYYY-MM"; use "present" for ongoing */
	start: string;
	end: string; // e.g. "2025-07" | "present"
};

export type Link = {
	title: string;
	href: string; // absolute URL or mailto:
};

export type Metric = {
	label: string; // short: "Admin reduction"
	value: string; // human: "-60% office admin per event"
};

export type Node = {
	id: string;
	type: NodeType;
	label: string;

	/** 1–2 lines; used in resume bullets, tooltips */
	summary?: string;

	/** Longer prose; used for detail panes/LLM synthesis */
	description?: string;

	/** Free-form facets for filtering (e.g., "frontend","llm","gpt","gemini") */
	tags?: string[];

	/** Coarse time range for fast lookup & timeline mode */
	years?: [number, number];

	/** Granular time range */
	period?: Period;

	/** Optional city/country or remote */
	location?: string;

	/** Public references (portfolio, demos, npm, repos, email) */
	links?: Link[];

	/** Resume-friendly numbers/outcomes */
	metrics?: Metric[];

	/** Only for type === "skill" */
	level?: SkillLevel;
};

export type EdgeRel =
	| 'worked_as' // person → role
	| 'used' // project → skill (or role → skill)
	| 'learned' // role → skill (growth)
	| 'built' // person → project
	| 'led' // person/role → project/team
	| 'mentored' // person/role → value/story
	| 'evidence' // role/person → value (supports a value)
	| 'timeline' // story/milestone → person/year spine
	| 'timeline-marker' // timeline marker → timeline marker
	| 'happened_during' // story → role/project
	| 'depends' // project/skill → project/skill
	| 'collab' // person/team → project
	| 'impacted'; // story/project → value/metric

export type Edge = {
	id: string;
	source: string; // Node.id
	target: string; // Node.id
	rel: EdgeRel;
};

export type GraphMeta = {
	personId: string; // primary "person" node id
	lastUpdated: string; // ISO date "YYYY-MM-DD"
};

export type Graph = {
	nodes: Node[];
	edges: Edge[];
	meta?: GraphMeta;
};

export type ChatMessage = {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	directive?: DirectiveType;
};

interface PortfolioState {
	graph: Graph;
	directive: DirectiveType;
	messages: ChatMessage[];
	isLoading: boolean;
	
	// Chat-specific state
	input: string;
	narrative: string | null;
	isTransitioningFromLanding: boolean;

	// Actions
	setDirective: (directive: DirectiveType) => void;
	addMessage: (message: Omit<ChatMessage, 'id'>) => void;
	setLoading: (loading: boolean) => void;
	clearMessages: () => void;
	
	// Chat actions
	setInput: (input: string) => void;
	setNarrative: (narrative: string | null) => void;
	setIsTransitioningFromLanding: (transitioning: boolean) => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
	graph: portfolioData as Graph,
	directive: {
		mode: 'landing',
		highlights: [],
		narration: '',
	},
	messages: [],
	isLoading: false,
	
	// Chat-specific state
	input: '',
	narrative: null,
	isTransitioningFromLanding: false,

	setDirective: (directive) => set({ directive }),

	addMessage: (message) =>
		set((state) => ({
			messages: [
				...state.messages,
				{
					...message,
					id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				},
			],
		})),

	setLoading: (isLoading) => set({ isLoading }),

	clearMessages: () =>
		set({
			messages: [],
			directive: {
				mode: 'landing',
				highlights: [],
				narration: '',
			},
		}),
	
	// Chat actions
	setInput: (input) => set({ input }),
	setNarrative: (narrative) => set({ narrative }),
	setIsTransitioningFromLanding: (isTransitioningFromLanding) => set({ isTransitioningFromLanding }),
}));
