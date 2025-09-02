import { createStore, type StoreApi } from 'zustand';
import { useContext, createContext } from 'react';
import { useStore } from 'zustand';
import portfolioData from '~/data/portfolio.json';
import type { ClarifyPayload } from './ai/clarifyTool';
import type { ForceDirectedGraphNode } from '~/components/ForceGraph/Common';
import type { Directive, LandingDirective } from './ai/directiveTools';

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
	| 'timeline-month'
	| 'tag';

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

// Base node interface with common properties
interface BaseNode {
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
}

// Type-specific node interfaces
export interface PersonNode extends BaseNode {
	type: 'person';
	/** Required location for person */
	location: string;
	/** Required contact/portfolio links for person */
	links: Link[];
}

export interface RoleNode extends BaseNode {
	type: 'role';
	/** Company name extracted from label */
	company: string;
	/** Job position/title extracted from label */
	position: string;
	/** Required location for role */
	location: string;
	/** Required time period for role */
	period: Period;
	/** Optional metrics/achievements for role */
	metrics?: Metric[];
}

export interface ProjectNode extends BaseNode {
	type: 'project';
	/** Required time period for project */
	period: Period;
	/** Optional demo/repo links for project */
	links?: Link[];
	/** Optional metrics/outcomes for project */
	metrics?: Metric[];
}

export interface SkillNode extends BaseNode {
	type: 'skill';
	/** Required proficiency level for skill */
	level: SkillLevel;
}

export interface ValueNode extends BaseNode {
	type: 'value';
}

export interface StoryNode extends BaseNode {
	type: 'story';
}

export interface YearNode extends BaseNode {
	type: 'year';
}

export interface EducationNode extends BaseNode {
	type: 'education';
	/** Optional time period for education */
	period?: Period;
	/** Optional location for education */
	location?: string;
}

export interface CertNode extends BaseNode {
	type: 'cert';
	/** Optional time period for certification */
	period?: Period;
}

export interface AwardNode extends BaseNode {
	type: 'award';
	/** Optional time period for award */
	period?: Period;
}

export interface TalkNode extends BaseNode {
	type: 'talk';
	/** Optional time period for talk */
	period?: Period;
	/** Optional location for talk */
	location?: string;
	/** Optional links for talk (video, slides, etc.) */
	links?: Link[];
}

export interface TimelineMonthNode extends BaseNode {
	type: 'timeline-month';
}

export interface TagNode extends BaseNode {
	type: 'tag';
}

// Discriminated union of all node types
export type Node =
	| PersonNode
	| RoleNode
	| ProjectNode
	| SkillNode
	| ValueNode
	| StoryNode
	| YearNode
	| EducationNode
	| CertNode
	| AwardNode
	| TalkNode
	| TimelineMonthNode
	| TagNode;

export type EdgeRel =
	| 'worked_as' // person → role
	| 'used' // project → skill (or role → skill)
	| 'learned' // role → skill (growth)
	| 'built' // person → project
	| 'led' // person/role → project/team
	| 'mentored' // person/role → value/story
	| 'evidence' // role/person → value (supports a value)
	| 'values' // person → value (person's core values)
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

// Export static graph directly from JSON; not part of Zustand state.
export const graph: Graph = portfolioData as Graph;

// Response types for multi-modal AI responses
export type Response =
	| { kind: 'directive'; data: Directive }
	| { kind: 'clarify'; data: ClarifyPayload }
	| { kind: 'narration'; text: string };

export type ChatMessage = {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	directive?: Directive;
	response?: Response; // New field for rich responses
};

export type PanelContent =
	| {
			type: 'node';
			title: string;
			data: ForceDirectedGraphNode;
			onClose?: () => void;
	  }
	| {
			type: 'custom';
			title: string;
			data: React.ReactNode;
			onClose?: () => void;
	  };

export interface PortfolioState {
	directive: Directive;
	messages: ChatMessage[];
	isLoading: boolean;

	// Chat-specific state
	input: string;

	// Panel state
	isPanelOpen: boolean;
	panelContent: PanelContent | null;

	// New: Response tracking
	responses: Response[];
	pendingClarify?: ClarifyPayload;
	lastDirective?: Directive;

	// Actions
	setDirective: (directive: Directive) => void;
	addMessage: (message: Omit<ChatMessage, 'id'>) => void;
	setLoading: (loading: boolean) => void;
	clearMessages: () => void;

	// Chat actions
	setInput: (input: string) => void;

	// New: Response actions
	pushResponse: (response: Response) => void;
	setPendingClarify: (payload: ClarifyPayload | undefined) => void;
	setLastDirective: (directive: Directive) => void;
	clearResponses: () => void;

	// Panel actions
	openPanel: (content: PanelContent) => void;
	closePanel: () => void;
	togglePanel: () => void;
}

export type PortfolioStoreApi = StoreApi<PortfolioState>;

export function createPortfolioStore(initialDirective: Directive): PortfolioStoreApi {
	return createStore<PortfolioState>((set) => ({
		directive: initialDirective,
		messages: [],
		isLoading: false,

		// Chat-specific state
		input: '',

		// Panel state
		isPanelOpen: false,
		panelContent: null,

		// New: Response tracking
		responses: [],
		pendingClarify: undefined,
		lastDirective: undefined,

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
					data: {
						variant: 'neutral',
						highlights: [],
						narration: '',
						confidence: 0.7,
					},
				} as Directive,
			}),

		// Chat actions
		setInput: (input) => set({ input }),
		// setNarrative removed; narrative lives in directive.data.narration

		// New: Response actions
		pushResponse: (response) =>
			set((state) => ({
				responses: [...state.responses, response],
			})),

		setPendingClarify: (payload) => set({ pendingClarify: payload }),

		setLastDirective: (directive) => set({ lastDirective: directive }),

		clearResponses: () => set({ responses: [], pendingClarify: undefined }),

		// Panel actions
		openPanel: (content) => set({ isPanelOpen: true, panelContent: content }),
		closePanel: () => set({ isPanelOpen: false, panelContent: null }),
		togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
	}));
}

// React context exported here to avoid circular imports
export const PortfolioStoreContext = createContext<PortfolioStoreApi | null>(null);

// Hook compatible with existing call sites: usePortfolioStore(selector?)
export function usePortfolioStore(): PortfolioState;
export function usePortfolioStore<T>(selector: (state: PortfolioState) => T): T;
export function usePortfolioStore<T>(selector?: (state: PortfolioState) => T): T | PortfolioState {
	const store = useContext(PortfolioStoreContext);
	if (!store) throw new Error('usePortfolioStore must be used within a PortfolioStoreProvider');
	if (selector) {
		return useStore(store, selector);
	}
	return useStore(store, (s) => s);
}
