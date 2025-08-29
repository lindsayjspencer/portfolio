declare module 'd3-force-3d' {
	// Node interface that the force expects
	interface ForceNode {
		index?: number;
		x?: number;
		y?: number;
		z?: number;
		vx?: number;
		vy?: number;
		vz?: number;
	}

	// Radius function type
	type RadiusFunction<NodeType extends ForceNode = ForceNode> = (
		node: NodeType,
		index: number,
		nodes: NodeType[],
	) => number;

	// Force interface
	interface Force<NodeType extends ForceNode = ForceNode> {
		(alpha: number): void;
		initialize(nodes: NodeType[], ...args: Array<(() => number) | number>): void;
	}

	// Collide force interface
	interface CollideForce<NodeType extends ForceNode = ForceNode> extends Force<NodeType> {
		/**
		 * Sets the number of iterations per application to the specified number and returns this force.
		 * Increasing the number of iterations greatly increases the rigidity of the constraint and
		 * avoids partial overlap of nodes, but also increases the runtime cost to evaluate the force.
		 */
		iterations(): number;
		iterations(iterations: number): this;

		/**
		 * Sets the force strength to the specified number in the range [0,1] and returns this force.
		 * Overlapping nodes are resolved through iterative relaxation. For each node, the other nodes
		 * that are anticipated to overlap at the next time step (using the anticipated positions ⟨x + vx, y + vy⟩)
		 * are determined; the node's velocity is then modified to push the node out of each overlapping node.
		 */
		strength(): number;
		strength(strength: number): this;

		/**
		 * Sets the radius accessor to the specified function, re-evaluates the radius accessor
		 * for each node, and returns this force.
		 */
		radius(): RadiusFunction<NodeType>;
		radius(radius: number | RadiusFunction<NodeType>): this;
	}

	/**
	 * Creates a new collision force with the specified radius.
	 * If radius is not specified, it defaults to the constant function that returns 1 for all nodes.
	 * If radius is specified as a number, it is converted to a constant function that returns that number.
	 * If radius is specified as a function, it is invoked for each node in the simulation, being passed the node,
	 * its zero-based index, and the array of all nodes, and must return a number.
	 */
	export function forceCollide<NodeType extends ForceNode = ForceNode>(
		radius?: number | null | RadiusFunction<NodeType>,
	): CollideForce<NodeType>;
}
