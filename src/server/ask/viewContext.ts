import portfolioData from '~/data/portfolio.json';
import {
	createDataSnapshot,
	type DataSnapshot,
	type ExploreSnapshot,
	type ProjectsGridSnapshot,
	type ValuesEvidenceSnapshot,
} from '~/lib/ViewTransitions';
import type {
	ProjectNode,
	RoleNode,
	SkillNode,
	StoryNode,
	ValueNode,
	Graph,
	Node,
} from '~/lib/PortfolioStore';
import { getDirectiveHighlights, type Directive } from '~/lib/ai/directiveTools';

const graph = portfolioData as Graph;

type NarrationViewContext = {
	viewSummary: string;
	detailedViewContext: string;
	plannerReason: string;
};

function sentenceCaseList(labels: string[], maxItems = 4): string {
	const unique = Array.from(new Set(labels.filter(Boolean))).slice(0, maxItems);
	if (unique.length === 0) {
		return 'none called out explicitly';
	}

	if (unique.length === 1) {
		return unique[0]!;
	}

	if (unique.length === 2) {
		return `${unique[0]} and ${unique[1]}`;
	}

	return `${unique.slice(0, -1).join(', ')}, and ${unique[unique.length - 1]}`;
}

function findNodeLabel(id: string): string | null {
	return graph.nodes.find((node) => node.id === id)?.label ?? null;
}

function findNodeLabels(ids: string[]): string[] {
	return ids.map((id) => findNodeLabel(id)).filter((label): label is string => label !== null);
}

function nodeTypeLabel(node: Node): string {
	switch (node.type) {
		case 'role':
			return 'role';
		case 'project':
			return 'project';
		case 'skill':
			return 'skill';
		case 'value':
			return 'value';
		case 'story':
			return 'story';
		default:
			return 'node';
	}
}

function describeHighlightedNodes(ids: string[]): string {
	const labels = findNodeLabels(ids);
	return labels.length > 0 ? sentenceCaseList(labels) : 'no specific items are highlighted';
}

function buildDerivedReason(directive: Directive): string {
	switch (directive.mode) {
		case 'timeline':
			return 'This question is best supported by a chronological view.';
		case 'projects':
			return directive.data.variant === 'case-study'
				? 'A focused project case study best supports this answer.'
				: 'A project-focused view best supports this answer.';
		case 'skills':
			return 'A skills-focused view best supports this answer.';
		case 'values':
			return 'A values-and-evidence view best supports this answer.';
		case 'compare':
			return 'A side-by-side comparison best supports this answer.';
		case 'explore':
			return 'A broad exploratory view gives the right amount of context for this answer.';
		case 'resume':
			return 'The resume view is the clearest support for this answer.';
		case 'landing':
			return 'A supporting portfolio view helps ground this answer.';
	}

	return 'A supporting portfolio view helps ground this answer.';
}

