'use client';

import { usePortfolioStore } from '~/lib/PortfolioStore';
import type { ForceDirectedGraphNode } from '~/components/ForceGraph/Common';
import type { Node, Link, Metric } from '~/lib/PortfolioStore';
import { MaterialIcon } from './MaterialIcon';
import './SlidingPanel.scss';
import StreamingText from './StreamingText';

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
					<StreamingText as="h2" className="panel-title">
						{panelContent.title}
					</StreamingText>
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
		<StreamingText className="sliding-panel-node-content">
			
			{data.type === 'role' && (
				<>
					<StreamingText className="node-section">
						<StreamingText as="h3" className="section-title">Company</StreamingText>
						<StreamingText as="p" className="section-text">{data.company}</StreamingText>
					</StreamingText>
					<StreamingText className="node-section">
						<StreamingText as="h3" className="section-title">Position</StreamingText>
						<StreamingText as="p" className="section-text">{data.position}</StreamingText>
					</StreamingText>
				</>
			)}
			{data.summary !== undefined && data.description === undefined ? (
				<StreamingText className="node-section">
					<StreamingText as="h3" className="section-title">Summary</StreamingText>
					<StreamingText as="p" className="section-text">{data.summary}</StreamingText>
				</StreamingText>
			) : null}
			
			{data.description && (
				<StreamingText className="node-section">
					<StreamingText as="h3" className="section-title">Description</StreamingText>
					<StreamingText as="p" className="section-text description-text">{data.description}</StreamingText>
				</StreamingText>
			)}
			
			{data.tags && data.tags.length > 0 && (
				<StreamingText className="node-section">
					<StreamingText as="h3" className="section-title">Tags</StreamingText>
					<StreamingText className="node-tags">
						{data.tags.map((tag: string, index: number) => (
							<StreamingText key={index} as="span" className="tag">
								{tag}
							</StreamingText>
						))}
					</StreamingText>
				</StreamingText>
			)}
			
			{(data.type === 'role' || data.type === 'project') && data.period && (
				<StreamingText className="node-section">
					<StreamingText as="h3" className="section-title">Period</StreamingText>
					<StreamingText as="p" className="section-text">
						{data.period.start} - {data.period.end}
					</StreamingText>
				</StreamingText>
			)}
			
			{(data.type === 'person' || data.type === 'role' || data.type === 'education' || data.type === 'talk') && data.location && (
				<StreamingText className="node-section">
					<StreamingText as="h3" className="section-title">Location</StreamingText>
					<StreamingText as="p" className="section-text">{data.location}</StreamingText>
				</StreamingText>
			)}
			
			{((data.type === 'person' || data.type === 'project' || data.type === 'talk') && data.links && data.links.length > 0) && (
				<StreamingText className="node-section">
					<StreamingText as="h3" className="section-title">Links</StreamingText>
					<StreamingText className="node-links">
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
					</StreamingText>
				</StreamingText>
			)}
			
			{((data.type === 'role' || data.type === 'project') && data.metrics && data.metrics.length > 0) && (
				<StreamingText className="node-section">
					<StreamingText as="h3" className="section-title">Metrics</StreamingText>
					<StreamingText className="node-metrics">
						{data.metrics.map((metric: Metric, index: number) => (
							<StreamingText key={index} className="metric-item">
								<StreamingText as="span" className="metric-label">{metric.label}:</StreamingText>{' '}
								<StreamingText as="span" className="metric-value">{metric.value}</StreamingText>
							</StreamingText>
						))}
					</StreamingText>
				</StreamingText>
			)}
			
			{data.type === 'skill' && data.level && (
				<StreamingText className="node-section">
					<StreamingText as="h3" className="section-title">Skill Level</StreamingText>
					<StreamingText as="span" className={`skill-level-badge ${data.level}`}>
						{data.level}
					</StreamingText>
				</StreamingText>
			)}
		</StreamingText>
	);
};