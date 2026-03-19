import { useEffect, useRef, useState } from 'react';
import type { TransitionPhase, TransitionCallbacks } from '~/lib/ViewTransitions';
import './ResumeView.scss';
import Tag from '~/components/Ui/Tag';
import { MaterialIcon } from '~/components/Ui';
import TreeStream from '../Ui/TreeStream';

interface ResumeViewProps {
	transitionPhase?: TransitionPhase;
	onRegisterCallbacks?: (callbacks: TransitionCallbacks) => void;
}

const CustomComponent = ({ children, ...rest }: React.PropsWithChildren<React.ComponentPropsWithoutRef<'section'>>) => (
	<section {...rest}>{children}</section>
);

export function ResumeView({ transitionPhase = 'stable', onRegisterCallbacks }: ResumeViewProps) {
	const [contentOpacity, setContentOpacity] = useState(transitionPhase === 'stable' ? 1 : 0);
	const [transitionDuration, setTransitionDuration] = useState(400);
	const [isDesktop, setIsDesktop] = useState(false);
	const [shouldAnimateAside, setShouldAnimateAside] = useState(false);
	const asideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const mediaQuery = window.matchMedia('(min-width: 1024px)');
		const syncIsDesktop = () => setIsDesktop(mediaQuery.matches);

		syncIsDesktop();
		mediaQuery.addEventListener('change', syncIsDesktop);

		return () => {
			mediaQuery.removeEventListener('change', syncIsDesktop);
		};
	}, []);

	useEffect(() => {
		if (onRegisterCallbacks) {
			onRegisterCallbacks({
				onTransitionIn: async (duration: number) => {
					setTransitionDuration(duration);
					setContentOpacity(1);

					if (asideTimerRef.current) {
						clearTimeout(asideTimerRef.current);
						asideTimerRef.current = null;
					}

					if (!window.matchMedia('(min-width: 1024px)').matches) {
						asideTimerRef.current = setTimeout(() => {
							setShouldAnimateAside(true);
							asideTimerRef.current = null;
						}, 2500);
					} else {
						setShouldAnimateAside(true);
					}
				},
				onTransitionOut: async (duration: number) => {
					setTransitionDuration(duration);
					setContentOpacity(0);
					setShouldAnimateAside(false);
				},
			});
		}
	}, [onRegisterCallbacks]);

	useEffect(() => {
		return () => {
			if (asideTimerRef.current) {
				clearTimeout(asideTimerRef.current);
			}
		};
	}, []);

	// Handle initial entering state
	useEffect(() => {
		if (transitionPhase === 'entering') {
			setContentOpacity(0);
			setShouldAnimateAside(false);
			if (asideTimerRef.current) {
				clearTimeout(asideTimerRef.current);
				asideTimerRef.current = null;
			}
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
				<TreeStream as="header">
					<TreeStream as="h1">Lindsay Spencer</TreeStream>
					<TreeStream as="div" className="meta">
						Senior Full Stack Developer (Frontend Specialist) · Brisbane, Australia
					</TreeStream>
					<TreeStream className="meta contact-links">
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
					</TreeStream>
				</TreeStream>

				<TreeStream as="main">
					<TreeStream as="section">
						<TreeStream as="h2">Experience</TreeStream>

						<TreeStream as="div" className="role">
							<TreeStream as="h3">Quality Lead — Codebots</TreeStream>
							<TreeStream as={CustomComponent} className="meta" speed={1} streamBy="character">
								Jan 2025 – Present · Brisbane
							</TreeStream>
							<TreeStream as="ul">
								<TreeStream as="li">
									Embedded within squads, enhancing testing, observability, and traceability
									processes, resulting in a 60% increase in issue detection efficiency.
								</TreeStream>
								<TreeStream as="li">
									Led company frontend focus group, mentoring 15 developers and improving frontend
									code quality by 30%.
								</TreeStream>
								<TreeStream as="li">
									Collaborated with cross-functional teams to streamline development workflows and
									reduce deployment times by 15%.
								</TreeStream>
							</TreeStream>
						</TreeStream>

						<TreeStream as="div" className="role">
							<TreeStream as="h3">Senior Full Stack Developer — Codebots</TreeStream>
							<TreeStream as="div" className="meta">
								May 2022 – Jan 2025 · Brisbane
							</TreeStream>
							<TreeStream as="ul">
								<TreeStream as="li">
									Engineered the Resource Version Dependency Graph, reducing workflow time from 3
									hours to under 1 minute, increasing productivity by 99%.
								</TreeStream>
								<TreeStream as="li">
									Delivered the Codebots Homepage and AI Search feature, leveraging LLM/RAG technology
									to enhance knowledge discovery accuracy by 80%.
								</TreeStream>
								<TreeStream as="li">
									Project lead on the flagship Codebots Platform; led the team and architected the
									frontend.
								</TreeStream>
							</TreeStream>
						</TreeStream>

						<TreeStream as="div" className="role">
							<TreeStream as="h3">Full Stack Developer — Codebots</TreeStream>
							<TreeStream as="div" className="meta">
								May 2020 – May 2022 · Brisbane
							</TreeStream>
							<TreeStream as="ul">
								<TreeStream as="li">
									Established the foundation of the frontend application and styling system for the
									Codebots Platform team, accelerating UI development by 30%.
								</TreeStream>
								<TreeStream as="li">
									Engineered a diagramming system enabling users to configure metamodels, improving
									user configuration speed by 300%.
								</TreeStream>
								<TreeStream as="li">
									Implemented React/TypeScript as a primary codegen target alongside .NET, increasing
									development efficiency by 30%.
								</TreeStream>
							</TreeStream>
						</TreeStream>

						<TreeStream as="div" className="role">
							<TreeStream as="h3">Full Stack Developer — Goodwill Projects</TreeStream>
							<TreeStream as="div" className="meta">
								Jun 2014 – Mar 2020 · Brisbane
							</TreeStream>
							<TreeStream as="ul">
								<TreeStream as="li">
									Owned Markets & Events Platform end-to-end, scaling 1 to 36 markets across AU.
								</TreeStream>
								<TreeStream as="li">
									Reduced admin by 60% and automated bookkeeping by 80% through innovative automation
									solutions.
								</TreeStream>
								<TreeStream as="li">
									Built automated bank reconciliation system, eliminating week-long manual tasks.
								</TreeStream>
							</TreeStream>
						</TreeStream>

						<TreeStream as="div" className="role">
							<TreeStream as="h3">Operations Manager — Goodwill Projects</TreeStream>
							<TreeStream as="div" className="meta">
								Jan 2014 – Jun 2014 · Brisbane
							</TreeStream>
							<TreeStream as="ul">
								<TreeStream as="li">
									Managed operations for growing markets/events business, identified tech needs for
									scaling.
								</TreeStream>
							</TreeStream>
						</TreeStream>
					</TreeStream>

					<TreeStream as="section">
						<TreeStream as="h2">Projects</TreeStream>

						<TreeStream as="div" className="project">
							<TreeStream as="h3">Codebots Platform</TreeStream>
							<TreeStream as="div" className="meta">
								Brisbane, Australia · May 2020 – Present · Senior Full Stack Developer
							</TreeStream>
							<TreeStream as="ul">
								<TreeStream as="li">
									Architected and developed a scalable TypeScript frontend using React, enhancing user
									experience and increasing platform stability.
								</TreeStream>
								<TreeStream as="li">
									Led the design and implementation of the .NET backend, improving API response time
									by 60% and supporting seamless integration with Postgres databases.
								</TreeStream>
								<TreeStream as="li">
									Directed project strategy using diagram-driven app generation, cutting down
									development time by 40% and enabling rapid rollout of new features.
								</TreeStream>
								<TreeStream as="li">
									Managed release engineering and maintenance strategies over 3 years, achieving a
									99.9% uptime and successfully launching multiple new phases to meet evolving client
									requirements.
								</TreeStream>
							</TreeStream>
						</TreeStream>

						<TreeStream as="div" className="project">
							<TreeStream as="h3">
								Codebots AI Search&nbsp;
								<a href="https://codebots.com">demo</a>
							</TreeStream>
							<TreeStream as="div" className="meta">
								Brisbane, Australia · Aug 2025 – Sep 2025 · Senior Full Stack Developer
							</TreeStream>
							<TreeStream as="ul">
								<TreeStream as="li">
									Developed using Next.js and Vercel AI SDK to deliver a robust AI-powered search
									experience.
								</TreeStream>
								<TreeStream as="li">
									Implemented Retrieval-Augmented Generation (RAG) techniques to enhance chat
									interactions and knowledge discovery accuracy by 80%.
								</TreeStream>
								<TreeStream as="li">
									Collaborated closely with AI and frontend teams to integrate large language models,
									delivering users context-aware, precise search results and interactive chat
									functionality.
								</TreeStream>
							</TreeStream>
						</TreeStream>

						<TreeStream as="div" className="project">
							<TreeStream as="h3">
								React Granular Store (OSS)&nbsp;
								<a href="https://www.npmjs.com/package/react-granular-store">npm</a>
							</TreeStream>
							<TreeStream as="div" className="meta">
								Brisbane, Australia · Dec 2023 – Present · Senior Full Stack Developer
							</TreeStream>
							<TreeStream as="ul">
								<TreeStream as="li">
									Open source state management library providing strictly typed, performant state with
									a minimal footprint.
								</TreeStream>
								<TreeStream as="li">
									Widely used in enterprise applications with consistent weekly adoption on npm.
								</TreeStream>
							</TreeStream>
						</TreeStream>

						<TreeStream as="div" className="project">
							<TreeStream as="h3">Markets & Events Platform</TreeStream>
							<TreeStream as="div" className="meta">
								Brisbane, Australia · Jun 2014 – Mar 2020 · Full Stack Developer
							</TreeStream>
							<TreeStream as="ul">
								<TreeStream as="li">
									Project lead on admin & operations platform for a state-wide market operator.
								</TreeStream>
								<TreeStream as="li">
									Implemented sales tracking, booking, and payment systems integrated with MYOB and
									Westpac.
								</TreeStream>
								<TreeStream as="li">
									Developed mobile views, analytics dashboards, and comprehensive document and media
									management tools.
								</TreeStream>
							</TreeStream>
						</TreeStream>
					</TreeStream>
				</TreeStream>

				<TreeStream as="aside" className="sidebar" autoStart={isDesktop || shouldAnimateAside}>
					<TreeStream as="section">
						<TreeStream as="h2">Skills</TreeStream>
						<TreeStream as="div" className="skill-tags">
							<TreeStream as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									React
								</Tag>
							</TreeStream>
							<TreeStream as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									TypeScript
								</Tag>
							</TreeStream>
							<TreeStream as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									CSS
								</Tag>
							</TreeStream>
							<TreeStream as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									Three.js
								</Tag>
							</TreeStream>
							<TreeStream as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									Node.js
								</Tag>
							</TreeStream>
							<TreeStream as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									.NET
								</Tag>
							</TreeStream>
							<TreeStream as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									PHP
								</Tag>
							</TreeStream>
							<TreeStream as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									MySQL
								</Tag>
							</TreeStream>
							<TreeStream as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									Postgres
								</Tag>
							</TreeStream>
							<TreeStream as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									Docker
								</Tag>
							</TreeStream>
							<TreeStream as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									Linux
								</Tag>
							</TreeStream>
							<TreeStream as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									LLM Apps
								</Tag>
							</TreeStream>
							<TreeStream as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									C#
								</Tag>
							</TreeStream>
							<TreeStream as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									Shaders
								</Tag>
							</TreeStream>
							<TreeStream as="span">
								<Tag tone="primary" variant="subtle" shape="rounded">
									JavaScript
								</Tag>
							</TreeStream>
						</TreeStream>
					</TreeStream>

					<TreeStream as="section">
						<TreeStream as="h2">Values</TreeStream>
						<TreeStream as="div" className="value">
							<TreeStream as="strong">Mentorship & Community</TreeStream>
							<br />
							Led frontend focus group, mentoring juniors.
						</TreeStream>
						<TreeStream as="div" className="value">
							<TreeStream as="strong">Quality & Observability</TreeStream>
							<br />
							Established culture of testing + observability.
						</TreeStream>
						<TreeStream as="div" className="value">
							<TreeStream as="strong">Design Polish & Performance</TreeStream>
							<br />
							Pixel-perfect, optimised interfaces as priority.
						</TreeStream>
						<TreeStream as="div" className="value">
							<TreeStream as="strong">Innovation</TreeStream>
							<br />
							Exploring AI/LLMs and emerging tech.
						</TreeStream>
						<TreeStream as="div" className="value">
							<TreeStream as="strong">Open Source</TreeStream>
							<br />
							Author of <TreeStream as="code">react-granular-store</TreeStream>, more libraries in
							progress.
						</TreeStream>
					</TreeStream>

					<TreeStream as="section">
						<TreeStream as="h2">EDUCATION</TreeStream>
						<TreeStream as="div" className="value">
							<TreeStream as="strong">Kelvin Grove High School</TreeStream>
							<br />
							Brisbane, Australia
							<br />
							Jan 2003 – Dec 2006
							<br />
							High School Diploma in General Studies · Grade 12
						</TreeStream>
					</TreeStream>
				</TreeStream>
			</div>
		</div>
	);
}
