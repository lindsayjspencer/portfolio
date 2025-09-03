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
			alt: '2D force-directed dependency versioning UI',
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
		summary:
			'Homepage reduced to a single RAG-backed chat so non-technical visitors quickly learn what Codebots is and how it works. Vectorized docs + curated blogs, model routing, eval-guarded responses, and markdown-rendered answers with streaming.',
		hero: {
			src: '/images/case-studies/codebots-homepage-ai/hero.mp4',
			alt: 'Codebots homepage with AI search chat',
		},
		meta: {
			role: 'Initiator & Lead',
			stack: [
				'Next.js',
				'React',
				'TypeScript',
				'LLM Application Engineering',
				'Local Model Integration',
				'Open WebUI',
				'RAG Flow',
				'Gemma 3',
				'Kimi K2',
				'Redis',
				'Markdown renderer',
			],
			links: [{ title: 'Demo', href: 'https://codebots.com' }],
		},
		sections: [
			{
				kind: 'intro',
				body: 'Visitors arrived via SEO but struggled to grasp Codebots quickly. We simplified the homepage to a single LLM chat grounded by RAG over documentation and curated blogs. A tuned system prompt sets tone and structure, and answers stream with correct markdown rendering.',
			},
			{
				kind: 'bullets',
				title: 'Problem & goals',
				items: [
					'High SEO traffic, low conversion; visitors did not understand “what is Codebots?”',
					'Attention spans declined and content was hard to navigate; steep learning curve',
					'Goal: concise, grounded answers that build comprehension and drive conversion',
				],
			},
			{
				kind: 'bullets',
				title: 'Audience & placement',
				items: [
					'Target: prospective clients and non-technical users',
					'Homepage is chat-first; traditional content receded to support the conversation',
				],
			},
			{
				kind: 'bullets',
				title: 'Retrieval & prompting',
				items: [
					'All documentation vectorized plus a curated selection of blog posts',
					'Tuned system prompt enforces tone and structure; answers render via in-house markdown renderer',
					'Gateway routes each question to the most appropriate model (Gemma 3, Kimi K2)',
				],
			},
			{
				kind: 'bullets',
				title: 'Architecture',
				items: [
					'Open WebUI + RAG Flow orchestrate locally hosted models',
					'RAG over a vector index of docs and curated blogs; answers stream to the UI',
					'Model router/gateway selects between Gemma 3 and Kimi K2 based on query fit',
				],
			},
			{
				kind: 'bullets',
				title: 'Quality & safety',
				items: [
					'Guarded by an eval suite used to test model quality and regressions',
					'Secondary LLM verifier checks responses against guidelines and flags hallucinations',
					'Redis-backed rate limiting to protect the service',
				],
			},
			{
				kind: 'bullets',
				title: 'My role',
				items: [
					'Introduced LLM calls inside the application and shipped text streaming',
					'Designed the chat UX and prompt strategy; integrated markdown rendering',
					'Collaborated with a deployment owner and a 2-person adjacent local AI team',
				],
			},
			{
				kind: 'bullets',
				title: 'Next',
				items: [
					'Clarification and suggestion prompting to boost answer quality and navigation',
					'Merge the main product experience into the homepage for a cohesive journey',
				],
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
		summary:
			'End-to-end platform that automated debt/invoicing, reconciliation, mapping, comms, onsite ops, and analytics. Scaled admin from 1 market → 36 markets with lean staff through systematic automation.',
		hero: {
			src: '/images/case-studies/goodwill-markets/hero.png',
			alt: 'Markets & events admin platform UI',
		},
		meta: {
			role: 'Sole Developer',
			stack: [
				'PHP (CodeIgniter 3)',
				'MySQL',
				'Apache / Linux (Binary Lane VPS)',
				'jQuery → React + TypeScript',
				'Webpack → Rollup',
				'Service Workers',
				'Mandrill/Mailchimp Transactional',
				'MYOB',
				'Westpac (bank feeds)',
				'Square OAuth',
				'Wufoo',
			],
			links: [],
		},
		sections: [
			{
				kind: 'intro',
				body: 'I started in 2014 as Operations Manager and immediately saw Excel-driven processes consuming entire weeks for two admin staff and 25% of the bookkeeper’s time. I delivered a working LAMP system in 10 weeks to automate debts, payments, invoicing, and reconciliation. Over the years it expanded to rich emailing, applications, mapping, MYOB/Westpac integrations, onsite mobile tools, analytics, and a marketing site generator. In 2020 I upgraded PHP 5.6→7.2 and migrated UIs from jQuery to React/TypeScript while re-designing 35 of 38 interfaces.',
			},
			{
				kind: 'bullets',
				title: 'Highlights',
				items: [
					'Automated debt/invoice generation and full bank reconciliation',
					'Drag-and-drop mapping cut 2–3h pre-event work to seconds during the week',
					'Granular permissions for office, onsite, accounting, media, and marketing roles',
					'500 concurrent users at peak; first interactivity ~350ms after optimizations',
					'36+ email template families, previews, history/search, and triggers across the platform',
				],
			},
			{
				kind: 'bullets',
				title: 'Payments & reconciliation',
				items: [
					'Partial payments, refunds, credits, and internal account splits by market/event',
					'MYOB sync for payments against accounts; Westpac batch reconciliation and bank feeds',
					'Reconciliation moved from manual (25% bookkeeper time) to fully automated',
				],
			},
			{
				kind: 'bullets',
				title: 'Emailing & applications',
				items: [
					'Context-aware variables with 36+ template types; preview, history, search',
					'Hundreds of trigger points; Mandrill/Mailchimp transactional for delivery',
					'Applications integrated with email system and Wufoo forms',
				],
			},
			{
				kind: 'bullets',
				title: 'Mapping & onsite ops',
				items: [
					'Drag-and-drop stall allocation (jQuery Sortable → React DnD → native DnD)',
					'Onsite mobile UI: check-in, cash collection, stall moves, incidents, live map, card payments',
				],
			},
			{
				kind: 'bullets',
				title: 'Vendor value engine',
				items: [
					'Internal “thumbprint similarity” scoring identifies missing vendor mix for high-performing days',
					'Suggests vendors to approach to improve the day’s expected performance',
				],
			},
			{
				kind: 'bullets',
				title: 'Marketing site generator',
				items: [
					'Generates the public marketing site from platform values; control colors and content',
					'Outputs SEO artifacts (sitemaps/meta) and handles publish flow',
				],
			},
			{
				kind: 'bullets',
				title: 'Architecture & performance',
				items: [
					'LAMP on Binary Lane VPS (CodeIgniter 3, MySQL, Apache/Linux)',
					'Multi-page app; bundling from Webpack 4 → Rollup; service workers and JS chunking',
					'Concurrency ~500 users; first interactivity ~350ms after optimizations',
					'2020 upgrade PHP 5.6 → 7.2; jQuery → React/TypeScript; 35/38 interfaces redesigned',
				],
			},
			{
				kind: 'bullets',
				title: 'Tech stack',
				items: [
					'PHP (CodeIgniter 3), MySQL, Apache/Linux',
					'jQuery → React + TypeScript',
					'Webpack → Rollup, Service Workers',
					'Mandrill/Mailchimp, MYOB, Westpac, Square OAuth, Wufoo',
				],
			},
			{
				kind: 'metrics',
				title: 'Outcomes',
				metrics: [
					{
						label: 'Admin workload',
						value: '2 staff/week → automated; now 4 staff run 8 weekly markets (2yrs)',
					},
					{ label: 'Today', value: '9 staff operate 36 markets' },
					{ label: 'Reconciliation', value: 'Manual (25% bookkeeper time) → fully automated' },
					{ label: 'Mapping', value: '2–3h pre-event → seconds during the week' },
					{ label: 'A/R owing', value: '~50% outstanding → ~6%' },
					{ label: 'Latency', value: '~350ms first interactivity' },
				],
			},
		],
	},
};

export function getCaseStudyByProjectId(projectId: string) {
	return CASE_STUDIES[projectId];
}
