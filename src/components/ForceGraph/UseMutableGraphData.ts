import { useEffect, useState } from 'react';
import type { AnchorNode, ForceDirectedGraphData, ForceDirectedGraphLink, ForceDirectedGraphNode } from './Common';
import type { PersonNode, ProjectNode, RoleNode, SkillNode } from '~/lib/PortfolioStore';

const asId = (x: string | { id: string }) => (typeof x === 'string' ? x : x.id);

export const useMutableGraphData = (graphData: ForceDirectedGraphData) => {
	const [mutableGraphData, setMutableGraphData] = useState(graphData);

	useEffect(() => {
		setMutableGraphData((prev) => {
			// --- Reuse node instances when possible ---
			const prevNodeMap = new Map(prev.nodes.map((n) => [n.id, n]));
			const updateNodeInPlace = (existing: ForceDirectedGraphNode, next: ForceDirectedGraphNode) => {
				// UI flags and labels
				existing.itemName = next.itemName;
				existing.selectable = next.selectable;
				existing.isHighlighted = next.isHighlighted;
				existing.singleLine = next.singleLine;
				existing.label = next.label;
				// Base node fields
				existing.summary = next.summary;
				existing.description = next.description;
				existing.tags = next.tags;
				existing.years = next.years;

				// Type-specific fields
				switch (existing.type) {
					case 'skill':
						existing.level = (next as SkillNode).level;
						break;
					case 'role':
						existing.company = (next as RoleNode).company;
						existing.position = (next as RoleNode).position;
						existing.location = (next as RoleNode).location;
						existing.period = (next as RoleNode).period;
						existing.metrics = (next as RoleNode).metrics;
						break;
					case 'project':
						existing.period = (next as ProjectNode).period;
						existing.links = (next as ProjectNode).links;
						existing.metrics = (next as ProjectNode).metrics;
						break;
					case 'person':
						existing.location = (next as PersonNode).location;
						existing.links = (next as PersonNode).links;
						break;
					case 'anchor':
						existing.anchorKind = (next as AnchorNode).anchorKind;
						// seed/fixed positions & style hints can change between snapshots
						existing.fx = (next as AnchorNode).fx;
						existing.fy = (next as AnchorNode).fy;
						existing.radius = (next as AnchorNode).radius;
						existing.tint = (next as AnchorNode).tint;
						break;
					default:
						// no extra fields
						break;
				}

				// Avoid touching simulation coords (x,y,z,vx,vy,vz) so layout remains stable
				return existing;
			};

			const nextNodes: ForceDirectedGraphNode[] = graphData.nodes.map((n) => {
				const existing = prevNodeMap.get(n.id);
				if (existing) {
					return updateNodeInPlace(existing, n);
				}
				return n; // new instance
			});

			// --- Always rebuild links with id endpoints (fresh objects) ---
			const nextLinks: ForceDirectedGraphLink[] = graphData.links.map((l) => ({
				...l,
				source: asId(l.source),
				target: asId(l.target),
			}));

			return { nodes: nextNodes, links: nextLinks };
		});
	}, [graphData]);

	return mutableGraphData;
};
