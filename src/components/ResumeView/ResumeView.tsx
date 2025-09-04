import { useEffect, useMemo, useState } from 'react';
import type { TransitionPhase, TransitionCallbacks } from '~/lib/ViewTransitions';
import './ResumeView.scss';
import { StreamingText } from '../Ui/StreamingText';
import Tag from '~/components/Ui/Tag';
import { MaterialIcon } from '~/components/Ui';
import useResizeObserver from '~/hooks/UseResizeObserver';

interface ResumeViewProps {
	transitionPhase?: TransitionPhase;
	onRegisterCallbacks?: (callbacks: TransitionCallbacks) => void;
}

export function ResumeView({ transitionPhase = 'stable', onRegisterCallbacks }: ResumeViewProps) {
	const [contentOpacity, setContentOpacity] = useState(transitionPhase === 'stable' ? 1 : 0);
	const [transitionDuration, setTransitionDuration] = useState(400);
	const isDesktop = window.innerWidth >= 1024;
	const [shouldAnimateAside, setShouldAnimateAside] = useState(false);

	useEffect(() => {
		if (onRegisterCallbacks) {
			onRegisterCallbacks({
				onTransitionIn: async (duration: number) => {
					setTransitionDuration(duration);
					setContentOpacity(1);
					if (!isDesktop) {
						setTimeout(() => setShouldAnimateAside(true), 2500);
					} else {
						setShouldAnimateAside(true);
					}
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
			setShouldAnimateAside(false);
		}
	}, [transitionPhase]);

	return (
		<div
			className="resume-view"
			style={{
				opacity: contentOpacity,
				transition: `opacity ${transitionDuration}ms ease-in-out`,
			}}
		>
			<div className="resume-download-container">
				<a
					className="resume-download-trigger"
					href="/docs/resume.pdf"
					download="Lindsay-Spencer-Resume.pdf"
					aria-label="Download resume PDF"
					title="Download resume PDF"
				>
					<MaterialIcon name="file_download" size={16} />
				</a>
			</div>

			<div className="container">
				<StreamingText as="header">
					<StreamingText as="h1">Lindsay Spencer</StreamingText>
					<StreamingText as="div" className="meta">
						Senior Full Stack Developer (Frontend Specialist) · Brisbane, Australia
					</StreamingText>
					<StreamingText className="meta contact-links">
						<a href="mailto:lindsayjspencer@gmail.com" aria-label="Email">
							<MaterialIcon name="mail" size={16} />
							<span>lindsayjspencer@gmail.com</span>
						</a>
						<span className="separator">·</span>
						<a href="https://github.com/lindsayjspencer" aria-label="GitHub">
							<MaterialIcon name="code" size={16} />
							<span>GitHub</span>
						</a>
						<span className="separator">·</span>
						<a href="https://www.linkedin.com/in/lindsay-spencer-01b2b9382/" aria-label="LinkedIn">
							<MaterialIcon name="link" size={16} />
							<span>LinkedIn</span>
						</a>
						<span className="separator">·</span>
						<a href="https://lindsay.digital" aria-label="Portfolio">
							<MaterialIcon name="language" size={16} />
							<span>Portfolio</span>
						</a>
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
									Embedded within squads, enhancing testing, observability, and traceability
									processes, resulting in a 60% increase in issue detection efficiency.
								</StreamingText>
								<StreamingText as="li">
									Led company frontend focus group, mentoring 15 developers and improving frontend
									code quality by 30%.
								</StreamingText>
								<StreamingText as="li">
									Collaborated with cross-functional teams to streamline development workflows and
									reduce deployment times by 15%.
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
									Engineered the Resource Version Dependency Graph, reducing workflow time from 3
									hours to under 1 minute, increasing productivity by 99%.
								</StreamingText>
								<StreamingText as="li">
									Delivered the Codebots Homepage and AI Search feature, leveraging LLM/RAG technology
									to enhance knowledge discovery accuracy by 80%.
								</StreamingText>
								<StreamingText as="li">
									Project lead on the flagship Codebots Platform; led the team and architected the
									frontend.
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
									Established the foundation of the frontend application and styling system for the
									Codebots Platform team, accelerating UI development by 30%.
								</StreamingText>
								<StreamingText as="li">
									Engineered a diagramming system enabling users to configure metamodels, improving
									user configuration speed by 300%.
								</StreamingText>
								<StreamingText as="li">
									Implemented React/TypeScript as a primary codegen target alongside .NET, increasing
									development efficiency by 30%.
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
									Owned Markets & Events Platform end-to-end, scaling 1 to 36 markets across AU.
								</StreamingText>
								<StreamingText as="li">
									Reduced admin by 60% and automated bookkeeping by 80% through innovative automation
									solutions.
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
							<StreamingText as="h3">Codebots Platform</StreamingText>
							<StreamingText as="div" className="meta">
								Brisbane, Australia · May 2020 – Present · Senior Full Stack Developer
							</StreamingText>
							<StreamingText as="ul">
								<StreamingText as="li">
									Architected and developed a scalable TypeScript frontend using React, enhancing user
									experience and increasing platform stability.
								</StreamingText>
								<StreamingText as="li">
									Led the design and implementation of the .NET backend, improving API response time
									by 60% and supporting seamless integration with Postgres databases.
								</StreamingText>
								<StreamingText as="li">
									Directed project strategy using diagram-driven app generation, cutting down
									development time by 40% and enabling rapid rollout of new features.
								</StreamingText>
								<StreamingText as="li">
									Managed release engineering and maintenance strategies over 3 years, achieving a
									99.9% uptime and successfully launching multiple new phases to meet evolving client
									requirements.
								</StreamingText>
							</StreamingText>
						</StreamingText>

						<StreamingText as="div" className="project">
							<StreamingText as="h3">
								Codebots AI Search&nbsp;
								<a href="https://codebots.com">demo</a>
							</StreamingText>
							<StreamingText as="div" className="meta">
								Brisbane, Australia · Aug 2025 – Sep 2025 · Senior Full Stack Developer
							</StreamingText>
							<StreamingText as="ul">
								<StreamingText as="li">
									Developed using Next.js and Vercel AI SDK to deliver a robust AI-powered search
									experience.
								</StreamingText>
								<StreamingText as="li">
									Implemented Retrieval-Augmented Generation (RAG) techniques to enhance chat
									interactions and knowledge discovery accuracy by 80%.
								</StreamingText>
								<StreamingText as="li">
									Collaborated closely with AI and frontend teams to integrate large language models,
									delivering users context-aware, precise search results and interactive chat
									functionality.
								</StreamingText>
							</StreamingText>
						</StreamingText>

						<StreamingText as="div" className="project">
							<StreamingText as="h3">
								React Granular Store (OSS)&nbsp;
								<a href="https://www.npmjs.com/package/react-granular-store">npm</a>
							</StreamingText>
							<StreamingText as="div" className="meta">
								Brisbane, Australia · Dec 2023 – Present · Senior Full Stack Developer
							</StreamingText>
							<StreamingText as="ul">
								<StreamingText as="li">
									Open source state management library providing strictly typed, performant state with
									a minimal footprint.
								</StreamingText>
								<StreamingText as="li">
									Widely used in enterprise applications with consistent weekly adoption on npm.
								</StreamingText>
							</StreamingText>
						</StreamingText>

						<StreamingText as="div" className="project">
							<StreamingText as="h3">Markets & Events Platform</StreamingText>
							<StreamingText as="div" className="meta">
								Brisbane, Australia · Jun 2014 – Mar 2020 · Full Stack Developer
							</StreamingText>
							<StreamingText as="ul">
								<StreamingText as="li">
									Project lead on admin & operations platform for a state-wide market operator.
								</StreamingText>
								<StreamingText as="li">
									Implemented sales tracking, booking, and payment systems integrated with MYOB and
									Westpac.
								</StreamingText>
								<StreamingText as="li">
									Developed mobile views, analytics dashboards, and comprehensive document and media
									management tools.
								</StreamingText>
							</StreamingText>
						</StreamingText>
					</StreamingText>
				</StreamingText>

				<StreamingText as="aside" className="sidebar" autoStart={isDesktop || shouldAnimateAside}>
					<StreamingText as="section">
						<StreamingText as="h2">Skills</StreamingText>
						<StreamingText as="div" className="skill-tags">
							<StreamingText as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									React
								</Tag>
							</StreamingText>
							<StreamingText as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									TypeScript
								</Tag>
							</StreamingText>
							<StreamingText as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									CSS
								</Tag>
							</StreamingText>
							<StreamingText as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									Three.js
								</Tag>
							</StreamingText>
							<StreamingText as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									Node.js
								</Tag>
							</StreamingText>
							<StreamingText as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									.NET
								</Tag>
							</StreamingText>
							<StreamingText as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									PHP
								</Tag>
							</StreamingText>
							<StreamingText as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									MySQL
								</Tag>
							</StreamingText>
							<StreamingText as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									Postgres
								</Tag>
							</StreamingText>
							<StreamingText as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									Docker
								</Tag>
							</StreamingText>
							<StreamingText as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									Linux
								</Tag>
							</StreamingText>
							<StreamingText as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									LLM Apps
								</Tag>
							</StreamingText>
							<StreamingText as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									C#
								</Tag>
							</StreamingText>
							<StreamingText as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									Shaders
								</Tag>
							</StreamingText>
							<StreamingText as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									JavaScript
								</Tag>
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

					<StreamingText as="section">
						<StreamingText as="h2">EDUCATION</StreamingText>
						<StreamingText as="div" className="value">
							<StreamingText as="strong">Kelvin Grove High School</StreamingText>
							<br />
							Brisbane, Australia
							<br />
							Jan 2003 – Dec 2006
							<br />
							High School Diploma in General Studies · Grade 12
						</StreamingText>
					</StreamingText>
				</StreamingText>
			</div>
		</div>
	);
}
