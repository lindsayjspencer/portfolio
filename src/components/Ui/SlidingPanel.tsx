'use client';

import { usePortfolioStore } from '~/lib/PortfolioStore';
import type { ForceDirectedGraphNode } from '~/components/ForceGraph/Common';
import type { Node, Link, Metric } from '~/lib/PortfolioStore';
import { MaterialIcon } from './MaterialIcon';
import './SlidingPanel.scss';

export const SlidingPanel = () => {
	const { isPanelOpen, panelContent, closePanel } = usePortfolioStore();

	if (!panelContent) return null;

	const handleClose = () => {
		// Call custom onClose callback if provided
		if (panelContent.onClose) {
			panelContent.onClose();
		}
		// Always close the panel
		closePanel();
	};

	return (
		<div className="sliding-panel">
			{/* Backdrop - visible on desktop for visual separation */}
			<div
				className="sliding-panel-backdrop"
				onClick={handleClose}
			/>
			
			{/* Panel */}
			<div className="sliding-panel-main">
				{/* Header */}
				<div className="sliding-panel-header">
					<h2 className="panel-title">
						{panelContent.title}
					</h2>
					<button
						onClick={handleClose}
						className="close-button"
						aria-label="Close panel"
					>
						<MaterialIcon name="close" />
					</button>
				</div>

				{/* Content */}
				<div className="sliding-panel-content">
					{panelContent.type === 'node' && (
						<NodeContent data={panelContent.data} />
					)}
					{panelContent.type === 'custom' && (
						<div className="custom-content">{panelContent.data}</div>
					)}
				</div>
			</div>
		</div>
	);
};

const NodeContent = ({ data }: { data: ForceDirectedGraphNode }) => {
	return (
		<div className="sliding-panel-node-content">
			{data.summary !== undefined && data.description === undefined ? (
				<div className="node-section">
					<h3 className="section-title">Summary</h3>
					<p className="section-text">{data.summary}</p>
				</div>
			) : null}
			
			{data.description && (
				<div className="node-section">
					<h3 className="section-title">Description</h3>
					<p className="section-text description-text">{data.description}</p>
				</div>
			)}
			
			{data.tags && data.tags.length > 0 && (
				<div className="node-section">
					<h3 className="section-title">Tags</h3>
					<div className="node-tags">
						{data.tags.map((tag: string, index: number) => (
							<span key={index} className="tag">
								{tag}
							</span>
						))}
					</div>
				</div>
			)}
			
			{(data.type === 'role' || data.type === 'project') && data.period && (
				<div className="node-section">
					<h3 className="section-title">Period</h3>
					<p className="section-text">
						{data.period.start} - {data.period.end}
					</p>
				</div>
			)}
			
			{(data.type === 'person' || data.type === 'role' || data.type === 'education' || data.type === 'talk') && data.location && (
				<div className="node-section">
					<h3 className="section-title">Location</h3>
					<p className="section-text">{data.location}</p>
				</div>
			)}
			
			{((data.type === 'person' || data.type === 'project' || data.type === 'talk') && data.links && data.links.length > 0) && (
				<div className="node-section">
					<h3 className="section-title">Links</h3>
					<div className="node-links">
						{data.links.map((link: Link, index: number) => (
							<a
								key={index}
								href={link.href}
								target="_blank"
								rel="noopener noreferrer"
								className="link-item"
							>
								{link.title}
							</a>
						))}
					</div>
				</div>
			)}
			
			{((data.type === 'role' || data.type === 'project') && data.metrics && data.metrics.length > 0) && (
				<div className="node-section">
					<h3 className="section-title">Metrics</h3>
					<div className="node-metrics">
						{data.metrics.map((metric: Metric, index: number) => (
							<div key={index} className="metric-item">
								<span className="metric-label">{metric.label}:</span>{' '}
								<span className="metric-value">{metric.value}</span>
							</div>
						))}
					</div>
				</div>
			)}
			
			{data.type === 'skill' && data.level && (
				<div className="node-section">
					<h3 className="section-title">Skill Level</h3>
					<span className={`skill-level-badge ${data.level}`}>
						{data.level}
					</span>
				</div>
			)}
			
			{data.type === 'role' && (
				<>
					<div className="node-section">
						<h3 className="section-title">Company</h3>
						<p className="section-text">{data.company}</p>
					</div>
					<div className="node-section">
						<h3 className="section-title">Position</h3>
						<p className="section-text">{data.position}</p>
					</div>
				</>
			)}
		</div>
	);
};