'use client';

import React, { useEffect, useMemo, useState } from 'react';
import './ValuesEvidenceView.scss';
import type { TransitionPhase, TransitionCallbacks, ValuesEvidenceSnapshot } from '~/lib/ViewTransitions';
import { StreamingText } from '../Ui/StreamingText';
import ValuesEvidenceCard from './ValuesEvidenceCard';
import type {
	RoleEvidence as RoleTileData,
	ProjectEvidence as ProjectTileData,
	StoryEvidence as StoryTileData,
} from './ValuesEvidenceCard';
import { usePortfolioStore } from '~/lib/PortfolioStore';

interface ValuesEvidenceViewProps {
	dataSnapshot: ValuesEvidenceSnapshot;
	transitionPhase?: TransitionPhase;
	onRegisterCallbacks?: (callbacks: TransitionCallbacks) => void;
}

export function ValuesEvidenceView({
	dataSnapshot,
	transitionPhase = 'stable',
	onRegisterCallbacks,
}: ValuesEvidenceViewProps) {
	const [contentOpacity, setContentOpacity] = useState(transitionPhase === 'stable' ? 1 : 0);
	const [transitionDuration, setTransitionDuration] = useState(400);
	const { openPanel, graph } = usePortfolioStore();

	useEffect(() => {
		if (onRegisterCallbacks) {
			onRegisterCallbacks({
				onTransitionIn: async (duration: number) => {
					setTransitionDuration(duration);
					setContentOpacity(1);
				},
				onTransitionOut: async (duration: number) => {
					setTransitionDuration(duration);
					setContentOpacity(0);
				},
			});
		}
	}, [onRegisterCallbacks]);

	// Handle initial entering state
	useEffect(() => {
		if (transitionPhase === 'entering') {
			setContentOpacity(0);
		}
	}, [transitionPhase]);

	const highlights = useMemo(
		() => dataSnapshot.directive.data.highlights ?? [],
		[dataSnapshot.directive.data.highlights],
	);

	const iconForValue = (label: string): string => {
		const l = label.toLowerCase();
		if (l.includes('mentor') || l.includes('community')) return 'diversity_3';
		if (l.includes('quality') || l.includes('observ')) return 'insights';
		if (l.includes('design') || l.includes('perform')) return 'speed';
		if (l.includes('innov') || l.includes('emerging')) return 'lightbulb';
		if (l.includes('open') || l.includes('oss') || l.includes('source')) return 'public';
		return 'auto_awesome';
	};

	const onOpen = (nodeId: string) => {
		const node = graph.nodes.find((n) => n.id === nodeId);
		if (!node) return;
		openPanel({
			type: 'node',
			title: node.label,
			data: { ...node, itemName: node.label },
		});
	};

	return (
		<div
			className="values-evidence-view"
			style={{
				opacity: contentOpacity,
				transition: `opacity ${transitionDuration}ms ease-in-out`,
			}}
		>
			<div className="values-evidence-view__container">
				<header className="values-evidence-view__header">
					<h1>My Core Values</h1>
					<StreamingText as="p" className="subtitle">
						The principles that guide my work, supported by concrete evidence from my career.
					</StreamingText>
				</header>

				<main className="values-evidence-view__content">
					{dataSnapshot.evidence.map((val) => {
						const valueNode = dataSnapshot.values.find((v) => v.id === val.valueId);
						const evidence: Array<RoleTileData | ProjectTileData | StoryTileData> = [
							...val.roles.map(
								(r) =>
									({
										type: 'role',
										id: r.id,
										title: r.label,
										when: `${r.period?.start ?? ''}—${r.period?.end === 'present' ? 'Present' : (r.period?.end ?? '')}`,
										snippet: r.summary ?? '',
									}) satisfies RoleTileData,
							),
							...val.projects.map(
								(p) =>
									({
										type: 'project',
										id: p.id,
										name: p.label,
										blurb: p.summary ?? '',
										tags: p.tags ?? [],
										linkLabel: p.links && p.links[0] ? p.links[0].title : undefined,
									}) satisfies ProjectTileData,
							),
							...val.stories.map(
								(s) =>
									({
										type: 'story',
										id: s.id,
										headline: s.label,
										snippet: s.summary ?? '',
									}) satisfies StoryTileData,
							),
						];

						// If the directive emphasizes stories, surface them first
						const orderedEvidence = dataSnapshot.emphasizeStories
							? evidence
									.slice()
									.sort((a, b) => (a.type === 'story' ? -1 : 0) - (b.type === 'story' ? -1 : 0))
							: evidence;

						return (
							<ValuesEvidenceCard
								key={val.valueId}
								id={val.valueId}
								icon={iconForValue(val.valueLabel)}
								title={val.valueLabel}
								tags={valueNode?.tags ?? []}
								summary={val.valueSummary ?? ''}
								evidence={orderedEvidence}
								highlightIds={highlights}
								onOpen={onOpen}
							/>
						);
					})}
				</main>
			</div>
		</div>
	);
}
