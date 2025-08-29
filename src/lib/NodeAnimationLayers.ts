import type { ForceDirectedGraphData } from '~/components/ForceGraph/Common';

type Id = string;
const idOf = (x: string | { id: string }) => (typeof x === 'string' ? x : x.id);

function buildAdj(data: ForceDirectedGraphData): Map<Id, Set<Id>> {
	const adj = new Map<Id, Set<Id>>();
	data.nodes.forEach((n) => adj.set(n.id, new Set()));
	for (const l of data.links) {
		const s = idOf(l.source),
			t = idOf(l.target);
		if (!adj.has(s) || !adj.has(t)) continue;
		adj.get(s)!.add(t);
		adj.get(t)!.add(s);
	}
	return adj;
}

/** Order for addition: one id per step; only the *first* two ids of each component are adjacent */
export function getAdditionOrder(data: ForceDirectedGraphData): Id[] {
	if (!data.nodes.length) return [];
	const adj = buildAdj(data);
	const all = data.nodes.map((n) => n.id);
	const seen = new Set<Id>();
	const order: Id[] = [];

	for (const start of all) {
		if (seen.has(start)) continue;

		// seed this component with an adjacent pair if possible
		seen.add(start);
		const neigh = [...(adj.get(start) ?? [])].find((v) => !seen.has(v));
		if (neigh) {
			seen.add(neigh);
			order.push(start, neigh);
		} else {
			order.push(start);
		}

		// BFS to add the rest, one by one
		const q: Id[] = neigh ? [start, neigh] : [start];
		while (q.length) {
			const u = q.shift()!;
			for (const v of adj.get(u) ?? [])
				if (!seen.has(v)) {
					seen.add(v);
					q.push(v);
					order.push(v);
				}
		}
	}

	return order;
}

/** True leaf-first removal flattened to single-node steps */
export function getRemovalOrder(data: ForceDirectedGraphData): Id[] {
	if (!data.nodes.length) return [];
	const adj = buildAdj(data);
	const alive = new Set<Id>(data.nodes.map((n) => n.id));
	const deg = new Map<Id, number>();
	for (const v of alive) deg.set(v, [...(adj.get(v) ?? [])].filter((x) => alive.has(x)).length);

	const steps: Id[] = [];
	let frontier = [...alive].filter((v) => (deg.get(v) ?? 0) <= 1);

	while (alive.size) {
		if (!frontier.length) {
			// core remains
			for (const v of alive) steps.push(v);
			break;
		}
		for (const v of frontier) {
			steps.push(v);
			alive.delete(v);
		}
		const next = new Set<Id>();
		for (const v of frontier)
			for (const w of adj.get(v) ?? [])
				if (alive.has(w)) {
					deg.set(w, (deg.get(w) ?? 1) - 1);
					if ((deg.get(w) ?? 0) === 1) next.add(w);
				}
		frontier = [...next];
	}
	return steps;
}
