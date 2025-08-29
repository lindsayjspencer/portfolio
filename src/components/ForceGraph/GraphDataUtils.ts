import type { ForceDirectedGraphNode, ForceDirectedGraphLink, ForceDirectedGraphData } from './Common';

export class GraphDataUtils {
	/**
	 * Calculates which links should be involved in highlighting based on selected nodes
	 */
	static getLinksInvolvedInHighlight(graphData: ForceDirectedGraphData, selectedNodes: Set<string>): Set<string> {
		const links: Set<string> = new Set();

		graphData.links.forEach((link) => {
			const { source, target } = link;
			const sourceId = typeof source === 'string' ? source : (source as ForceDirectedGraphNode).id;
			const targetId = typeof target === 'string' ? target : (target as ForceDirectedGraphNode).id;

			if (selectedNodes.has(sourceId) || selectedNodes.has(targetId)) {
				links.add(link.id);
			}
		});

		return links;
	}

	/**
	 * Filters nodes by type
	 */
	static getNodesByType(graphData: ForceDirectedGraphData, nodeType: string): ForceDirectedGraphNode[] {
		return graphData.nodes.filter((node) => node.type === nodeType);
	}

	/**
	 * Finds a node by its ID
	 */
	static findNodeById(graphData: ForceDirectedGraphData, nodeId: string): ForceDirectedGraphNode | undefined {
		return graphData.nodes.find((node) => node.id === nodeId);
	}

	/**
	 * Gets all links connected to a specific node
	 */
	static getLinksForNode(graphData: ForceDirectedGraphData, nodeId: string): ForceDirectedGraphLink[] {
		return graphData.links.filter((link) => {
			const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
			const targetId = typeof link.target === 'string' ? link.target : link.target.id;
			return sourceId === nodeId || targetId === nodeId;
		});
	}

	/**
	 * Gets all neighbors of a specific node
	 */
	static getNeighbors(graphData: ForceDirectedGraphData, nodeId: string): ForceDirectedGraphNode[] {
		const neighborIds = new Set<string>();

		graphData.links.forEach((link) => {
			const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
			const targetId = typeof link.target === 'string' ? link.target : link.target.id;

			if (sourceId === nodeId) {
				neighborIds.add(targetId);
			} else if (targetId === nodeId) {
				neighborIds.add(sourceId);
			}
		});

		return graphData.nodes.filter((node) => neighborIds.has(node.id));
	}

	/**
	 * Calculates graph statistics
	 */
	static getGraphStats(graphData: ForceDirectedGraphData) {
		const nodesByType = new Map<string, number>();
		const linksByType = new Map<string, number>();

		graphData.nodes.forEach((node) => {
			const count = nodesByType.get(node.type) || 0;
			nodesByType.set(node.type, count + 1);
		});

		graphData.links.forEach((link) => {
			const linkType = link.rel;
			const count = linksByType.get(linkType) || 0;
			linksByType.set(linkType, count + 1);
		});

		return {
			totalNodes: graphData.nodes.length,
			totalLinks: graphData.links.length,
			nodesByType: Object.fromEntries(nodesByType),
			linksByType: Object.fromEntries(linksByType),
		};
	}

	/**
	 * Validates graph data structure
	 */
	static validateGraphData(graphData: ForceDirectedGraphData): {
		isValid: boolean;
		errors: string[];
	} {
		const errors: string[] = [];

		// Check for duplicate node IDs
		const nodeIds = new Set<string>();
		graphData.nodes.forEach((node, index) => {
			if (!node.id) {
				errors.push(`Node at index ${index} is missing an ID`);
			} else if (nodeIds.has(node.id)) {
				errors.push(`Duplicate node ID found: ${node.id}`);
			} else {
				nodeIds.add(node.id);
			}
		});

		// Check for duplicate link IDs
		const linkIds = new Set<string>();
		graphData.links.forEach((link, index) => {
			if (!link.id) {
				errors.push(`Link at index ${index} is missing an ID`);
			} else if (linkIds.has(link.id)) {
				errors.push(`Duplicate link ID found: ${link.id}`);
			} else {
				linkIds.add(link.id);
			}
		});

		// Check that all link references point to existing nodes
		graphData.links.forEach((link, index) => {
			const sourceId = typeof link.source === 'string' ? link.source : (link.source as ForceDirectedGraphNode).id;
			const targetId = typeof link.target === 'string' ? link.target : (link.target as ForceDirectedGraphNode).id;

			if (!nodeIds.has(sourceId)) {
				errors.push(`Link at index ${index} references non-existent source node: ${sourceId}`);
			}
			if (!nodeIds.has(targetId)) {
				errors.push(`Link at index ${index} references non-existent target node: ${targetId}`);
			}
		});

		return {
			isValid: errors.length === 0,
			errors,
		};
	}
}
