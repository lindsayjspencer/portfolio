import portfolioData from '~/data/portfolio.json';
import { CASE_STUDIES } from '~/data/case-studies';
import type { CaseStudy } from '~/types/case-study';

type PortfolioNode = {
	id: string;
	type: string;
	label: string;
	summary?: string;
	tags?: string[];
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

function truncate(text: string | undefined, maxLength = 140): string | undefined {
	if (!text) {
		return undefined;
	}

	const normalized = text.replace(/\s+/g, ' ').trim();
	if (normalized.length <= maxLength) {
		return normalized;
	}

	return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
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

function formatNodeIndexLine(node: PortfolioNode): string {
	const parts = [`- ${node.id}`, node.label];
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

export function formatPortfolioAsIndex(graph: PortfolioGraph): string {
	const nodesByType = graph.nodes.reduce<Record<string, PortfolioNode[]>>((acc, node) => {
		const bucket = acc[node.type] ?? [];
		bucket.push(node);
		acc[node.type] = bucket;
		return acc;
	}, {});

	return TYPE_ORDER.map((type) => {
		const typeNodes = sortNodes(nodesByType[type] ?? []);
		if (typeNodes.length === 0) {
			return null;
		}

		const lines = typeNodes.map((node) => formatNodeIndexLine(node));
		return `${TYPE_LABELS[type]}:\n${lines.join('\n')}`;
	})
		.filter((section): section is string => section !== null)
		.join('\n\n');
}

export function formatCaseStudiesAsIndex(caseStudies: Record<string, CaseStudy>): string {
	return Object.values(caseStudies)
		.map((caseStudy) => {
			const parts = [`- ${caseStudy.projectId}`, caseStudy.title ?? caseStudy.id];
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

export function buildAskPromptContexts() {
	return {
		lindsayProfileContext: LINDSAY_PROFILE_INDEX,
		portfolioContext: formatPortfolioAsIndex(portfolioGraph),
		caseStudiesContext: formatCaseStudiesAsIndex(CASE_STUDIES),
	};
}
