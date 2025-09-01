import type { Link } from '~/lib/PortfolioStore';

// Lightweight image reference; use string paths under /public or a CDN
export type ImageRef = {
	src: string; // e.g. "/images/case-studies/<slug>/hero.webp"
	alt?: string;
	caption?: string;
	credit?: string;
	meta?: Record<string, string | number | boolean>;
};

export type CaseStudySection =
	| { kind: 'intro'; title?: string; body?: string }
	| { kind: 'image'; title?: string; image: ImageRef }
	| { kind: 'gallery'; title?: string; images: ImageRef[] }
	| { kind: 'bullets'; title?: string; items: string[] }
	| { kind: 'quote'; quote: string; by?: string }
	| { kind: 'metrics'; title?: string; metrics: { label: string; value: string }[] };

export type CaseStudy = {
	id: string; // case study id
	projectId: string; // matches Graph ProjectNode.id
	slug?: string; // optional, for routing if needed
	title?: string;
	summary?: string;
	hero?: ImageRef;
	meta?: {
		role?: string;
		period?: string;
		stack?: string[];
		links?: Link[];
	};
	sections: CaseStudySection[];
	gallery?: ImageRef[];
};
