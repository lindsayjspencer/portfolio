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
			'Interactive, real-time version dependency graph. Plan and apply cascading updates with one-click macros; replaced multi-hour manual workflows with minutes-long visual operations.',
		hero: {
			src: '/images/case-studies/dep-graph-versions/hero.mp4',
			alt: '3D force-directed dependency versioning UI',
		},
		meta: {
			role: 'Author & Lead',
			stack: ['React', 'TypeScript', 'd3-force', 'force-graph-2d', 'Canvas/WebGL (shaders)'],
			links: [],
		},
		sections: [
			{
				kind: 'intro',
				body: 'Users struggled to manage long dependency chains across versions, often spending hours and reverting changes. I designed and built a 2D force-directed version graph that reacts live to edits, surfaces conflicts, and applies safe cascades via one-click macros.',
			},
			{
				kind: 'bullets',
				title: 'Highlights',
				items: [
					'Real-time: graph recomputes membership and conflicts as you edit',
					'One-click macros version entire systems safely (no diagram hopping)',
					'Iterated closely with design to achieve smooth, intuitive behaviour',
				],
			},
			{
				kind: 'bullets',
				title: 'Validation rules',
				items: [
					'circular-dependency-detected — resource is part of a circular dependency',
					'duplicate-metamodel-version — multiple versions of same metamodel in dependency tree',
					'duplicate-model-version — multiple versions of same model in dependency tree',
					'metamodel-version-depends-on-latest — versioned metamodel → working metamodel',
					'metamodel-version-depends-on-latest-visual-library-version — versioned metamodel → working visual library',
					'model-version-depends-on-latest — versioned model → working model',
					'model-version-depends-on-latest-metamodel-version — versioned model → working metamodel',
					'All validations treated as errors; grouped in the side panel and overlaid on-canvas',
				],
			},
			{
				kind: 'bullets',
				title: 'Macros',
				items: [
					'Switch all versions to latest (compatible) across the system',
					'Create downstream versions where needed to keep chains consistent',
					'Version entire system to a single version number when required',
					'Effects are precomputed so validation runs on the future state before applying',
				],
			},
			{
				kind: 'bullets',
				title: 'Undo and explainability',
				items: [
					'Full undo system maps changes over the original graph and recomputes live',
					'All changes rendered as human-readable diffs and highlighted in a right panel',
				],
			},
			{
				kind: 'bullets',
				title: 'Performance & rendering',
				items: [
					'Always maintains 60fps on worst-case ~400 nodes/edges',
					'Ready to interact in under 100ms; macro execution typically < 20ms',
					'2D physics with d3-force; positions are live (no persisted/precomputed layout)',
					'force-graph-2d with pure Canvas/WebGL shaders; complex node drawing reacts to live state',
				],
			},
			{
				kind: 'metrics',
				title: 'Outcomes',
				metrics: [
					{ label: 'Time saved', value: '3–4h workflows → < 1m' },
					{ label: 'Version throughput', value: '5× more versions created by developers' },
					{ label: 'Adoption', value: 'Became the default; replaced 7 full interfaces' },
					{ label: 'Performance', value: '~400 nodes/edges @ 60fps' },
					{ label: 'UX latency', value: '<100ms ready; <20ms macro apply' },
				],
			},
			{
				kind: 'bullets',
				title: 'Tech stack',
				items: ['React', 'TypeScript', 'd3-force', 'force-graph-2d', 'Canvas/WebGL (shaders)'],
			},
		],
	},

	// Scaffold: Codebots (Modeler)
	proj_codebots_modeler: {
		id: 'cs_codebots_modeler',
		projectId: 'proj_codebots_modeler',
		slug: 'codebots-modeler',
		title: 'Codebots Platform',
		summary:
			'Diagram-driven modelling and code generation platform. I led the project, focusing on diagramming SDK integration, concurrency, the pipeline designer, and major frontend stack migrations.',
		hero: {
			src: '/images/case-studies/codebots-modeler/hero.mp4',
			alt: 'Codebots modelling and generation UI',
		},
		meta: {
			role: 'Project Lead',
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
				body: 'Codebots lets teams design metamodels, visuals, and application models using a proprietary diagramming SDK, then generate production code via pipelines (EGL/EGX and related Epsilon tools). I led the platform, focusing on SDK integration, concurrency, pipeline UX, and frontend migrations.',
			},
			{
				kind: 'bullets',
				title: 'My contributions',
				items: [
					'Diagramming SDK integration and compatibility shaping (Three.js, Canvas/WebGL, shaders)',
					'Concurrency & persistence for diagrams (Redis + SignalR), including cursor overlays and locks',
					'Pipeline designer UX on the frontend; colleague implemented the runner',
					'Initiated configuration→XML transform to drive the diagramming SDK from metamodel + visuals',
					'Frontend migrations: React 16→18, Webpack 4→Vite, progressively stricter TypeScript',
					'UI library and theming; led move from styled-components to SCSS for better runtime UX',
				],
			},
			{
				kind: 'bullets',
				title: 'Diagramming system',
				items: [
					'In-house SDK with CSS-like visuals system, XML configuration, and an emfatic-like metamodel system',
					'Linked metamodel + visuals diagrams produce SDK XML; users then instantiate editable models',
					'Built with Three.js, Canvas/WebGL, typed in TypeScript',
				],
			},
			{
				kind: 'bullets',
				title: 'Pipelines',
				items: [
					'Diagram-based orchestration: transform models, generate code, run Java tools, persist outputs',
					'Inputs: models, metamodels, git repos, other pipelines; steps leverage the Epsilon ecosystem (EGL/EGX)',
					'Used to generate e.g. REST APIs from entity models',
				],
			},
			{
				kind: 'bullets',
				title: 'Concurrency',
				items: [
					'Full multi-user diagram editing with cursor overlays and lock states',
					'Backed by Redis and SignalR (.NET) for state sync and presence',
				],
			},
			{
				kind: 'bullets',
				title: 'Resource versioning',
				items: [
					'All resources (pipelines, models, metamodels, visuals, bots) are versioned for reproducibility',
					'Dependencies tracked across versions; conflicts mitigated (see Resource Version Dependency Graph project)',
				],
			},
			{
				kind: 'bullets',
				title: 'CLI',
				items: [
					'Pipelines can run locally via CLI, loading platform resources alongside your repo',
					'Focus on deterministic, regenerable code (contrasted with AI-generated variability)',
				],
			},
			{
				kind: 'bullets',
				title: 'Usage',
				items: [
					'Primarily used internally by WorkingMouse and East Cottage Industries for client applications',
				],
			},
			{
				kind: 'bullets',
				title: 'Styling system',
				items: [
					'Custom UI library with theming; ultimately migrated from styled-components to SCSS for runtime UX',
				],
			},
			{
				kind: 'bullets',
				title: 'History & migrations',
				items: [
					'Origins as an Eclipse plugin → LAMP (2018) → .NET/C# backend (2021)',
					'Frontend: Marionette/Backbone/jQuery → React/TypeScript (2021)',
					'Build tooling: Webpack 4 → Vite (2022) under my leadership',
				],
			},
			{
				kind: 'bullets',
				title: 'Architecture',
				items: [
					'.NET/C# backend, Redis, Helm/Kubernetes deployment',
					'Java-based pipeline runner, PostgreSQL database',
					'Monorepo/multi-package setup',
				],
			},
			{
				kind: 'bullets',
				title: 'Challenges',
				items: [
					'Performance at scale: pushed from a few thousand to ~250k concurrently rendered nodes',
					'Fast-turnaround feature requests from sister company while protecting platform stability',
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
		summary:
			'Lightweight state library with granular subscriptions, strong typing, and predictable rendering. Built to replace heavy proxy-based patterns and reduce memory/over-rendering at scale.',
		hero: {
			src: '/images/case-studies/react-granular-store/hero.png',
			alt: 'React Granular Store library usage example',
		},
		meta: {
			role: 'Author & Maintainer',
			stack: ['React', 'TypeScript', 'TypeScript type tests', 'NPM package publishing'],
			links: [{ title: 'npm', href: 'https://www.npmjs.com/package/react-granular-store' }],
		},
		sections: [
			{
				kind: 'intro',
				body: 'I built this after hitting limits with proxy-based state (MobX-style) that used too much memory, re-rendered too often, and hid when updates would happen. This store gives tight control and observability with granular subscriptions and a minimal, strongly-typed API.',
			},
			{
				kind: 'bullets',
				title: 'Motivation',
				items: [
					'Reduce memory footprint vs. pervasive proxy patterns',
					'Predictable render timing with per-key subscriptions',
					'Lower boilerplate to get simple, ergonomic state flows',
				],
			},
			{
				kind: 'bullets',
				title: 'Highlights',
				items: [
					'Granular reactivity: components re-render only when the specific key changes',
					'Strongly typed API; returned hooks are precisely typed for value and setters',
					'Observability: subscribe/listen to per-key changes outside React when needed',
					'Drop-in ergonomics: useStoreState feels like useState with better control',
				],
			},
			{
				kind: 'bullets',
				title: 'API & hooks',
				items: [
					'Store: getState/setState/on/off/subscribe for direct control and side effects',
					'useStoreState: tuple [value, setValue] (drop-in useState replacement)',
					'useStoreValue: subscribe without setters (read-only)',
					'useStoreUpdate: update without subscribing (prevents re-renders)',
					'Optional batchUpdates mode for consistent multi-update flows',
				],
			},
			{
				kind: 'bullets',
				title: 'Types & tests',
				items: [
					'Extremely tight typing for hook return values and store methods',
					'Type-level tests ensure complex generic inference remains stable',
					'Published and maintained as an NPM package',
				],
			},
			{
				kind: 'bullets',
				title: 'Behavior & performance',
				items: [
					'Equality function controls when updates propagate (default strict equality)',
					'Granular subscriptions avoid tree-wide re-renders',
					'Good fit for complex forms and local domain state that need observability',
				],
			},
			{
				kind: 'metrics',
				title: 'Outcomes',
				metrics: [
					{ label: 'Adoption', value: 'Used in enterprise applications' },
					{ label: 'Distribution', value: 'Published on npm' },
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
