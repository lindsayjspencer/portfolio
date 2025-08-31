import { useEffect, useState } from 'react';
import type { TransitionPhase, TransitionCallbacks } from '~/lib/ViewTransitions';
import './ResumeView.scss';

interface ResumeViewProps {
	transitionPhase?: TransitionPhase;
	onRegisterCallbacks?: (callbacks: TransitionCallbacks) => void;
}

export function ResumeView({ transitionPhase = 'stable', onRegisterCallbacks }: ResumeViewProps) {
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
				}
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
		<div className="resume-view">
			<div 
				className="container"
				style={{ 
					opacity: contentOpacity,
					transition: `opacity ${transitionDuration}ms ease-in-out`
				}}
			>
				<button onClick={handlePrint} className="print-btn">
					Download PDF
				</button>
				
				<header>
					<h1>Lindsay Spencer</h1>
					<div className="meta">Senior Full Stack Developer (Frontend Specialist) · Brisbane, Australia</div>
					<div className="meta">
						<a href="mailto:lindsayjspencer@gmail.com">lindsayjspencer@gmail.com</a> · {' '}
						<a href="https://github.com/lindsayjspencer">github.com/lindsayjspencer</a>
					</div>
				</header>

				<main>
					<section>
						<h2>Experience</h2>

						<div className="role">
							<h3>Quality Lead — Codebots</h3>
							<div className="meta">Jan 2025 – Present · Brisbane</div>
							<ul>
								<li>Embedded across squads uplifting testing, observability, and traceability.</li>
								<li>Ran company frontend focus group, mentoring developers.</li>
							</ul>
						</div>

						<div className="role">
							<h3>Senior Full Stack Developer — Codebots</h3>
							<div className="meta">May 2022 – Jan 2025 · Brisbane</div>
							<ul>
								<li>Led frontend focus group (15–20 devs), mentoring and shaping standards.</li>
								<li>Built <strong>Resource Version Dependency Graph</strong>: reduced workflows from 3–4h → &lt;1m.</li>
								<li>Delivered <strong>Codebots Homepage + AI Search</strong>: LLM/RAG-powered knowledge discovery.</li>
							</ul>
						</div>

						<div className="role">
							<h3>Full Stack Developer — Codebots</h3>
							<div className="meta">May 2020 – May 2022 · Brisbane</div>
							<ul>
								<li>Introduced React/TypeScript as first-class codegen target alongside .NET.</li>
								<li>Contributed to diagram-driven application generation pipelines.</li>
							</ul>
						</div>

						<div className="role">
							<h3>Full Stack Developer — Goodwill Projects</h3>
							<div className="meta">Jun 2014 – Mar 2020 · Brisbane</div>
							<ul>
								<li>Owned <strong>Markets & Events Platform</strong> end-to-end, scaling 1 → 36 markets across AU.</li>
								<li>Reduced admin by 60% and automated bookkeeping 80%.</li>
								<li>Built automated bank reconciliation system, eliminating week-long manual tasks.</li>
							</ul>
						</div>

						<div className="role">
							<h3>Operations Manager — Goodwill Projects</h3>
							<div className="meta">Jan 2014 – Jun 2014 · Brisbane</div>
							<ul>
								<li>Managed operations for growing markets/events business, identified tech needs for scaling.</li>
							</ul>
						</div>
					</section>

					<section>
						<h2>Projects</h2>

						<div className="project">
							<h3>Codebots</h3>
							<div className="meta">Diagram-driven app generation; pioneered React/TS codegen.</div>
						</div>

						<div className="project">
							<h3>Resource Version Dependency Graph</h3>
							<div className="meta">Interactive 2D/3D tool; cut tasks 3–4h → &lt;1m.</div>
						</div>

						<div className="project">
							<h3>Codebots AI Search</h3>
							<div className="meta">
								Next.js + Vercel AI SDK; RAG-powered chat. {' '}
								<a href="https://beta.codebots.com">Demo</a>
							</div>
						</div>

						<div className="project">
							<h3>React Granular Store (OSS)</h3>
							<div className="meta">
								State management library adopted in enterprise apps. {' '}
								<a href="https://www.npmjs.com/package/react-granular-store">npm</a>
							</div>
						</div>

						<div className="project">
							<h3>Markets & Events Platform</h3>
							<div className="meta">End-to-end admin & ops system for statewide operator.</div>
						</div>
					</section>
				</main>

				<aside className="sidebar">
					<section>
						<h2>Skills</h2>
						<div className="skill-tags">
							<span className="tag">React</span>
							<span className="tag">TypeScript</span>
							<span className="tag">CSS</span>
							<span className="tag">Three.js</span>
							<span className="tag">Node.js</span>
							<span className="tag">.NET</span>
							<span className="tag">PHP</span>
							<span className="tag">MySQL</span>
							<span className="tag">Postgres</span>
							<span className="tag">Docker</span>
							<span className="tag">Linux</span>
							<span className="tag">LLM Apps</span>
						</div>
					</section>

					<section>
						<h2>Values</h2>
						<div className="value">
							<strong>Mentorship & Community</strong>
							<br />Led frontend focus group, mentoring juniors.
						</div>
						<div className="value">
							<strong>Quality & Observability</strong>
							<br />Established culture of testing + observability.
						</div>
						<div className="value">
							<strong>Design Polish & Performance</strong>
							<br />Pixel-perfect, optimised interfaces as priority.
						</div>
						<div className="value">
							<strong>Innovation</strong>
							<br />Exploring AI/LLMs and emerging tech.
						</div>
						<div className="value">
							<strong>Open Source</strong>
							<br />Author of <code>react-granular-store</code>, more libraries in progress.
						</div>
					</section>
				</aside>
			</div>
		</div>
	);
}