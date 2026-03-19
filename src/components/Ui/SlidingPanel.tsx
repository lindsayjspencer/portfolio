'use client';

import { usePortfolioStore } from '~/lib/PortfolioStore';
import type { ForceDirectedGraphNode } from '~/components/ForceGraph/Common';
import type { Link, Metric } from '~/lib/PortfolioStore';
import { MaterialIcon } from './MaterialIcon';
import './SlidingPanel.scss';
import TreeStream from 'react-tree-stream';
import Tag from '~/components/Ui/Tag';
import { useTheme } from '~/contexts/theme-context';
import { DrawingUtils } from '~/components/ForceGraph/DrawingUtils';

export const SlidingPanel = () => {
	const { panelContent, closePanel } = usePortfolioStore();

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
			<div className="sliding-panel-backdrop" onClick={handleClose} />

			{/* Panel */}
			<div className="sliding-panel-main">
				{/* Header */}
				<div className="sliding-panel-header">
					<TreeStream as="h2" className="panel-title">
						{panelContent.title}
					</TreeStream>
					<button onClick={handleClose} className="close-button" aria-label="Close panel">
						<MaterialIcon name="close" />
					</button>
				</div>

				{/* Content */}
				<div className="sliding-panel-content">
					{panelContent.type === 'node' && <NodeContent data={panelContent.data} />}
					{panelContent.type === 'custom' && <div className="custom-content">{panelContent.data}</div>}
				</div>
			</div>
		</div>
	);
};

const NodeContent = ({ data }: { data: ForceDirectedGraphNode }) => {
	const { themeColors } = useTheme();

	// Get the node colors from DrawingUtils
	const nodeTheme = DrawingUtils.getTheme(data, themeColors, false, false);

	// Create inline styles for the type badge
	const badgeStyles = {
		backgroundColor: nodeTheme.selectedBackground,
		color: nodeTheme.resourceIndicatorColor,
		borderColor: nodeTheme.selectedBorder,
	};

	return (
		<TreeStream className="sliding-panel-node-content">
			<TreeStream as="div" className="node-type-badge" style={badgeStyles}>
				{data.type.charAt(0).toUpperCase() + data.type.slice(1)}
			</TreeStream>

			{data.type === 'role' && (
				<>
					<TreeStream className="node-section">
						<TreeStream as="h3" className="section-title">
							Company
						</TreeStream>
						<TreeStream as="p" className="section-text">
							{data.company}
						</TreeStream>
					</TreeStream>
					<TreeStream className="node-section">
						<TreeStream as="h3" className="section-title">
							Position
						</TreeStream>
						<TreeStream as="p" className="section-text">
							{data.position}
						</TreeStream>
					</TreeStream>
				</>
			)}
			{data.summary !== undefined && data.description === undefined ? (
				<TreeStream className="node-section">
					<TreeStream as="h3" className="section-title">
						Summary
					</TreeStream>
					<TreeStream as="p" className="section-text">
						{data.summary}
					</TreeStream>
				</TreeStream>
			) : null}

			{data.description && (
				<TreeStream className="node-section">
					<TreeStream as="h3" className="section-title">
						Description
					</TreeStream>
					<TreeStream as="p" className="section-text description-text">
						{data.description}
					</TreeStream>
				</TreeStream>
			)}

			{data.tags && data.tags.length > 0 && (
				<TreeStream className="node-section">
					<TreeStream as="h3" className="section-title">
						Tags
					</TreeStream>
					<TreeStream className="node-tags">
						{data.tags.map((tag: string, index: number) => (
							<Tag key={index} tone="accent" variant="subtle" shape="rounded">
								{tag}
							</Tag>
						))}
					</TreeStream>
				</TreeStream>
			)}

			{(data.type === 'role' || data.type === 'project') && data.period && (
				<TreeStream className="node-section">
					<TreeStream as="h3" className="section-title">
						Period
					</TreeStream>
					<TreeStream as="p" className="section-text">
						{data.period.start} - {data.period.end}
					</TreeStream>
				</TreeStream>
			)}

			{(data.type === 'person' || data.type === 'role' || data.type === 'education' || data.type === 'talk') &&
				data.location && (
					<TreeStream className="node-section">
						<TreeStream as="h3" className="section-title">
							Location
						</TreeStream>
						<TreeStream as="p" className="section-text">
							{data.location}
						</TreeStream>
					</TreeStream>
				)}

			{(data.type === 'person' || data.type === 'project' || data.type === 'talk') &&
				data.links &&
				data.links.length > 0 && (
					<TreeStream className="node-section">
						<TreeStream as="h3" className="section-title">
							Links
						</TreeStream>
						<TreeStream className="node-links">
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
						</TreeStream>
					</TreeStream>
				)}

			{(data.type === 'role' || data.type === 'project') && data.metrics && data.metrics.length > 0 && (
				<TreeStream className="node-section">
					<TreeStream as="h3" className="section-title">
						Metrics
					</TreeStream>
					<TreeStream className="node-metrics">
						{data.metrics.map((metric: Metric, index: number) => (
							<TreeStream key={index} className="metric-item">
								<TreeStream as="span" className="metric-label">
									{metric.label}:
								</TreeStream>{' '}
								<TreeStream as="span" className="metric-value">
									{metric.value}
								</TreeStream>
							</TreeStream>
						))}
					</TreeStream>
				</TreeStream>
			)}

			{data.type === 'skill' && data.level && (
				<TreeStream className="node-section">
					<TreeStream as="h3" className="section-title">
						Skill Level
					</TreeStream>
					<TreeStream as="span" className={`skill-level-badge ${data.level}`}>
						{data.level}
					</TreeStream>
				</TreeStream>
			)}
		</TreeStream>
	);
};

