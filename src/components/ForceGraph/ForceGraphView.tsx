'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import './ForceGraphView.scss';
import useResizeObserver from '~/hooks/UseResizeObserver';
import type { ForceDirectedGraphData } from './Common';
import { getAdditionOrder, getRemovalOrder } from '~/lib/NodeAnimationLayers';
import { useMutableGraphData } from './UseMutableGraphData';
import type { TransitionCallbacks, TransitionPhase } from '~/lib/ViewTransitions';
import dynamic from 'next/dynamic';
import type { ForceDirectedGraphProps } from './ForceDirectedGraph';

const ForceDirectedGraph = dynamic(() => import('./ForceDirectedGraph'), {
	ssr: false,
});

interface EnhancedForceGraphProps extends Omit<ForceDirectedGraphProps, 'nodeData'> {
	graphData: ForceDirectedGraphData;
	transitionPhase?: TransitionPhase;
	onRegisterCallbacks?: (callbacks: TransitionCallbacks) => void;
	overlay?: React.ReactNode;
}

export function ForceGraphView({
	graphData,
	transitionPhase = 'stable',
	onRegisterCallbacks,
	overlay,
	...additionalProps
}: EnhancedForceGraphProps) {
	const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
	const [isActive, setIsActive] = useState(false);
	const rect = useResizeObserver(containerRef ?? undefined);

	// Animation state: tracks which nodes are currently visible
	const [visibleNodes, setVisibleNodes] = useState<Set<string>>(() => new Set());
	const animationTimeouts = useRef<NodeJS.Timeout[]>([]);
	const starfieldFadeController = useRef<{
		fadeIn: (duration: number) => void;
		fadeOut: (duration: number) => void;
		resetAlpha: (alpha: number) => void;
	} | null>(null);

	// Calculate animation order once when graphData changes
	const nodeOrder = useMemo(
		() => ({
			addition: getAdditionOrder(graphData), // string[]
			removal: getRemovalOrder(graphData), // string[]
		}),
		[graphData],
	);

	// Clean up timeouts on unmount
	useEffect(() => {
		return () => {
			animationTimeouts.current.forEach(clearTimeout);
		};
	}, []);

	// Mount animation: activate on next render, cleanup on unmount
	useEffect(() => {
		const timeout = setTimeout(() => setIsActive(true), 0);
		return () => {
			clearTimeout(timeout);
		};
	}, []);

	// Update visible nodes when graphData changes (for initial render)
	useEffect(() => {
		if (transitionPhase === 'stable') {
			setVisibleNodes(new Set(graphData.nodes.map((n) => n.id)));
		}
	}, [graphData, transitionPhase]);

	// Helper to await starfield readiness
	const waitForStarfield = useCallback(() => {
		return new Promise<void>((resolve) => {
			const checkController = () => {
				if (starfieldFadeController.current) {
					resolve();
				} else {
					setTimeout(checkController, 10);
				}
			};
			checkController();
		});
	}, []);

	// Animation functions
	const animateNodesIn = async (duration: number) => {
		console.log('Animating nodes in');
		animationTimeouts.current.forEach(clearTimeout);
		animationTimeouts.current = [];
		setVisibleNodes(new Set());

		// Start starfield fade-in (80% of total duration) once controller is ready
		void (async () => {
			await waitForStarfield();
			starfieldFadeController.current?.fadeIn(duration * 0.8);
		})();

		const ids = nodeOrder.addition;
		const n = ids.length;
		const delayPer = n > 1 ? duration / (n - 1) : 0;

		// Detect component starts and micro-pair the first two ids of each component (same delay)
		const isComponentStart = new Set<string>();
		{
			const vis = new Set<string>();
			const adj = new Map<string, Set<string>>();
			graphData.nodes.forEach((n) => adj.set(n.id, new Set()));
			graphData.links.forEach((l) => {
				const s = typeof l.source === 'string' ? l.source : l.source.id;
				const t = typeof l.target === 'string' ? l.target : l.target.id;
				adj.get(s)?.add(t);
				adj.get(t)?.add(s);
			});
			for (let i = 0; i < ids.length; i++) {
				const v = ids[i];
				if (!v) continue;
				const touches = [...(adj.get(v) ?? [])].some((x) => vis.has(x));
				if (!touches) isComponentStart.add(v);
				vis.add(v);
			}
		}

		for (let i = 0; i < n; i++) {
			const id = ids[i];
			if (!id) continue;
			const delay = i * delayPer;

			// If this id starts a new component and the next id is its neighbour, schedule both at same delay
			if (isComponentStart.has(id) && i + 1 < n) {
				const a = id,
					b = ids[i + 1];
				if (!b) continue;
				const t = setTimeout(() => {
					setVisibleNodes((prev) => new Set([...prev, a, b]));
				}, delay);
				animationTimeouts.current.push(t);
				i++; // skip the neighbour we just scheduled
				continue;
			}

			const t = setTimeout(() => {
				setVisibleNodes((prev) => new Set([...prev, id]));
			}, delay);
			animationTimeouts.current.push(t);
		}
	};

	const animateNodesOut = async (duration: number) => {
		animationTimeouts.current.forEach(clearTimeout);
		animationTimeouts.current = [];

		setIsActive(false);

		// Ensure starfield is ready, then fade it out (80% of total duration)
		await waitForStarfield();
		starfieldFadeController.current?.fadeOut(duration * 0.8);

		const ids = nodeOrder.removal;
		const n = ids.length;
		const delayPer = n > 1 ? duration / (n - 1) : 0;

		ids.forEach((id, i) => {
			const t = setTimeout(() => {
				setVisibleNodes((prev) => {
					const next = new Set(prev);
					next.delete(id);
					return next;
				});
			}, i * delayPer);
			animationTimeouts.current.push(t);
		});
	};

	// Callback to capture starfield fade controller
	const onStarfieldReady = useCallback(
		(fadeController: {
			fadeIn: (duration: number) => void;
			fadeOut: (duration: number) => void;
			resetAlpha: (alpha: number) => void;
		}) => {
			starfieldFadeController.current = fadeController;

			// Set initial state based on transition phase
			if (transitionPhase === 'entering') {
				fadeController.resetAlpha(0);
			} else if (transitionPhase === 'stable') {
				fadeController.resetAlpha(1);
			}
		},
		[transitionPhase],
	);

	// Register transition callbacks
	useEffect(() => {
		if (onRegisterCallbacks) {
			onRegisterCallbacks({
				onTransitionIn: async (duration: number) => {
					// Ensure starfield starts from invisible state for entering transitions
					if (transitionPhase === 'entering') {
						starfieldFadeController.current?.resetAlpha(0);
					}
					await animateNodesIn(duration);
				},
				onTransitionOut: animateNodesOut,
			});
		}
	}, [onRegisterCallbacks, nodeOrder, transitionPhase]);

	const mutable = useMutableGraphData(graphData);

	// Create filtered graph data with only visible nodes
	const visibleGraphData = useMemo<ForceDirectedGraphData>(() => {
		const visible = new Set(visibleNodes);

		// Pick EXACT same objects from mutable.*
		const nodes = mutable.nodes.filter((n) => visible.has(n.id));

		const links = mutable.links
			.filter((l) => {
				const s = typeof l.source === 'string' ? l.source : l.source.id;
				const t = typeof l.target === 'string' ? l.target : l.target.id;
				return visible.has(s) && visible.has(t);
			})
			.sort((a, b) => a.id.localeCompare(b.id)); // stable order

		return { nodes, links };
	}, [mutable, visibleNodes]);

	return (
		<div
			className={`enhanced-force-graph ${isActive ? 'active' : ''} transition-phase-${transitionPhase} is-${transitionPhase}`}
			data-transition-phase={transitionPhase}
			ref={(node) => setContainerRef(node)}
		>
			<ForceDirectedGraph
				nodeData={visibleGraphData}
				width={rect?.width}
				height={rect?.height}
				dagMode={additionalProps.dagMode ?? undefined} // Allow override, default to undefined for timeline
				zoomPadding={{ top: 50, right: 50, bottom: 200, left: 50 }} // Extra bottom padding for chat
				{...additionalProps}
				backgroundColor="rgba(0, 0, 0, 0)"
				// Start visible for stable/exiting; start invisible for entering
				starfieldStartVisible={transitionPhase !== 'entering'}
				onStarfieldReady={onStarfieldReady}
			/>
			{overlay && (
				<div
					className={`force-graph-overlay transition-phase-${transitionPhase} is-${transitionPhase}`}
					data-transition-phase={transitionPhase}
				>
					{overlay}
				</div>
			)}
		</div>
	);
}
