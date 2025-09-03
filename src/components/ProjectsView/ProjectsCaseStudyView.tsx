import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { TransitionPhase, TransitionCallbacks, DataSnapshot } from '~/lib/ViewTransitions';
import './ProjectsCaseStudyView.scss';
import Tag from '~/components/Ui/Tag';
import { StreamingText } from '~/components/Ui/StreamingText';

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
	const [heroVisible, setHeroVisible] = useState(false);
	const [expandedIntro, setExpandedIntro] = useState<Record<number, boolean>>({});
	const toggleIntro = (idx: number) => setExpandedIntro((prev) => ({ ...prev, [idx]: !prev[idx] }));

	useEffect(() => {
		onRegisterCallbacks({
			onTransitionIn: async (ms) => {
				setDuration(ms);
				setOpacity(1);
				setHeroVisible(true);
			},
			onTransitionOut: async (ms) => {
				setDuration(ms);
				setOpacity(0);
			},
		});
		return () => {};
	}, [onRegisterCallbacks]);

	// Handle initial entering state
	useEffect(() => {
		if (transitionPhase === 'entering') {
			setOpacity(0);
			setHeroVisible(false);
		}
	}, [transitionPhase]);

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
								<li key={t}>
									<Tag tone="primary" variant="subtle" shape="rounded" size="md" bordered darker>
										{t}
									</Tag>
								</li>
							))}
						</ul>
					)}
				</header>

				{caseStudy.hero && (
					<div className={`pcs-card pcs-hero ${heroVisible ? 'is-visible' : ''}`} data-visible={heroVisible}>
						{/(\.mp4|\.webm)$/i.test(caseStudy.hero.src) ? (
							<video
								className="pcs-hero-video"
								src={caseStudy.hero.src}
								autoPlay
								muted
								loop
								playsInline
								preload="auto"
								aria-label={caseStudy.hero.alt ?? 'Case study hero video'}
							/>
						) : (
							<Image
								src={caseStudy.hero.src}
								alt={caseStudy.hero.alt ?? ''}
								width={1280}
								height={720}
								priority
							/>
						)}
					</div>
				)}

				{caseStudy.sections && caseStudy.sections.length > 0 && (
					<StreamingText as="section" className="pcs-sections" autoStart speed={6} interval={50}>
						{caseStudy.sections.map((s, i) => {
							if (s.kind === 'intro') {
								return (
									<StreamingText key={i} as="article" className="pcs-card pcs-intro">
										{s.title && <StreamingText as="h2">{s.title}</StreamingText>}
										{s.body && (
											<div className={`pcs-summary ${expandedIntro[i] ? 'is-expanded' : ''}`}>
												<StreamingText as="p">{s.body}</StreamingText>
												{(s.body?.length ?? 0) > 220 && (
													<button
														className="pcs-read-more"
														type="button"
														onClick={() => toggleIntro(i)}
													>
														{expandedIntro[i] ? 'Show less' : 'Read more'}
													</button>
												)}
											</div>
										)}
									</StreamingText>
								);
							}
							if (s.kind === 'image') {
								return (
									<StreamingText key={i} as="figure" className="pcs-card pcs-image">
										{s.title && <StreamingText as="figcaption">{s.title}</StreamingText>}
										<Image src={s.image.src} alt={s.image.alt ?? ''} width={1280} height={720} />
									</StreamingText>
								);
							}
							if (s.kind === 'gallery') {
								return (
									<StreamingText key={i} as="div" className="pcs-card pcs-gallery">
										{s.title && <StreamingText as="h2">{s.title}</StreamingText>}
										<div className="pcs-card__grid">
											{s.images.map((im, idx) => (
												<div key={idx} className="pcs-tile pcs-tile--image" role="group">
													<Image src={im.src} alt={im.alt ?? ''} width={640} height={360} />
												</div>
											))}
										</div>
									</StreamingText>
								);
							}
							if (s.kind === 'bullets') {
								return (
									<StreamingText key={i} as="article" className="pcs-card pcs-bullets">
										{s.title && <StreamingText as="h2">{s.title}</StreamingText>}
										<div className="pcs-card__grid">
											{s.items.map((it, j) => (
												<div key={j} className="pcs-tile pcs-tile--bullet" role="group">
													<StreamingText as="p" className="pcs-tile-text">
														{it}
													</StreamingText>
												</div>
											))}
										</div>
									</StreamingText>
								);
							}
							if (s.kind === 'quote') {
								return (
									<StreamingText key={i} as="blockquote" className="pcs-card pcs-quote">
										<StreamingText as="p">“{s.quote}”</StreamingText>
										{s.by && <StreamingText as="footer">— {s.by}</StreamingText>}
									</StreamingText>
								);
							}
							if (s.kind === 'metrics') {
								return (
									<StreamingText key={i} as="div" className="pcs-card pcs-metrics">
										{s.title && <StreamingText as="h2">{s.title}</StreamingText>}
										<div className="pcs-card__grid">
											{s.metrics.map((m, j) => (
												<div key={j} className="pcs-tile pcs-metric" role="group">
													<StreamingText as="div" className="pcs-metric-label">
														{m.label}
													</StreamingText>
													<StreamingText as="div" className="pcs-metric-value">
														{m.value}
													</StreamingText>
												</div>
											))}
										</div>
									</StreamingText>
								);
							}
							return null;
						})}
					</StreamingText>
				)}
			</div>
		</div>
	);
}
