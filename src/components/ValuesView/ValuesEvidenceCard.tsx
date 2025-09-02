'use client';

import React, { useMemo, useState } from 'react';
import './ValuesEvidenceCard.scss';
import Tag from '~/components/Ui/Tag';
import { MaterialIcon } from '~/components/Ui';

export type RoleEvidence = {
	type: 'role';
	id: string;
	title: string;
	when: string;
	snippet: string;
};

export type ProjectEvidence = {
	type: 'project';
	id: string;
	name: string;
	blurb: string;
	tags?: string[];
	linkLabel?: string;
};

export type StoryEvidence = {
	type: 'story';
	id: string;
	headline: string;
	snippet: string;
};

export type ValuesEvidenceCardProps = {
	id: string;
	icon: string;
	title: string;
	tags?: string[];
	summary: string;
	evidence: Array<RoleEvidence | ProjectEvidence | StoryEvidence>;
	highlightIds?: string[];
	onOpen: (nodeId: string) => void;
};

function RoleTile({
	item,
	onOpen,
	isDim,
	isHl,
}: {
	item: RoleEvidence;
	onOpen: () => void;
	isDim: boolean;
	isHl: boolean;
}) {
	return (
		<div
			className={`values-evidence-card__tile ${isDim ? 'values-evidence-card__tile--dim' : ''} ${isHl ? 'values-evidence-card__tile--highlighted' : ''}`}
			role="button"
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={(e) => (e.key === 'Enter' ? onOpen() : undefined)}
			aria-label={`Open ${item.title}`}
		>
			<h4 className="values-evidence-card__tile-title">{item.title}</h4>
			<div className="values-evidence-card__tile-meta">{item.when}</div>
			<p className="values-evidence-card__tile-text">{item.snippet}</p>
		</div>
	);
}

function ProjectTile({
	item,
	onOpen,
	isDim,
	isHl,
}: {
	item: ProjectEvidence;
	onOpen: () => void;
	isDim: boolean;
	isHl: boolean;
}) {
	return (
		<div
			className={`values-evidence-card__tile ${isDim ? 'values-evidence-card__tile--dim' : ''} ${isHl ? 'values-evidence-card__tile--highlighted' : ''}`}
			role="button"
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={(e) => (e.key === 'Enter' ? onOpen() : undefined)}
			aria-label={`Open ${item.name}`}
		>
			<h4 className="values-evidence-card__tile-title">{item.name}</h4>
			<p className="values-evidence-card__tile-text">{item.blurb}</p>
			{item.tags && item.tags.length > 0 && (
				<div className="values-evidence-card__tile-tags">
					{item.tags.slice(0, 4).map((t) => (
						<Tag key={t} tone="primary" variant="subtle" shape="rounded" size="md">
							{t}
						</Tag>
					))}
					{item.tags.length > 4 && (
						<Tag tone="neutral" variant="subtle" shape="rounded" size="md">
							+{item.tags.length - 4}
						</Tag>
					)}
				</div>
			)}
		</div>
	);
}

function StoryTile({
	item,
	onOpen,
	isDim,
	isHl,
}: {
	item: StoryEvidence;
	onOpen: () => void;
	isDim: boolean;
	isHl: boolean;
}) {
	return (
		<div
			className={`values-evidence-card__tile values-evidence-card__tile--story ${isDim ? 'values-evidence-card__tile--dim' : ''} ${isHl ? 'values-evidence-card__tile--highlighted' : ''}`}
			role="button"
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={(e) => (e.key === 'Enter' ? onOpen() : undefined)}
			aria-label={`Open ${item.headline}`}
		>
			<h4 className="values-evidence-card__tile-title">{item.headline}</h4>
			<p className="values-evidence-card__tile-text" style={{ fontStyle: 'italic' }}>
				{item.snippet}
			</p>
		</div>
	);
}

export default function ValuesEvidenceCard({
	id,
	icon,
	title,
	tags = [],
	summary,
	evidence,
	highlightIds = [],
	onOpen,
}: ValuesEvidenceCardProps) {
	const hl = useMemo(() => new Set(highlightIds), [highlightIds]);
	const [expanded, setExpanded] = useState(false);

	const handleOpen = (nodeId: string) => () => onOpen(nodeId);

	return (
		<section className="values-evidence-card" aria-labelledby={`val-${id}-title`}>
			<div className="values-evidence-card__header">
				<div className="values-evidence-card__title">
					<MaterialIcon name={icon as any} size="md" className="values-evidence-card__icon" />
					<h2 id={`val-${id}-title`}>{title}</h2>
				</div>
				{tags.length > 0 && (
					<div className="values-evidence-card__chips">
						{tags.map((t) => (
							<Tag key={t} tone="neutral" variant="subtle" shape="rounded" size="sm">
								{t}
							</Tag>
						))}
					</div>
				)}
			</div>

			{summary && (
				<div className={`values-evidence-card__summary ${expanded ? 'is-expanded' : ''}`}>
					<p>{summary}</p>
					{!expanded && (
						<button
							type="button"
							className="values-evidence-card__read-more"
							onClick={() => setExpanded(true)}
							aria-label={`Expand summary for ${title}`}
						>
							Read more
						</button>
					)}
				</div>
			)}

			{evidence.length > 0 ? (
				<div className="values-evidence-card__grid">
					{evidence.map((ev) => {
						const isHl = hl.has(ev.id);
						const isDim = hl.size > 0 && !isHl;
						if (ev.type === 'role') {
							return (
								<div key={ev.id} className="values-evidence-card__tile-wrap">
									<div className="values-evidence-card__tile-type">
										<MaterialIcon
											name="group"
											size="sm"
											className="values-evidence-card__tile-type-icon"
										/>
										<span>Role</span>
									</div>
									<RoleTile item={ev} onOpen={handleOpen(ev.id)} isDim={isDim} isHl={isHl} />
								</div>
							);
						}
						if (ev.type === 'project') {
							return (
								<div key={ev.id} className="values-evidence-card__tile-wrap">
									<div className="values-evidence-card__tile-type">
										<MaterialIcon
											name="description"
											size="sm"
											className="values-evidence-card__tile-type-icon"
										/>
										<span>Project</span>
									</div>
									<ProjectTile item={ev} onOpen={handleOpen(ev.id)} isDim={isDim} isHl={isHl} />
								</div>
							);
						}
						return (
							<div key={ev.id} className="values-evidence-card__tile-wrap">
								<div className="values-evidence-card__tile-type">
									<MaterialIcon
										name="bookmark"
										size="sm"
										className="values-evidence-card__tile-type-icon"
									/>
									<span>Story</span>
								</div>
								<StoryTile
									item={ev as StoryEvidence}
									onOpen={handleOpen(ev.id)}
									isDim={isDim}
									isHl={isHl}
								/>
							</div>
						);
					})}
				</div>
			) : (
				<div className="values-evidence-card__grid">
					<div className="values-evidence-card__tile" aria-live="polite">
						<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<MaterialIcon name="info" size="md" className="values-evidence-card__icon" />
							<strong>Evidence coming soon</strong>
						</div>
						<p className="values-evidence-card__tile-text" style={{ marginTop: 6 }}>
							I&apos;m gathering examples that best represent this value.
						</p>
					</div>
				</div>
			)}

			<div className="values-evidence-card__footer-space" />
		</section>
	);
}
