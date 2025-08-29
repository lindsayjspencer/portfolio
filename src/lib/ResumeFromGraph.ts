// lib/resume/fromGraph.ts
import type { Graph, Node, SkillLevel } from './PortfolioStore';

type RoleView = {
	title: string;
	company?: string;
	location?: string;
	period: string;
	points: string[];
	skills: string[];
};
type ResumeView = {
	name: string;
	title: string;
	location: string;
	links: { label: string; href: string }[];
	summary: string;
	experience: RoleView[];
	skills: { level: string; items: string[] }[];
	projects: { name: string; blurb: string; tech: string[]; link?: string }[];
};

const fmtPeriod = (n: Node) => {
	if (n.period) {
		const end = n.period.end === 'present' ? 'Present' : n.period.end;
		return `${n.period.start} — ${end}`;
	}
	if (n.years) return `${n.years[0]} — ${n.years[1]}`;
	return '';
};

export function buildResume(g: Graph): ResumeView {
	const me = g.nodes.find((n) => n.type === 'person')!;
	const roles = g.nodes.filter((n) => n.type === 'role').sort((a, b) => (b.years?.[1] ?? 0) - (a.years?.[1] ?? 0));

	const skillsByLevel: Record<SkillLevel, string[]> = { expert: [], advanced: [], intermediate: [] };
	for (const s of g.nodes.filter((n) => n.type === 'skill')) {
		if (!s.level) continue;
		skillsByLevel[s.level].push(s.label);
	}
	const projects = g.nodes.filter((n) => n.type === 'project');

	const roleViews: RoleView[] = roles.map((r) => {
		const usedSkills = g.edges
			.filter((e) => (e.source === r.id || e.target === r.id) && e.rel === 'used')
			.map((e) => {
				const skillId = e.source === r.id ? e.target : e.source;
				return g.nodes.find((n) => n.id === skillId)?.label ?? '';
			})
			.filter(Boolean)
			.slice(0, 8);

		const achievements: string[] = [];
		if (r.summary) achievements.push(r.summary);
		for (const m of r.metrics ?? []) achievements.push(`${m.label}: ${m.value}`);

		// Link projects you built during this role
		const projIds = g.edges.filter((e) => e.rel === 'built' && e.source === 'person_lindsay').map((e) => e.target);
		const projBullets = projects
			.filter(
				(p) =>
					projIds.includes(p.id) &&
					(r.years && p.years ? p.years[0] >= r.years[0] && p.years[1] <= r.years[1] : true),
			)
			.slice(0, 2)
			.map((p) => `${p.label}: ${p.summary}`);

		return {
			title: r.label,
			location: r.location ?? '',
			period: fmtPeriod(r),
			points: [...achievements, ...projBullets].slice(0, 5),
			skills: Array.from(new Set(usedSkills)),
		};
	});

	return {
		name: me.label,
		title: 'Senior Full Stack Developer',
		location: me.location ?? 'Brisbane, Australia',
		links: (me.links ?? []).map((l) => ({ label: l.title, href: l.href })),
		summary: me.summary ?? '',
		experience: roleViews,
		skills: [
			{ level: 'Expert', items: skillsByLevel.expert.sort() },
			{ level: 'Advanced', items: skillsByLevel.advanced.sort() },
			{ level: 'Intermediate', items: skillsByLevel.intermediate.sort() },
		],
		projects: projects.slice(0, 3).map((p) => ({
			name: p.label,
			blurb: p.summary ?? '',
			tech: p.tags ?? [],
			link: p.links?.[0]?.href,
		})),
	};
}
