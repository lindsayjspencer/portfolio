import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { TransitionPhase, TransitionCallbacks, DataSnapshot } from '~/lib/ViewTransitions';
import './ProjectsCaseStudyView.scss';
import Tag from '~/components/Ui/Tag';
import TreeStream from 'react-tree-stream';

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
	}, [onRegisterCallbacks]);

	// Handle initial entering state
	useEffect(() => {
		if (transitionPhase === 'entering') {
			setOpacity(0);
			setHeroVisible(false);
		}
	}, [transitionPhase]);

	const { caseStudy } = dataSnapshot;

	// Media helper
	const isVideoSrc = (src: string | undefined): boolean => {
		if (!src) return false;
		const s = src.toLowerCase();
		return s.endsWith('.mp4') || s.endsWith('.webm');
	};

	// Loading flags without changing layout
	const [heroLoaded, setHeroLoaded] = useState(false);
	const [sectionImageLoaded, setSectionImageLoaded] = useState<Record<number, boolean>>({});
	const [galleryImageLoaded, setGalleryImageLoaded] = useState<Record<string, boolean>>({});

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
						{!heroLoaded && (
							<div className="pcs-media__loader" aria-hidden>
								<div className="pcs-spinner" />
							</div>
						)}
						{isVideoSrc(caseStudy.hero.src) ? (
							<video
								className="pcs-hero-video"
								src={caseStudy.hero.src}
								width={1200}
								height={630}
								autoPlay
								muted
								loop
								playsInline
								preload="auto"
								aria-label={caseStudy.hero.alt ?? 'Case study hero video'}
								onLoadedData={() => setHeroLoaded(true)}
								onCanPlayThrough={() => setHeroLoaded(true)}
							/>
						) : (
							<Image
								src={caseStudy.hero.src}
								alt={caseStudy.hero.alt ?? ''}
								width={1200}
								height={600}
								priority
								onLoad={() => setHeroLoaded(true)}
							/>
						)}
					</div>
				)}

				{caseStudy.sections && caseStudy.sections.length > 0 && (
					<TreeStream as="section" className="pcs-sections" autoStart speed={6} interval={50}>
						{caseStudy.sections.map((s, i) => {
							if (s.kind === 'intro') {
								return (
									<TreeStream key={i} as="article" className="pcs-card pcs-intro">
										{s.title && <TreeStream as="h2">{s.title}</TreeStream>}
										{s.body && (
											<div className={`pcs-summary ${expandedIntro[i] ? 'is-expanded' : ''}`}>
												<TreeStream as="p">{s.body}</TreeStream>
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
									</TreeStream>
								);
							}
							if (s.kind === 'image') {
								return (
									<TreeStream key={i} as="figure" className="pcs-card pcs-image">
										{s.title && <TreeStream as="figcaption">{s.title}</TreeStream>}
										{!sectionImageLoaded[i] && (
											<div className="pcs-media__loader" aria-hidden>
												<div className="pcs-spinner" />
											</div>
										)}
										<Image
											src={s.image.src}
											alt={s.image.alt ?? ''}
											width={1280}
											height={720}
											onLoadingComplete={() =>
												setSectionImageLoaded((prev) => ({ ...prev, [i]: true }))
											}
										/>
									</TreeStream>
								);
							}
							if (s.kind === 'gallery') {
								return (
									<TreeStream key={i} as="div" className="pcs-card pcs-gallery">
										{s.title && <TreeStream as="h2">{s.title}</TreeStream>}
										<div className="pcs-card__grid">
											{s.images.map((im, idx) => {
												const key = `${i}-${idx}`;
												const loaded = galleryImageLoaded[key];
												return (
													<div key={idx} className="pcs-tile pcs-tile--image" role="group">
														{!loaded && (
															<div className="pcs-media__loader" aria-hidden>
																<div className="pcs-spinner" />
															</div>
														)}
														<Image
															src={im.src}
															alt={im.alt ?? ''}
															width={640}
															height={360}
															onLoadingComplete={() =>
																setGalleryImageLoaded((prev) => ({
																	...prev,
																	[key]: true,
																}))
															}
														/>
													</div>
												);
											})}
										</div>
									</TreeStream>
								);
							}
							if (s.kind === 'bullets') {
								return (
									<TreeStream key={i} as="article" className="pcs-card pcs-bullets">
										{s.title && <TreeStream as="h2">{s.title}</TreeStream>}
										<div className="pcs-card__grid">
											{s.items.map((it, j) => (
												<div key={j} className="pcs-tile pcs-tile--bullet" role="group">
													<TreeStream as="p" className="pcs-tile-text">
														{it}
													</TreeStream>
												</div>
											))}
										</div>
									</TreeStream>
								);
							}
							if (s.kind === 'quote') {
								return (
									<TreeStream key={i} as="blockquote" className="pcs-card pcs-quote">
										<TreeStream as="p">“{s.quote}”</TreeStream>
										{s.by && <TreeStream as="footer">— {s.by}</TreeStream>}
									</TreeStream>
								);
							}
							if (s.kind === 'metrics') {
								return (
									<TreeStream key={i} as="div" className="pcs-card pcs-metrics">
										{s.title && <TreeStream as="h2">{s.title}</TreeStream>}
										<div className="pcs-card__grid">
											{s.metrics.map((m, j) => (
												<div key={j} className="pcs-tile pcs-metric" role="group">
													<TreeStream as="div" className="pcs-metric-label">
														{m.label}
													</TreeStream>
													<TreeStream as="div" className="pcs-metric-value">
														{m.value}
													</TreeStream>
												</div>
											))}
										</div>
									</TreeStream>
								);
							}
							return null;
						})}
					</TreeStream>
				)}
			</div>
		</div>
	);
}

