import { useEffect, useState } from 'react';
import type { TransitionPhase, TransitionCallbacks } from '~/lib/ViewTransitions';
import './ResumeView.scss';
import { StreamingText } from '../Ui/StreamingText';

interface ResumeViewProps {
	transitionPhase?: TransitionPhase;
	onRegisterCallbacks?: (callbacks: TransitionCallbacks) => void;
}

export function ResumeView({ transitionPhase = 'stable', onRegisterCallbacks }: ResumeViewProps) {
	const [contentOpacity, setContentOpacity] = useState(transitionPhase === 'stable' ? 1 : 0);
	const [transitionDuration, setTransitionDuration] = useState(400);

	useEffect(() => {
		console.log('Mount resume');
		return () => {
			console.log('Unmount resume');
		};
	}, []);

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

	const handlePrint = () => window.print();

	return (
		<div
			className="resume-view"
			style={{
				opacity: contentOpacity,
				transition: `opacity ${transitionDuration}ms ease-in-out`,
			}}
		>
			<div className="container">
				<button onClick={handlePrint} className="print-btn">
					Download PDF
				</button>

				<StreamingText as="header">
					<StreamingText as="h1">Lindsay Spencer</StreamingText>
					<StreamingText as="div" className="meta">
						Senior Full Stack Developer (Frontend Specialist) · Brisbane, Australia
					</StreamingText>
					<StreamingText className="meta">
						<a href="mailto:lindsayjspencer@gmail.com">lindsayjspencer@gmail.com</a> ·{' '}
						<a href="https://github.com/lindsayjspencer">github.com/lindsayjspencer</a>
					</StreamingText>
				</StreamingText>

				<StreamingText as="main">
					<StreamingText as="section">
						<StreamingText as="h2">Experience</StreamingText>

						<StreamingText as="div" className="role">
							<StreamingText as="h3">Quality Lead — Codebots</StreamingText>
							<StreamingText as="div" className="meta">
								Jan 2025 – Present · Brisbane
							</StreamingText>
							<StreamingText as="ul">
								<StreamingText as="li">
									Embedded across squads uplifting testing, observability, and traceability.
								</StreamingText>
								<StreamingText as="li">
									Ran company frontend focus group, mentoring developers.
								</StreamingText>
							</StreamingText>
						</StreamingText>

						<StreamingText as="div" className="role">
							<StreamingText as="h3">Senior Full Stack Developer — Codebots</StreamingText>
							<StreamingText as="div" className="meta">
								May 2022 – Jan 2025 · Brisbane
							</StreamingText>
							<StreamingText as="ul">
								<StreamingText as="li">
									Led frontend focus group (15–20 devs), mentoring and shaping standards.
								</StreamingText>
								<StreamingText as="li">
									Built <StreamingText as="strong">Resource Version Dependency Graph</StreamingText>:
									reduced workflows from 3–4h → &lt;1m.
								</StreamingText>
								<StreamingText as="li">
									Delivered <StreamingText as="strong">Codebots Homepage + AI Search</StreamingText>:
									LLM/RAG-powered knowledge discovery.
								</StreamingText>
							</StreamingText>
						</StreamingText>

						<StreamingText as="div" className="role">
							<StreamingText as="h3">Full Stack Developer — Codebots</StreamingText>
							<StreamingText as="div" className="meta">
								May 2020 – May 2022 · Brisbane
							</StreamingText>
							<StreamingText as="ul">
								<StreamingText as="li">
									Introduced React/TypeScript as first-class codegen target alongside .NET.
								</StreamingText>
								<StreamingText as="li">
									Contributed to diagram-driven application generation pipelines.
								</StreamingText>
							</StreamingText>
						</StreamingText>

						<StreamingText as="div" className="role">
							<StreamingText as="h3">Full Stack Developer — Goodwill Projects</StreamingText>
							<StreamingText as="div" className="meta">
								Jun 2014 – Mar 2020 · Brisbane
							</StreamingText>
							<StreamingText as="ul">
								<StreamingText as="li">
									Owned <StreamingText as="strong">Markets & Events Platform</StreamingText>{' '}
									end-to-end, scaling 1 → 36 markets across AU.
								</StreamingText>
								<StreamingText as="li">
									Reduced admin by 60% and automated bookkeeping 80%.
								</StreamingText>
								<StreamingText as="li">
									Built automated bank reconciliation system, eliminating week-long manual tasks.
								</StreamingText>
							</StreamingText>
						</StreamingText>

						<StreamingText as="div" className="role">
							<StreamingText as="h3">Operations Manager — Goodwill Projects</StreamingText>
							<StreamingText as="div" className="meta">
								Jan 2014 – Jun 2014 · Brisbane
							</StreamingText>
							<StreamingText as="ul">
								<StreamingText as="li">
									Managed operations for growing markets/events business, identified tech needs for
									scaling.
								</StreamingText>
							</StreamingText>
						</StreamingText>
					</StreamingText>

					<StreamingText as="section">
						<StreamingText as="h2">Projects</StreamingText>

						<StreamingText as="div" className="project">
							<StreamingText as="h3">Codebots</StreamingText>
							<StreamingText as="div" className="meta">
								Diagram-driven app generation; pioneered React/TS codegen.
							</StreamingText>
						</StreamingText>

						<StreamingText as="div" className="project">
							<StreamingText as="h3">Resource Version Dependency Graph</StreamingText>
							<StreamingText as="div" className="meta">
								Interactive 2D/3D tool; cut tasks 3–4h → &lt;1m.
							</StreamingText>
						</StreamingText>

						<StreamingText as="div" className="project">
							<StreamingText as="h3">Codebots AI Search</StreamingText>
							<StreamingText as="div" className="meta">
								Next.js + Vercel AI SDK; RAG-powered chat. <a href="https://beta.codebots.com">Demo</a>
							</StreamingText>
						</StreamingText>

						<StreamingText as="div" className="project">
							<StreamingText as="h3">React Granular Store (OSS)</StreamingText>
							<StreamingText as="div" className="meta">
								State management library adopted in enterprise apps.{' '}
								<a href="https://www.npmjs.com/package/react-granular-store">npm</a>
							</StreamingText>
						</StreamingText>

						<StreamingText as="div" className="project">
							<StreamingText as="h3">Markets & Events Platform</StreamingText>
							<StreamingText as="div" className="meta">
								End-to-end admin & ops system for statewide operator.
							</StreamingText>
						</StreamingText>
					</StreamingText>
				</StreamingText>

				<StreamingText as="aside" className="sidebar">
					<StreamingText as="section">
						<StreamingText as="h2">Skills</StreamingText>
						<StreamingText as="div" className="skill-tags">
							<StreamingText as="span" className="tag">
								React
							</StreamingText>
							<StreamingText as="span" className="tag">
								TypeScript
							</StreamingText>
							<StreamingText as="span" className="tag">
								CSS
							</StreamingText>
							<StreamingText as="span" className="tag">
								Three.js
							</StreamingText>
							<StreamingText as="span" className="tag">
								Node.js
							</StreamingText>
							<StreamingText as="span" className="tag">
								.NET
							</StreamingText>
							<StreamingText as="span" className="tag">
								PHP
							</StreamingText>
							<StreamingText as="span" className="tag">
								MySQL
							</StreamingText>
							<StreamingText as="span" className="tag">
								Postgres
							</StreamingText>
							<StreamingText as="span" className="tag">
								Docker
							</StreamingText>
							<StreamingText as="span" className="tag">
								Linux
							</StreamingText>
							<StreamingText as="span" className="tag">
								LLM Apps
							</StreamingText>
						</StreamingText>
					</StreamingText>

					<StreamingText as="section">
						<StreamingText as="h2">Values</StreamingText>
						<StreamingText as="div" className="value">
							<StreamingText as="strong">Mentorship & Community</StreamingText>
							<br />
							Led frontend focus group, mentoring juniors.
						</StreamingText>
						<StreamingText as="div" className="value">
							<StreamingText as="strong">Quality & Observability</StreamingText>
							<br />
							Established culture of testing + observability.
						</StreamingText>
						<StreamingText as="div" className="value">
							<StreamingText as="strong">Design Polish & Performance</StreamingText>
							<br />
							Pixel-perfect, optimised interfaces as priority.
						</StreamingText>
						<StreamingText as="div" className="value">
							<StreamingText as="strong">Innovation</StreamingText>
							<br />
							Exploring AI/LLMs and emerging tech.
						</StreamingText>
						<StreamingText as="div" className="value">
							<StreamingText as="strong">Open Source</StreamingText>
							<br />
							Author of <StreamingText as="code">react-granular-store</StreamingText>, more libraries in
							progress.
						</StreamingText>
					</StreamingText>
				</StreamingText>
			</div>
		</div>
	);
}
