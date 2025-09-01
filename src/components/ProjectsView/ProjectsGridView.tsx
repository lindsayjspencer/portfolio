import { useEffect, useRef } from 'react';
import type { TransitionPhase, TransitionCallbacks, ProjectsGridSnapshot } from '~/lib/ViewTransitions';
import type { ProjectCard } from '~/lib/PortfolioToProject';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import './ProjectsGridView.scss';

interface ProjectsGridViewProps {
	dataSnapshot: ProjectsGridSnapshot;
	transitionPhase: TransitionPhase;
	onRegisterCallbacks: (callbacks: TransitionCallbacks) => void;
}

interface ProjectCardComponentProps {
	project: ProjectCard;
	onClick: (project: ProjectCard) => void;
}

function ProjectCardComponent({ project, onClick }: ProjectCardComponentProps) {
	const formatPeriod = (project: ProjectCard) => {
		if (project.yearStart && project.yearEnd) {
			return project.yearEnd === new Date().getFullYear() 
				? `${project.yearStart}–Present` 
				: `${project.yearStart}–${project.yearEnd}`;
		}
		return project.period 
			? `${project.period.start}–${project.period.end}` 
			: '—';
	};

	const formatDuration = (durationMonths?: number) => {
		if (!durationMonths) return '';
		if (durationMonths < 12) return `${durationMonths}mo`;
		const years = Math.floor(durationMonths / 12);
		const months = durationMonths % 12;
		return months > 0 ? `${years}y ${months}mo` : `${years}y`;
	};

	return (
		<div 
			className={`project-card ${project.isPinned ? 'project-card--pinned' : ''} ${project.isHighlighted ? 'project-card--highlighted' : ''}`}
			onClick={() => onClick(project)}
		>
			<div className="project-card__header">
				<h3 className="project-card__title">{project.label}</h3>
				{project.isPinned && (
					<div className="project-card__pin-badge">★</div>
				)}
			</div>

			<div className="project-card__period">
				{formatPeriod(project)}
				{project.durationMonths && (
					<span className="project-card__duration">
						{' · '}
						{formatDuration(project.durationMonths)}
					</span>
				)}
			</div>

			{project.summary && (
				<p className="project-card__summary">{project.summary}</p>
			)}

			{project.primaryTech.length > 0 && (
				<div className="project-card__tech">
					{project.primaryTech.slice(0, 4).map((tech, index) => (
						<span key={index} className="project-card__tech-chip">
							{tech}
						</span>
					))}
					{project.primaryTech.length > 4 && (
						<span className="project-card__tech-chip project-card__tech-chip--more">
							+{project.primaryTech.length - 4}
						</span>
					)}
				</div>
			)}

			<div className="project-card__footer">
				<div className="project-card__stats">
					{project.skillCount > 0 && (
						<span className="project-card__stat">
							{project.skillCount} skill{project.skillCount !== 1 ? 's' : ''}
						</span>
					)}
					{project.impactScore && project.impactScore > 0 && (
						<span className="project-card__stat">
							Impact: {project.impactScore}
						</span>
					)}
				</div>

				{project.links && project.links.length > 0 && (
					<div className="project-card__links">
						{project.links.slice(0, 2).map((link, index) => (
							<a 
								key={index}
								href={link.href}
								className="project-card__link"
								onClick={(e) => e.stopPropagation()}
								target="_blank"
								rel="noopener noreferrer"
							>
								{link.title}
							</a>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

export function ProjectsGridView({ dataSnapshot, transitionPhase, onRegisterCallbacks }: ProjectsGridViewProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const { openPanel } = usePortfolioStore();

	// Register transition callbacks
	useEffect(() => {
		const callbacks: TransitionCallbacks = {
			onTransitionIn: async (duration) => {
				if (containerRef.current) {
					containerRef.current.style.opacity = '0';
					containerRef.current.style.transform = 'translateY(20px)';
					
					// Trigger reflow
					containerRef.current.offsetHeight;
					
					containerRef.current.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;
					containerRef.current.style.opacity = '1';
					containerRef.current.style.transform = 'translateY(0)';
				}
			},
			onTransitionOut: async (duration) => {
				if (containerRef.current) {
					containerRef.current.style.transition = `opacity ${duration}ms ease-in, transform ${duration}ms ease-in`;
					containerRef.current.style.opacity = '0';
					containerRef.current.style.transform = 'translateY(-20px)';
				}
			},
		};

		onRegisterCallbacks(callbacks);
	}, [onRegisterCallbacks]);

	const handleProjectClick = (project: ProjectCard) => {
		// Open the project in the panel
		openPanel({
			type: 'node',
			title: project.label,
			data: {
				...project,
				itemName: project.label,
			},
		});
	};

	const { projects, pinnedProjects } = dataSnapshot;

	return (
		<div 
			ref={containerRef} 
			className={`projects-grid-view projects-grid-view--${transitionPhase}`}
		>
			<div className="projects-grid-view__container">
				<div className="projects-grid-view__header">
					<h1 className="projects-grid-view__title">Projects</h1>
				</div>

				{pinnedProjects && pinnedProjects.length > 0 && (
					<div className="projects-grid-view__pinned-section">
						<h2 className="projects-grid-view__section-title">Featured Projects</h2>
						<div className="projects-grid-view__grid projects-grid-view__grid--pinned">
							{pinnedProjects.map((project: ProjectCard) => (
								<ProjectCardComponent
									key={project.id}
									project={project}
									onClick={handleProjectClick}
								/>
							))}
						</div>
					</div>
				)}

				<div className="projects-grid-view__main-section">
					<h2 className="projects-grid-view__section-title">
						All Projects ({projects.length})
					</h2>
					<div className="projects-grid-view__grid">
						{projects.map((project: ProjectCard) => (
							<ProjectCardComponent
								key={project.id}
								project={project}
								onClick={handleProjectClick}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}