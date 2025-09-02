import type { CaseStudy } from '~/types/case-study';

// Registry keyed by project id for simple lookup from the graph
export const CASE_STUDIES: Record<string, CaseStudy> = {
	// Example: Dependency Graph Versions project
	proj_dep_graph_versions: {
		id: 'cs_dep_graph_versions',
		projectId: 'proj_dep_graph_versions',
		slug: 'dep-graph-versions',
		title: 'Resource Version Dependency Graph',
		summary:
			'Interactive force-directed tool to plan cascading dependency/version updates and apply them in seconds.',
		hero: {
			src: '/images/case-studies/dep-graph-versions/hero.png',
			alt: '3D force-directed dependency versioning UI',
		},
		meta: {
			role: 'Senior Full Stack Developer',
			stack: ['React', 'TypeScript', 'Three.js'],
			links: [],
		},
		sections: [
			{
				kind: 'intro',
				body: 'Reduced multi-hour workflows to under a minute by visualising and batching cascades.',
			},
			{
				kind: 'bullets',
				title: 'Highlights',
				items: [
					'Interactive 2D force-directed graph for dependency/version planning',
					'Batch cascade planner to apply compatible version updates safely',
					'Performance-focused rendering and interaction for large graphs',
				],
			},
			{
				kind: 'bullets',
				title: 'Tech stack',
				items: ['React', 'TypeScript', 'Three.js'],
			},
			{
				kind: 'metrics',
				metrics: [{ label: 'Efficiency gain', value: '3–4h tasks → <1m' }],
			},
		],
	},

	// Scaffold: Codebots (Modeler)
	proj_codebots_modeler: {
		id: 'cs_codebots_modeler',
		projectId: 'proj_codebots_modeler',
		slug: 'codebots-modeler',
		title: 'Codebots',
		summary: 'Diagram-driven modelling to generate applications; introduced React/TypeScript code generation.',
		hero: {
			src: '/images/case-studies/codebots-modeler/hero.png',
			alt: 'Codebots modelling and generation UI',
		},
		meta: {
			stack: [
				'React',
				'TypeScript',
				'Canvas/WebGL/Three.js',
				'.NET / C#',
				'Vite',
				'CSS',
				'Node.js & CLI tooling',
				'PHP',
				'PostgreSQL',
				'Docker',
			],
			links: [],
		},
		sections: [
			{
				kind: 'intro',
				body: 'Users model entities, security, and queries in interconnected diagrams. A pipeline generates the target application. Introduced React/TypeScript as a first-class generation target.',
			},
			{
				kind: 'bullets',
				title: 'Highlights',
				items: [
					'Diagram-driven modelling across multiple domains (entities, auth, queries)',
					'React/TypeScript code generation introduced alongside existing .NET targets',
					'Advanced canvas/WebGL visualisations for diagramming and interactions',
				],
			},
			{
				kind: 'bullets',
				title: 'Tech stack',
				items: [
					'React',
					'TypeScript',
					'Canvas/WebGL/Three.js',
					'.NET / C#',
					'Vite',
					'CSS',
					'Node.js & CLI tooling',
					'PHP',
					'PostgreSQL',
					'Docker',
				],
			},
		],
	},

	// Scaffold: Codebots Homepage / AI Search
	proj_codebots_homepage_ai: {
		id: 'cs_codebots_homepage_ai',
		projectId: 'proj_codebots_homepage_ai',
		slug: 'codebots-homepage-ai',
		title: 'Codebots Homepage / AI Search',
		summary: 'Public-facing landing page with LLM/RAG-powered chat over company documentation.',
		hero: {
			src: '/images/case-studies/codebots-homepage-ai/hero.png',
			alt: 'Codebots homepage with AI search chat',
		},
		meta: {
			stack: ['Next.js', 'React', 'TypeScript', 'LLM Application Engineering', 'Local Model Integration'],
			links: [{ title: 'Demo', href: 'https://beta.codebots.com' }],
		},
		sections: [
			{
				kind: 'intro',
				body: 'Public-facing landing page featuring LLM-driven chat grounded with RAG over company documentation.',
			},
			{
				kind: 'bullets',
				title: 'Highlights',
				items: [
					'RAG-backed chat UX answering product/company questions',
					'Next.js app with production deployment',
					'Focus on concise responses and discoverability',
				],
			},
			{
				kind: 'bullets',
				title: 'Tech stack',
				items: ['Next.js', 'React', 'TypeScript', 'LLM Application Engineering', 'Local Model Integration'],
			},
		],
	},

	// Scaffold: React Granular Store (OSS)
	proj_react_granular_store: {
		id: 'cs_react_granular_store',
		projectId: 'proj_react_granular_store',
		slug: 'react-granular-store',
		title: 'React Granular Store (OSS)',
		summary: 'State management library for performant granular updates in React.',
		hero: {
			src: '/images/case-studies/react-granular-store/hero.png',
			alt: 'React Granular Store library usage example',
		},
		meta: {
			stack: ['React', 'TypeScript'],
			links: [{ title: 'npm', href: 'https://www.npmjs.com/package/react-granular-store' }],
		},
		sections: [
			{
				kind: 'intro',
				body: 'Open-source state management library enabling performant granular updates in React.',
			},
			{
				kind: 'bullets',
				title: 'Highlights',
				items: [
					'Fine-grained reactivity to minimize unnecessary renders',
					'Ergonomic TypeScript-first API',
					'Used in enterprise applications',
				],
			},
			{ kind: 'bullets', title: 'Tech stack', items: ['React', 'TypeScript'] },
		],
	},

	// Scaffold: Markets & Events Platform (Goodwill)
	proj_goodwill_markets: {
		id: 'cs_goodwill_markets',
		projectId: 'proj_goodwill_markets',
		slug: 'goodwill-markets',
		title: 'Markets & Events Platform',
		summary: 'End-to-end admin & operations platform: bookings, payments, integrations, onsite tools, analytics.',
		hero: {
			src: '/images/case-studies/goodwill-markets/hero.png',
			alt: 'Markets & events admin platform UI',
		},
		meta: {
			stack: ['React', 'TypeScript', 'jQuery', 'PHP', 'MySQL', 'Docker', 'Linux', 'Apache', 'Three.js'],
			links: [],
		},
		sections: [
			{
				kind: 'intro',
				body: 'Multi-year system powering vendor onboarding, bookings, payments and accounting integrations, onsite tools, analytics, mapping, document management, surveys, rich email templating, and a marketing site generator.',
			},
			{
				kind: 'bullets',
				title: 'Highlights',
				items: [
					'Admin & operations platform scaled from 1 → 36 markets across AU',
					'Integrated payments and bookkeeping with MYOB/Westpac',
					'Onsite mobile views, drag-and-drop UIs, and mapping tools',
					'Rich email templating and automated document workflows',
				],
			},
			{
				kind: 'bullets',
				title: 'Tech stack',
				items: ['React', 'TypeScript', 'jQuery', 'PHP', 'MySQL', 'Docker', 'Linux', 'Apache', 'Three.js'],
			},
			{
				kind: 'metrics',
				title: 'Outcomes',
				metrics: [
					{ label: 'Admin reduction', value: '-60% office admin per event' },
					{ label: 'Bookkeeper automation', value: '80% automated' },
					{ label: 'Markets scaled', value: '1 → 36 across AU' },
				],
			},
		],
	},
};

export function getCaseStudyByProjectId(projectId: string) {
	return CASE_STUDIES[projectId];
}
