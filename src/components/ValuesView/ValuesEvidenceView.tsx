'use client';

import React, { useEffect, useState } from 'react';
import './ValuesEvidenceView.scss';
import type { TransitionPhase, TransitionCallbacks, ValuesEvidenceSnapshot } from '~/lib/ViewTransitions';
import { StreamingText } from '../Ui/StreamingText';

interface ValuesEvidenceViewProps {
	dataSnapshot: ValuesEvidenceSnapshot;
	transitionPhase?: TransitionPhase;
	onRegisterCallbacks?: (callbacks: TransitionCallbacks) => void;
}

export function ValuesEvidenceView({ dataSnapshot, transitionPhase = 'stable', onRegisterCallbacks }: ValuesEvidenceViewProps) {
	const [contentOpacity, setContentOpacity] = useState(transitionPhase === 'stable' ? 1 : 0);
	const [transitionDuration, setTransitionDuration] = useState(400);

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

				<StreamingText as="main" className="values-evidence-view__content">
					{dataSnapshot.evidence.map((valueEvidence, index) => (
						<StreamingText
							key={valueEvidence.valueId}
							as="section"
							className="values-evidence-view__value-section"
						>
							<StreamingText as="div" className="values-evidence-view__value-header">
								<StreamingText as="h2">{valueEvidence.valueLabel}</StreamingText>
								{valueEvidence.valueSummary && (
									<StreamingText as="p" className="value-summary">
										{valueEvidence.valueSummary}
									</StreamingText>
								)}
							</StreamingText>

							<StreamingText as="div" className="values-evidence-view__evidence-grid">
								{/* Roles Evidence */}
								{valueEvidence.roles.length > 0 && (
									<StreamingText as="div" className="evidence-category">
										<StreamingText as="h3">Professional Experience</StreamingText>
										<StreamingText as="div" className="evidence-items">
											{valueEvidence.roles.map((role) => (
												<StreamingText
													key={role.id}
													as="div"
													className="evidence-item role-item"
												>
													<StreamingText as="h4">{role.label}</StreamingText>
													<StreamingText as="div" className="meta">
														{role.period?.start} –{' '}
														{role.period?.end === 'present' ? 'Present' : role.period?.end}
													</StreamingText>
													{role.summary && (
														<StreamingText as="p">{role.summary}</StreamingText>
													)}
												</StreamingText>
											))}
										</StreamingText>
									</StreamingText>
								)}

								{/* Projects Evidence */}
								{valueEvidence.projects.length > 0 && (
									<StreamingText as="div" className="evidence-category">
										<StreamingText as="h3">Key Projects</StreamingText>
										<StreamingText as="div" className="evidence-items">
											{valueEvidence.projects.map((project) => (
												<StreamingText
													key={project.id}
													as="div"
													className="evidence-item project-item"
												>
													<StreamingText as="h4">{project.label}</StreamingText>
													{project.summary && (
														<StreamingText as="p">{project.summary}</StreamingText>
													)}
													{project.tags && project.tags.length > 0 && (
														<StreamingText as="div" className="tags">
															{project.tags.map((tag) => (
																<StreamingText key={tag} as="span" className="tag">
																	{tag}
																</StreamingText>
															))}
														</StreamingText>
													)}
												</StreamingText>
											))}
										</StreamingText>
									</StreamingText>
								)}

								{/* Stories Evidence */}
								{valueEvidence.stories.length > 0 && (
									<StreamingText as="div" className="evidence-category">
										<StreamingText as="h3">Notable Stories</StreamingText>
										<StreamingText as="div" className="evidence-items">
											{valueEvidence.stories.map((story) => (
												<StreamingText
													key={story.id}
													as="div"
													className="evidence-item story-item"
												>
													<StreamingText as="h4">{story.label}</StreamingText>
													{story.summary && (
														<StreamingText as="p">{story.summary}</StreamingText>
													)}
												</StreamingText>
											))}
										</StreamingText>
									</StreamingText>
								)}
							</StreamingText>
						</StreamingText>
					))}
				</StreamingText>
			</div>
		</div>
	);
}
