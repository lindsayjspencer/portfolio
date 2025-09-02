import React, { useRef, useEffect, useState } from 'react';
import { MaterialIcon } from '~/components/Ui/MaterialIcon';
import type { SkillMatrix, TransitionPhase, TransitionCallbacks } from '~/lib/ViewTransitions';
import SkillsMatrixTable from './SkillsMatrixTable';
import './SkillsMatrixView.scss';

type BackgroundOption =
	| 'none'
	| 'gradient-neutral'
	| 'gradient-colored'
	| 'gradient-fade'
	| 'pattern-dots'
	| 'pattern-grid'
	| 'pattern-diagonal'
	| 'pattern-noise'
	| 'floating-icons';

type Props = {
	matrix: SkillMatrix;
	highlights?: string[]; // skillId or projectId
	accent?: string; // e.g. "#2563eb" or "--color-primary-600"
	background?: BackgroundOption; // Background option for the right side
	transitionPhase?: TransitionPhase;
	onRegisterCallbacks?: (callbacks: TransitionCallbacks) => void;
};

export default function SkillsMatrixView({
	matrix,
	highlights = [],
	accent = '--color-primary-600',
	background = 'none',
	transitionPhase = 'stable',
	onRegisterCallbacks,
}: Props) {
	// Calculate totals for visual hierarchy
	const totalSkills = matrix.rows.length;
	const totalProjects = matrix.cols.length;

	// Transition state
	const [textOpacity, setTextOpacity] = useState(transitionPhase === 'stable' ? 1 : 0);
	const [transitionDuration, setTransitionDuration] = useState(400);

	// Refs and state for measuring empty space
	const contentRef = useRef<HTMLDivElement>(null);
	const tableRef = useRef<HTMLTableElement>(null);
	const [emptySpaceInfo, setEmptySpaceInfo] = useState<{
		left: number;
		width: number;
		hasSpace: boolean;
	}>({ left: 0, width: 0, hasSpace: false });

	// Generate floating icons for the floating-icons background option
	const floatingIcons = ['{ }', '< >', '[ ]', '∞', '◆', '▲', '●', '→'];

	// Register transition callbacks
	useEffect(() => {
		if (onRegisterCallbacks) {
			onRegisterCallbacks({
				onTransitionIn: async (duration: number) => {
					setTransitionDuration(duration);
					setTextOpacity(1);
				},
				onTransitionOut: async (duration: number) => {
					setTransitionDuration(duration);
					setTextOpacity(0);
				}
			});
		}
	}, [onRegisterCallbacks]);

	// Handle initial entering state
	useEffect(() => {
		if (transitionPhase === 'entering') {
			setTextOpacity(0);
		}
	}, [transitionPhase]);

	// Build content class with background modifier
	const contentClass =
		background !== 'none'
			? `skills-matrix-view__content skills-matrix-view__content--${background}`
			: 'skills-matrix-view__content';

	// Measure empty space after render - simplified approach
	useEffect(() => {
		const measureEmptySpace = () => {
			if (!contentRef.current || !tableRef.current) return;

			const contentRect = contentRef.current.getBoundingClientRect();
			const tableRect = tableRef.current.getBoundingClientRect();

			// Calculate where the table ends relative to the content container
			const tableRightEdge = tableRect.right;
			const contentRightEdge = contentRect.right;
			const contentLeftEdge = contentRect.left;

			// Available space to the right of the table
			const emptyWidth = contentRightEdge - tableRightEdge - 20; // 20px padding from right edge

			// Table width relative to content container start
			const tableWidthFromContentStart = tableRect.right - contentRect.left;

			if (emptyWidth > 250) {
				// Only show if we have at least 150px of space
				setEmptySpaceInfo({
					left: tableWidthFromContentStart + 10, // 10px gap from table
					width: emptyWidth,
					hasSpace: true,
				});
			} else {
				setEmptySpaceInfo({ left: 0, width: 0, hasSpace: false });
			}
		};

		// Initial measure
		measureEmptySpace();

		// Re-measure on resize
		const resizeObserver = new ResizeObserver(measureEmptySpace);
		if (contentRef.current) {
			resizeObserver.observe(contentRef.current);
		}
		if (tableRef.current) {
			resizeObserver.observe(tableRef.current);
		}

		return () => resizeObserver.disconnect();
	}, [matrix, highlights]); // Re-measure when matrix data changes

	return (
		<div className="skills-matrix-view">
			<div 
				className="skills-matrix-view__container"
				style={{ 
					opacity: textOpacity,
					transition: `opacity ${transitionDuration}ms ease-in-out`
				}}
			>
				<div className="skills-matrix-view__header">
					<div className="skills-matrix-view__title-section">
						<h1 className="skills-matrix-view__title">Skills Matrix</h1>
						<p className="skills-matrix-view__subtitle">
							{totalSkills} skills mapped across {totalProjects} projects
						</p>
					</div>
					<div className="skills-matrix-view__legend">
						<span className="legend-item">
							<span className="legend-dot legend-dot--match" />
							Match
						</span>
						<span className="legend-item">
							<span className="legend-dot legend-dot--empty" />
							Empty
						</span>
					</div>
				</div>

				<div className={contentClass} ref={contentRef}>
					<SkillsMatrixTable ref={tableRef} matrix={matrix} highlights={highlights} accent={accent} />

					{background === 'floating-icons' && (
						<div className="floating-icons">
							{floatingIcons.map((icon, index) => (
								<div key={index} className="floating-icon">
									{icon}
								</div>
							))}
						</div>
					)}

					{/* Instructional message for detected empty space */}
					{emptySpaceInfo.hasSpace && (
						<div
							className="empty-space-message"
							style={{
								paddingLeft: `${emptySpaceInfo.left}px`,
							}}
						>
							<div className="icon">
								<MaterialIcon name="search" size="lg" />
							</div>
							<div className="title">Interactive Matrix</div>
							<div className="subtitle">Hover over cells to see skill-project connections</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
