import { useEffect, useState } from 'react';
import type { ForceDirectedGraphData, ForceDirectedGraphLink, ForceDirectedGraphNode } from './Common';

const asId = (x: string | { id: string }) => (typeof x === 'string' ? x : x.id);

export const useMutableGraphData = (graphData: ForceDirectedGraphData) => {
	const [mutableGraphData, setMutableGraphData] = useState(graphData);

	useEffect(() => {
		setMutableGraphData((prev) => {
			// --- Reuse node instances when possible ---
			const prevNodeMap = new Map(prev.nodes.map((n) => [n.id, n]));
			const nextNodes: ForceDirectedGraphNode[] = graphData.nodes.map((n) => {
				const existing = prevNodeMap.get(n.id);
				if (existing) {
					// copy over mutable props; keep object identity
					existing.itemName = n.itemName;
					// copy other mutable props as needed
					return existing;
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
