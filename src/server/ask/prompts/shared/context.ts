import portfolioData from '~/data/portfolio.json';
import { CASE_STUDIES } from '~/data/case-studies';
import type { CaseStudy } from '~/types/case-study';

type PortfolioNode = {
	id: string;
	type: string;
	label: string;
	summary?: string;
	tags?: string[];
	links?: Array<{
		title: string;
		href: string;
	}>;
	years?: [number, number];
	level?: string;
	period?: {
		start?: string;
		end?: string;
	};
};

type PortfolioEdge = {
	source: string;
	target: string;
	rel: string;
};

type PortfolioGraph = {
	nodes: PortfolioNode[];
	edges: PortfolioEdge[];
};

const portfolioGraph = portfolioData as PortfolioGraph;

const TYPE_ORDER = ['person', 'role', 'project', 'skill', 'value', 'story'] as const;
const TYPE_LABELS: Record<(typeof TYPE_ORDER)[number], string> = {
	person: 'People',
	role: 'Roles',
	project: 'Projects',
	skill: 'Skills',
	value: 'Values',
	story: 'Stories',
};

const LINDSAY_PROFILE_INDEX = `- Voice anchors: concise, analytical, pragmatic, disciplined, curious.
- Personal facts if directly relevant: endurance runner, dog named Cauliflower, likes movies, podcasts, and Italian food.
- Values to reflect in tone: honesty, discipline, efficiency, consistency, balance.`;

type PortfolioIndexOptions = {
	includeIds: boolean;
	includeLinks?: boolean;
	limitByType?: Partial<Record<(typeof TYPE_ORDER)[number], number>>;
};

function truncate(text: string | undefined, maxLength = 140): string | undefined {
	if (!text) {
		return undefined;
	}

	const normalized = text.replace(/\s+/g, ' ').trim();
	if (normalized.length <= maxLength) {
		return normalized;
	}

	return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function formatNodeYears(node: PortfolioNode): string | null {
	const start = node.years?.[0];
	const endPeriod = node.period?.end;
	const end = endPeriod === 'present' ? 'present' : node.years?.[1];

	if (start === undefined && end === undefined) {
		return null;
	}

	if (start !== undefined && end !== undefined) {
		return `${start}-${end}`;
	}

	return String(start ?? end);
}

function formatNodeLinks(node: PortfolioNode): string | null {
	if (!node.links?.length) {
		return null;
	}

	const links = node.links.slice(0, 4).map((link) => `${link.title}: ${link.href}`);
	return links.length > 0 ? `links: ${links.join(' | ')}` : null;
}

function formatNodeIndexLine(node: PortfolioNode, options: PortfolioIndexOptions): string {
	const parts = [options.includeIds ? `- ${node.id}` : `- ${node.label}`];

	if (options.includeIds) {
		parts.push(node.label);
	}

	const years = formatNodeYears(node);
	if (years) {
		parts.push(years);
	}

	const summary = truncate(node.summary);
	if (summary) {
		parts.push(summary);
	}

	if (node.tags?.length) {
		parts.push(`tags: ${node.tags.slice(0, 6).join(', ')}`);
	}

	if (node.level) {
		parts.push(`level: ${node.level}`);
	}

	if (options.includeLinks) {
		const links = formatNodeLinks(node);
		if (links) {
			parts.push(links);
		}
	}

	return parts.join(' | ');
}

function sortNodes(nodes: PortfolioNode[]): PortfolioNode[] {
	return [...nodes].sort((left, right) => {
		const leftYear = left.years?.[1] ?? left.years?.[0] ?? 0;
		const rightYear = right.years?.[1] ?? right.years?.[0] ?? 0;
		if (leftYear !== rightYear) {
			return rightYear - leftYear;
		}

		return left.label.localeCompare(right.label);
	});
}

function formatPortfolioAsIndex(graph: PortfolioGraph, options: PortfolioIndexOptions): string {
	const nodesByType = graph.nodes.reduce<Record<string, PortfolioNode[]>>((acc, node) => {
		const bucket = acc[node.type] ?? [];
		bucket.push(node);
		acc[node.type] = bucket;
		return acc;
	}, {});

	return TYPE_ORDER.map((type) => {
		const typeNodes = sortNodes(nodesByType[type] ?? []);
		const limit = options.limitByType?.[type];
		const visibleNodes = typeof limit === 'number' ? typeNodes.slice(0, limit) : typeNodes;
		if (visibleNodes.length === 0) {
			return null;
		}

		const lines = visibleNodes.map((node) => formatNodeIndexLine(node, options));
		return `${TYPE_LABELS[type]}:\n${lines.join('\n')}`;
	})
		.filter((section): section is string => section !== null)
		.join('\n\n');
}

function formatCaseStudiesAsIndex(
	caseStudies: Record<string, CaseStudy>,
	includeIds: boolean,
	limit?: number,
): string {
	const visibleCaseStudies = typeof limit === 'number' ? Object.values(caseStudies).slice(0, limit) : Object.values(caseStudies);

	return visibleCaseStudies
		.map((caseStudy) => {
			const parts = [includeIds ? `- ${caseStudy.projectId}` : `- ${caseStudy.title ?? caseStudy.id}`];

			if (includeIds) {
				parts.push(caseStudy.title ?? caseStudy.id);
			}

			const summary = truncate(caseStudy.summary, 160);
			if (summary) {
				parts.push(summary);
			}

			if (caseStudy.meta?.role) {
				parts.push(`role: ${caseStudy.meta.role}`);
			}

			if (caseStudy.meta?.stack?.length) {
				parts.push(`stack: ${caseStudy.meta.stack.slice(0, 6).join(', ')}`);
			}

			return parts.join(' | ');
		})
		.join('\n');
}

function buildPublicResourcesContext(graph: PortfolioGraph): string {
	const personNode = graph.nodes.find((node) => node.type === 'person');

	if (!personNode?.links?.length) {
		return '- No public profile or contact resources are listed.';
	}

	return personNode.links
		.slice(0, 6)
		.map((link) => `- ${link.title}: ${link.href}`)
		.join('\n');
}

export function buildAskPromptContexts() {
	return {
		lindsayProfileContext: LINDSAY_PROFILE_INDEX,
		plannerPortfolioContext: formatPortfolioAsIndex(portfolioGraph, {
			includeIds: true,
		}),
		narrationPortfolioContext: formatPortfolioAsIndex(portfolioGraph, {
			includeIds: false,
			includeLinks: true,
		}),
		purposePortfolioContext: formatPortfolioAsIndex(portfolioGraph, {
			includeIds: false,
			includeLinks: true,
			limitByType: {
				person: 1,
				role: 4,
				project: 6,
				skill: 8,
				value: 4,
				story: 3,
			},
		}),
		plannerCaseStudiesContext: formatCaseStudiesAsIndex(CASE_STUDIES, true),
		narrationCaseStudiesContext: formatCaseStudiesAsIndex(CASE_STUDIES, false),
		purposeCaseStudiesContext: formatCaseStudiesAsIndex(CASE_STUDIES, false, 6),
		publicResourcesContext: buildPublicResourcesContext(portfolioGraph),
	};
}
