import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { TransitionPhase, TransitionCallbacks, DataSnapshot } from '~/lib/ViewTransitions';
import './ProjectsCaseStudyView.scss';

interface ProjectsCaseStudyViewProps {
	transitionPhase: TransitionPhase;
	onRegisterCallbacks: (callbacks: TransitionCallbacks) => void;
	dataSnapshot: Extract<DataSnapshot, { mode: 'projects'; variant: 'case-study' }>;
}

export function ProjectsCaseStudyView({
	transitionPhase,
	onRegisterCallbacks,
	dataSnapshot,
}: ProjectsCaseStudyViewProps) {
	const [opacity, setOpacity] = useState(transitionPhase === 'stable' ? 1 : 0);
	const [duration, setDuration] = useState(400);

	useEffect(() => {
		onRegisterCallbacks({
			onTransitionIn: async (ms) => {
				setDuration(ms);
				setOpacity(1);
			},
			onTransitionOut: async (ms) => {
				setDuration(ms);
				setOpacity(0);
			},
		});
	}, [onRegisterCallbacks]);

	const { caseStudy } = dataSnapshot;

	return (
		<div className="projects-case-study" style={{ opacity, transition: `opacity ${duration}ms ease-in-out` }}>
			<div className="pcs-container">
				<header className="pcs-header">
					<h1 className="pcs-title">{caseStudy.project.label}</h1>
					{caseStudy.period && <div className="pcs-period">{caseStudy.period}</div>}
					{caseStudy.tech && caseStudy.tech.length > 0 && (
						<ul className="pcs-tech">
							{caseStudy.tech.slice(0, 8).map((t) => (
								<li key={t} className="pcs-chip">
									{t}
								</li>
							))}
						</ul>
					)}
				</header>

				{caseStudy.hero && (
					<div className="pcs-hero">
						<Image
							src={caseStudy.hero.src}
							alt={caseStudy.hero.alt ?? ''}
							width={1280}
							height={720}
							priority
						/>
					</div>
				)}

				{caseStudy.sections && caseStudy.sections.length > 0 && (
					<section className="pcs-sections">
						{caseStudy.sections.map((s, i) => {
							if (s.kind === 'intro') {
								return (
									<article key={i} className="pcs-section pcs-intro">
										{s.title && <h2>{s.title}</h2>}
										{s.body && <p>{s.body}</p>}
									</article>
								);
							}
							if (s.kind === 'image') {
								return (
									<figure key={i} className="pcs-section pcs-image">
										{s.title && <figcaption>{s.title}</figcaption>}
										<Image src={s.image.src} alt={s.image.alt ?? ''} width={1280} height={720} />
									</figure>
								);
							}
							if (s.kind === 'gallery') {
								return (
									<div key={i} className="pcs-section pcs-gallery">
										{s.title && <h2>{s.title}</h2>}
										<div className="pcs-gallery-grid">
											{s.images.map((im, idx) => (
												<Image
													key={idx}
													src={im.src}
													alt={im.alt ?? ''}
													width={640}
													height={360}
												/>
											))}
										</div>
									</div>
								);
							}
							if (s.kind === 'bullets') {
								return (
									<article key={i} className="pcs-section pcs-bullets">
										{s.title && <h2>{s.title}</h2>}
										<ul>
											{s.items.map((it, j) => (
												<li key={j}>{it}</li>
											))}
										</ul>
									</article>
								);
							}
							if (s.kind === 'quote') {
								return (
									<blockquote key={i} className="pcs-section pcs-quote">
										<p>“{s.quote}”</p>
										{s.by && <footer>— {s.by}</footer>}
									</blockquote>
								);
							}
							if (s.kind === 'metrics') {
								return (
									<div key={i} className="pcs-section pcs-metrics">
										{s.title && <h2>{s.title}</h2>}
										<div className="pcs-metrics-grid">
											{s.metrics.map((m, j) => (
												<div key={j} className="pcs-metric">
													<div className="pcs-metric-label">{m.label}</div>
													<div className="pcs-metric-value">{m.value}</div>
												</div>
											))}
										</div>
									</div>
								);
							}
							return null;
						})}
					</section>
				)}
			</div>
		</div>
	);
}