function sanitizePlannerReason(reason: string | null | undefined, directive: Directive): string {
	const normalized = reason?.replace(/\s+/g, ' ').trim();
	if (!normalized) {
		return buildDerivedReason(directive);
	}

	const unsafePatterns = [
		/show[A-Z][A-Za-z]+View/,
		/<functions\./,
		/```/,
		/[{}[\]]/,
		/\btheme\b/i,
		/\bvariant\b/i,
		/\bhighlights?\b/i,
		/\bpinned\b/i,
		/\bleftId\b/i,
		/\brightId\b/i,
		/\b[a-z]+_[a-z0-9_]+\b/,
	];

	if (unsafePatterns.some((pattern) => pattern.test(normalized))) {
		return buildDerivedReason(directive);
	}

	return normalized.endsWith('.') ? normalized : `${normalized}.`;
}

function summarizeProject(project: ProjectNode): string {
	const summary = project.summary?.replace(/\s+/g, ' ').trim();
	return summary ? `${project.label}: ${summary}` : project.label;
}

function summarizeSkill(skill: SkillNode): string {
	const bits = [skill.label];
	if (skill.level) {
		bits.push(skill.level);
	}
	if (skill.summary) {
		bits.push(skill.summary.replace(/\s+/g, ' ').trim());
	}
	return bits.join(' - ');
}

function summarizeValue(value: ValueNode): string {
	return value.summary ? `${value.label}: ${value.summary.replace(/\s+/g, ' ').trim()}` : value.label;
}

function summarizeStory(story: StoryNode): string {
	return story.summary ? `${story.label}: ${story.summary.replace(/\s+/g, ' ').trim()}` : story.label;
}

function summarizeRole(role: RoleNode): string {
	return role.summary ? `${role.label}: ${role.summary.replace(/\s+/g, ' ').trim()}` : role.label;
}

function describeBaseView(directive: Directive): string {
	switch (directive.mode) {
		case 'timeline':
			switch (directive.data.variant) {
				case 'career':
					return 'The user is looking at a career timeline.';
				case 'projects':
					return 'The user is looking at a project timeline.';
				case 'skills':
					return 'The user is looking at a skills-over-time timeline.';
			}
		case 'projects':
			switch (directive.data.variant) {
				case 'grid':
					return 'The user is looking at a multi-project overview.';
				case 'radial':
					return 'The user is looking at a projects-to-skills relationship map.';
				case 'case-study':
					return 'The user is looking at a focused project case study.';
			}
		case 'skills':
			switch (directive.data.variant) {
				case 'technical':
					return 'The user is looking at a technical skills map.';
				case 'soft':
					return 'The user is looking at a soft-skills map.';
				case 'matrix':
					return 'The user is looking at a skills-by-project matrix.';
			}
		case 'values':
			switch (directive.data.variant) {
				case 'mindmap':
					return 'The user is looking at a values mindmap.';
				case 'evidence':
					return 'The user is looking at values backed by concrete evidence.';
			}
		case 'compare':
			switch (directive.data.variant) {
				case 'skills':
					return 'The user is looking at a skill comparison.';
				case 'projects':
					return 'The user is looking at a project comparison.';
				case 'frontend-vs-backend':
					return 'The user is looking at a frontend-vs-backend comparison.';
			}
		case 'explore':
			return 'The user is looking at the broad portfolio exploration view.';
		case 'resume':
			return 'The user is looking at the resume view.';
		case 'landing':
			return 'The user is looking at the landing view.';
	}

	return 'The user is looking at a supporting portfolio view.';
}

function formatLines(lines: Array<string | null | undefined>): string {
	return lines.filter((line): line is string => Boolean(line)).join('\n');
}

function describeProjectsSnapshot(snapshot: ProjectsGridSnapshot | DataSnapshot): string {
	if (snapshot.mode !== 'projects') {
		return '';
	}

	const highlightedIds = getDirectiveHighlights(snapshot.directive);
	const highlightedProjects = snapshot.projects.filter((project) => project.isHighlighted).slice(0, 3);
	const pinnedProjects = snapshot.pinnedProjects?.slice(0, 3) ?? [];
	const standoutProjects = (highlightedProjects.length > 0 ? highlightedProjects : snapshot.projects.slice(0, 3)).map(
		(project) => summarizeProject(project),
	);

	const commonLines = [
		`Visible focus: ${describeHighlightedNodes(highlightedIds)}.`,
		pinnedProjects.length > 0
			? `Pinned projects: ${sentenceCaseList(pinnedProjects.map((project) => project.label))}.`
			: null,
		standoutProjects.length > 0 ? `Relevant projects: ${standoutProjects.join(' | ')}.` : null,
	];

	if (snapshot.variant === 'radial') {
		const highlightedSkills = findNodeLabels(highlightedIds).filter((label) =>
			graph.nodes.some((node) => node.label === label && node.type === 'skill'),
		);
		return formatLines([
			...commonLines,
			'This view shows how projects connect to the skills used to build them.',
			highlightedSkills.length > 0 ? `Visible skill emphasis: ${sentenceCaseList(highlightedSkills)}.` : null,
		]);
	}

	if (snapshot.variant === 'case-study') {
		return formatLines([
			...commonLines,
			`Case study focus: ${snapshot.caseStudy.project.label}.`,
			snapshot.caseStudy.context ? `Project context: ${snapshot.caseStudy.context}.` : null,
			snapshot.caseStudy.tech?.length ? `Visible stack: ${sentenceCaseList(snapshot.caseStudy.tech)}.` : null,
			snapshot.caseStudy.outcomes?.length
				? `Visible outcomes: ${sentenceCaseList(snapshot.caseStudy.outcomes, 3)}.`
				: null,
		]);
	}

	return formatLines(commonLines);
}

function describeValuesEvidenceSnapshot(snapshot: ValuesEvidenceSnapshot): string {
	const highlightedIds = new Set(getDirectiveHighlights(snapshot.directive));
	const highlightedValues = snapshot.values
		.filter((value) => highlightedIds.has(value.id))
		.slice(0, 3);
	const evidenceToShow = (highlightedValues.length > 0
		? highlightedValues
				.map((value) => snapshot.evidence.find((entry) => entry.valueId === value.id))
				.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
		: snapshot.evidence.slice(0, 2));

	return formatLines([
		`Visible values: ${sentenceCaseList(
			(highlightedValues.length > 0 ? highlightedValues : snapshot.values.slice(0, 3)).map((value) => value.label),
		)}.`,
		...evidenceToShow.map((entry) => {
			const support = sentenceCaseList([
				...entry.roles.slice(0, 1).map((role) => summarizeRole(role)),
				...entry.projects.slice(0, 1).map((project) => summarizeProject(project)),
				...entry.stories.slice(0, 1).map((story) => summarizeStory(story)),
			]);
			return `Evidence for ${entry.valueLabel}: ${support}.`;
		}),
	]);
}

function describeExploreSnapshot(snapshot: ExploreSnapshot): string {
	const counts = snapshot.nodes.reduce<Record<string, number>>((acc, node) => {
		const key = nodeTypeLabel(node);
		acc[key] = (acc[key] ?? 0) + 1;
		return acc;
	}, {});

	return formatLines([
		`Visible emphasis: ${describeHighlightedNodes(getDirectiveHighlights(snapshot.directive))}.`,
		`The wider graph still shows broad context across ${counts.project ?? 0} projects, ${counts.skill ?? 0} skills, ${counts.role ?? 0} roles, and ${counts.value ?? 0} values.`,
	]);
}

function describeSnapshot(snapshot: DataSnapshot): string {
	switch (snapshot.mode) {
		case 'timeline':
			return formatLines([
				`Visible emphasis: ${describeHighlightedNodes(getDirectiveHighlights(snapshot.directive))}.`,
				'This view is organized chronologically.',
			]);
		case 'projects':
			return describeProjectsSnapshot(snapshot);
		case 'skills': {
			const highlightedIds = getDirectiveHighlights(snapshot.directive);
			if (snapshot.variant === 'matrix') {
				const highlightedLabels = findNodeLabels(highlightedIds);
				return formatLines([
					highlightedLabels.length > 0
						? `Visible emphasis: ${sentenceCaseList(highlightedLabels)}.`
						: null,
					`The matrix shows ${snapshot.matrix.rows.length} skills mapped across ${snapshot.matrix.cols.length} projects.`,
					`Common visible skills include ${sentenceCaseList(snapshot.matrix.rows.slice(0, 5).map((row) => row.label), 5)}.`,
				]);
			}

			const visibleSkills = (highlightedIds.length > 0
				? snapshot.skills.filter((skill) => highlightedIds.includes(skill.id))
				: snapshot.skills.slice(0, 4)
			).map((skill) => summarizeSkill(skill));
			return formatLines([
				`Visible focus: ${describeHighlightedNodes(highlightedIds)}.`,
				visibleSkills.length > 0 ? `Visible skills: ${visibleSkills.join(' | ')}.` : null,
				snapshot.clusters.length > 0
					? `Skills are grouped into clusters such as ${sentenceCaseList(
							snapshot.clusters.slice(0, 4).map((cluster) => cluster.label),
						)}.`
					: null,
			]);
		}
		case 'values':
			if (snapshot.variant === 'evidence') {
				return describeValuesEvidenceSnapshot(snapshot);
			}

			return formatLines([
				`Visible focus: ${describeHighlightedNodes(getDirectiveHighlights(snapshot.directive))}.`,
				`Visible values include ${sentenceCaseList(snapshot.values.slice(0, 4).map((value) => summarizeValue(value)), 4)}.`,
			]);
		case 'compare':
			if (snapshot.variant === 'skills') {
				return formatLines([
					`Comparing ${snapshot.leftSkill?.label ?? 'one skill'} and ${snapshot.rightSkill?.label ?? 'another skill'}.`,
					snapshot.overlap.length > 0
						? `Overlap shown in view: ${sentenceCaseList(snapshot.overlap.slice(0, 4).map((skill) => skill.label))}.`
						: null,
				]);
			}

			if (snapshot.variant === 'projects') {
				return formatLines([
					`Comparing ${snapshot.leftProject?.label ?? 'one project'} and ${snapshot.rightProject?.label ?? 'another project'}.`,
					snapshot.overlap.length > 0
						? `Shared comparison context includes ${sentenceCaseList(snapshot.overlap.slice(0, 4).map((project) => project.label))}.`
						: null,
				]);
			}

			return formatLines([
				`Visible emphasis: ${describeHighlightedNodes(getDirectiveHighlights(snapshot.directive))}.`,
				`The comparison separates frontend skills (${sentenceCaseList(
					snapshot.frontendSkills.slice(0, 4).map((skill) => skill.label),
				)}) from backend skills (${sentenceCaseList(snapshot.backendSkills.slice(0, 4).map((skill) => skill.label))}).`,
				snapshot.fullStackSkills.length > 0
					? `Shared full-stack skills include ${sentenceCaseList(
							snapshot.fullStackSkills.slice(0, 4).map((skill) => skill.label),
						)}.`
					: null,
			]);
		case 'explore':
			return describeExploreSnapshot(snapshot);
		case 'resume':
			return 'The user can see the structured resume/CV view with roles, experience, and qualifications.';
		case 'landing':
			return 'The user is on the landing view.';
	}

	return 'The visible view provides supporting context for the answer.';
}

export function buildNarrationViewContext(directive: Directive, plannerReason: string | null | undefined): NarrationViewContext {
	const snapshot = createDataSnapshot(graph, directive);

	return {
		viewSummary: describeBaseView(directive),
		detailedViewContext: describeSnapshot(snapshot),
		plannerReason: sanitizePlannerReason(plannerReason, directive),
	};
}
