import { useState, useEffect, useRef, useMemo } from 'react';
import { forceCollide } from 'd3-force-3d';
import { ForceGraphView } from '~/components/ForceGraph/ForceGraphView';
import { ProjectsGridView } from '~/components/ProjectsView/ProjectsGridView';
import { ProjectsCaseStudyView } from '~/components/ProjectsView/ProjectsCaseStudyView';
import SkillsMatrixView from '~/components/SkillsMatrixView/SkillsMatrixView';
import { ValuesEvidenceView } from '~/components/ValuesView/ValuesEvidenceView';
import { LandingView } from '~/components/LandingView/LandingView';
import { ResumeView } from '~/components/ResumeView/ResumeView';
import {
	type ViewInstanceState,
	type ViewTransitionState,
	type TransitionCallbacks,
	COMPONENT_TRANSITION_TIMINGS,
	createDataSnapshot,
} from '~/lib/ViewTransitions';
import { usePortfolioStore, graph } from '~/lib/PortfolioStore';
import './ViewTransitionManager.scss';
import './CompareLegends.scss';
import { FORCE_CONFIG } from '../ForceGraph/constants';
import type {
	CompareSkillsSnapshot,
	CompareProjectsSnapshot,
	CompareFrontendVsBackendSnapshot,
} from '~/lib/ViewTransitions';
import type { Directive } from '~/lib/ai/directiveTools';

// Inline legend components for compare views
function CompareSkillsLegend({ dataSnapshot }: { dataSnapshot: CompareSkillsSnapshot }) {
	return (
		<div className="compare-legend compare-legend--skills">
			<div className="compare-legend__container">
				<h2 className="compare-legend__title">Skills Comparison</h2>
				<div className="compare-legend__description">Comparing projects that use these skills</div>
				<div className="compare-legend__items">
					<div className="compare-legend__item compare-legend__item--left">
						<div className="compare-legend__color" style={{ backgroundColor: '#3b82f6' }}></div>
						<span>Left Skill</span>
					</div>
					<div className="compare-legend__item compare-legend__item--overlap">
						<div className="compare-legend__color" style={{ backgroundColor: '#8b5cf6' }}></div>
						<span>Overlap</span>
					</div>
					<div className="compare-legend__item compare-legend__item--right">
						<div className="compare-legend__color" style={{ backgroundColor: '#ef4444' }}></div>
						<span>Right Skill</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function CompareProjectsLegend({ dataSnapshot }: { dataSnapshot: CompareProjectsSnapshot }) {
	return (
		<div className="compare-legend compare-legend--projects">
			<div className="compare-legend__container">
				<h2 className="compare-legend__title">Projects Comparison</h2>
				<div className="compare-legend__description">Comparing skills used by these projects</div>
				<div className="compare-legend__items">
					<div className="compare-legend__item compare-legend__item--left">
						<div className="compare-legend__color" style={{ backgroundColor: '#3b82f6' }}></div>
						<span>Left Project</span>
					</div>
					<div className="compare-legend__item compare-legend__item--shared">
						<div className="compare-legend__color" style={{ backgroundColor: '#8b5cf6' }}></div>
						<span>Shared Skills</span>
					</div>
					<div className="compare-legend__item compare-legend__item--right">
						<div className="compare-legend__color" style={{ backgroundColor: '#ef4444' }}></div>
						<span>Right Project</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function CompareFrontendVsBackendLegend({ dataSnapshot }: { dataSnapshot: CompareFrontendVsBackendSnapshot }) {
	return (
		<div className="compare-legend compare-legend--spectrum">
			<div className="compare-legend__container">
				<h2 className="compare-legend__title">Frontend vs Backend</h2>
				<div className="compare-legend__description">Skills and projects across the development spectrum</div>
				<div className="compare-legend__items">
					<div className="compare-legend__item compare-legend__item--frontend">
						<div className="compare-legend__color" style={{ backgroundColor: '#10b981' }}></div>
						<span>Frontend</span>
					</div>
					<div className="compare-legend__item compare-legend__item--fullstack">
						<div className="compare-legend__color" style={{ backgroundColor: '#3b82f6' }}></div>
						<span>Full-stack</span>
					</div>
					<div className="compare-legend__item compare-legend__item--backend">
						<div className="compare-legend__color" style={{ backgroundColor: '#f59e0b' }}></div>
						<span>Backend</span>
					</div>
				</div>
			</div>
		</div>
	);
}

export function ViewTransitionManager() {
	const directive = usePortfolioStore((state) => state.directive);
	if (!directive) return null; // Wait until preloader/initializer sets a directive
	const currentMode = directive.mode;
	// Create initial data snapshot using utility (graph is static)
	const initialDataSnapshot = useMemo(() => createDataSnapshot(graph, directive), [directive]);

	const [transitionState, setTransitionState] = useState<ViewTransitionState>({
		instances: [
			{
				mode: currentMode,
				phase: 'entering',
				zIndex: 1,
				key: `${currentMode}-${Date.now()}`,
				dataSnapshot: initialDataSnapshot,
			},
		],
		isTransitioning: true,
	});

	// Debug: observe the current stable snapshot after any state change
	const stableSnapshot = useMemo(
		() => transitionState.instances.find((i) => i.phase === 'stable')?.dataSnapshot,
		[transitionState],
	);
	useEffect(() => {
		if (!stableSnapshot) return;
		const variant = 'variant' in stableSnapshot ? (stableSnapshot as any).variant : undefined;
		const highlights = (stableSnapshot as any)?.directive?.data?.highlights;
	}, [stableSnapshot]);

	const transitionCallbacks = useRef<Map<string, TransitionCallbacks>>(new Map());
	const transitionTimeouts = useRef<NodeJS.Timeout[]>([]);
	// Guard to suppress repeated transitions to the same target
	const lastTransitionKeyRef = useRef<string | null>(null);

	// Clean up timeouts on unmount
	useEffect(() => {
		return () => {
			transitionTimeouts.current.forEach(clearTimeout);
		};
	}, []);

	// Run an initial enter transition once on mount so first view animates in
	useEffect(() => {
		let cancelled = false;
		const waitForCallbacks = (key: string, timeoutMs = 300): Promise<void> => {
			const start = Date.now();
			return new Promise((resolve) => {
				const tick = () => {
					if (cancelled) return resolve();
					if (transitionCallbacks.current.has(key) || Date.now() - start > timeoutMs) {
						resolve();
					} else {
						setTimeout(tick, 16);
					}
				};
				tick();
			});
		};

		const run = async () => {
			const current = transitionState.instances[0];
			if (!current || current.phase !== 'entering') return;

			const enterTiming = COMPONENT_TRANSITION_TIMINGS[current.mode] || COMPONENT_TRANSITION_TIMINGS.landing;
			await waitForCallbacks(current.key);
			const callbacks = transitionCallbacks.current.get(current.key);
			if (callbacks) {
				await callbacks.onTransitionIn(enterTiming.in);
			}

			await new Promise((resolve) => {
				const timeout = setTimeout(resolve, enterTiming.in);
				transitionTimeouts.current.push(timeout);
			});

			if (cancelled) return;
			setTransitionState((prev) => ({
				instances: [
					{
						mode: prev.instances[0]?.mode ?? current.mode,
						phase: 'stable',
						zIndex: 1,
						key: prev.instances[0]?.key ?? current.key,
						dataSnapshot: prev.instances[0]?.dataSnapshot ?? current.dataSnapshot,
					},
				],
				isTransitioning: false,
			}));
		};

		run();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Handle directive changes (trigger transitions only on mode/variant change; otherwise update snapshot in place)
	useEffect(() => {
		const currentStableView = transitionState.instances.find((i) => i.phase === 'stable');
		if (!currentStableView) return;

		// Don't start a new transition while one is in progress
		if (transitionState.isTransitioning) return;

		const prevSnapshot = currentStableView.dataSnapshot;
		const prevMode = prevSnapshot.mode;
		const nextMode = directive.mode;

		// Only modes that actually have variants should be compared on variant changes
		const modesWithVariants = new Set<Directive['mode']>([
			'timeline',
			'projects',
			'skills',
			'values',
			'compare',
			'explore',
		]);
		const prevVariant =
			modesWithVariants.has(prevMode) && 'variant' in prevSnapshot
				? (prevSnapshot as { variant?: string }).variant
				: undefined;
		// Read variant from the new directive, but treat missing as "unchanged"
		const nextVariantRaw =
			modesWithVariants.has(nextMode) && 'variant' in directive.data
				? (directive.data as { variant?: string }).variant
				: undefined;

		// If mode or variant changed, start a transition (but avoid loops to same target)
		// Only transition if mode actually changes or variant is explicitly different
		if (prevMode !== nextMode || (nextVariantRaw !== undefined && prevVariant !== nextVariantRaw)) {
			const nextKey = `${nextMode}:${nextVariantRaw ?? prevVariant ?? ''}`;
			if (lastTransitionKeyRef.current === nextKey) {
				return;
			}
			lastTransitionKeyRef.current = nextKey;
			startTransition(nextMode);
			return;
		}

		// Same view; just refresh the snapshot to reflect intra-view directive changes (e.g., highlights, narration)
		// Skip if directive hasn't changed to avoid unnecessary state churn
		const prevDirective = prevSnapshot.directive;
		const directiveChanged = JSON.stringify(prevDirective) !== JSON.stringify(directive);
		if (!directiveChanged) {
			return;
		}
		const nextSnapshot = createDataSnapshot(graph, directive);
		setTransitionState((prev) => {
			const stableIdx = prev.instances.findIndex((i) => i.phase === 'stable');
			if (stableIdx === -1 || prev.isTransitioning) {
				return prev;
			}
			const prevStable = prev.instances[stableIdx]!;
			const updatedStable: ViewInstanceState = {
				mode: prevStable.mode,
				phase: prevStable.phase,
				zIndex: prevStable.zIndex,
				key: prevStable.key,
				dataSnapshot: nextSnapshot,
			};
			const instances = prev.instances.slice();
			instances[stableIdx] = updatedStable;
			return { ...prev, instances };
		});
	}, [directive, transitionState.isTransitioning]);

	const startTransition = async (newMode: Directive['mode']) => {
		const currentInstances = transitionState.instances;
		const stableInstance = currentInstances.find((i) => i.phase === 'stable');

		if (!stableInstance) return;

		// Create new incoming view instance with current directive snapshot
		const incomingInstance: ViewInstanceState = {
			mode: newMode,
			phase: 'entering',
			zIndex: 2,
			key: `${newMode}-${Date.now()}`,
			dataSnapshot: createDataSnapshot(graph, directive),
		};

		// Mark current as exiting
		const exitingInstance: ViewInstanceState = {
			...stableInstance,
			phase: 'exiting',
			zIndex: 1,
		};

		// Update state to show both views
		setTransitionState({
			instances: [exitingInstance, incomingInstance],
			isTransitioning: true,
		});

		// Get component-specific timings with fallback
		const exitTiming = COMPONENT_TRANSITION_TIMINGS[exitingInstance.mode] || COMPONENT_TRANSITION_TIMINGS.landing;
		const enterTiming = COMPONENT_TRANSITION_TIMINGS[incomingInstance.mode] || COMPONENT_TRANSITION_TIMINGS.landing;

		// Start exit transition
		const exitCallbacks = transitionCallbacks.current.get(exitingInstance.key);
		if (exitCallbacks) {
			await exitCallbacks.onTransitionOut(exitTiming.out);
		}

		// Wait for exit duration
		await new Promise((resolve) => {
			const timeout = setTimeout(resolve, exitTiming.out);
			transitionTimeouts.current.push(timeout);
		});

		// Start enter transition
		const enterCallbacks = transitionCallbacks.current.get(incomingInstance.key);
		if (enterCallbacks) {
			await enterCallbacks.onTransitionIn(enterTiming.in);
		}

		// Wait for enter duration
		await new Promise((resolve) => {
			const timeout = setTimeout(resolve, enterTiming.in);
			transitionTimeouts.current.push(timeout);
		});

		// Transition complete - keep only the new stable view
		setTransitionState({
			instances: [
				{
					mode: newMode,
					phase: 'stable',
					zIndex: 1,
					key: incomingInstance.key,
					dataSnapshot: incomingInstance.dataSnapshot,
				},
			],
			isTransitioning: false,
		});

		// Clean up callbacks for removed instance
		transitionCallbacks.current.delete(exitingInstance.key);
	};

	const registerTransitionCallbacks = (key: string, callbacks: TransitionCallbacks) => {
		transitionCallbacks.current.set(key, callbacks);
	};

	const renderViewComponent = (instance: ViewInstanceState) => {
		const commonProps = {
			transitionPhase: instance.phase,
			onRegisterCallbacks: (callbacks: TransitionCallbacks) =>
				registerTransitionCallbacks(instance.key, callbacks),
		};

		const { dataSnapshot } = instance;

		switch (dataSnapshot.mode) {
			case 'timeline':
				switch (dataSnapshot.variant) {
					case 'career':
						return (
							<ForceGraphView
								key={instance.key}
								graphData={dataSnapshot.forceGraphData}
								{...commonProps}
							/>
						);
					case 'projects':
						return (
							<ForceGraphView
								key={instance.key}
								graphData={dataSnapshot.forceGraphData}
								{...commonProps}
							/>
						);
					case 'skills':
						return (
							<ForceGraphView
								key={instance.key}
								graphData={dataSnapshot.forceGraphData}
								{...commonProps}
							/>
						);
				}

			case 'projects':
				switch (dataSnapshot.variant) {
					case 'grid':
						return <ProjectsGridView key={instance.key} dataSnapshot={dataSnapshot} {...commonProps} />;
					case 'radial':
						return (
							<ForceGraphView
								key={instance.key}
								graphData={dataSnapshot.forceGraphData}
								dagMode="radialout"
								dagLevelDistance={100}
								warmupTicks={80}
								cooldownTime={2000}
								onCollisionForceSetup={(forceGraphRef) => {
									// Custom collision setup with full access to force graph ref
									if (forceGraphRef) {
										forceGraphRef.d3Force('collision', forceCollide(FORCE_CONFIG.collisionRadius));
									}
								}}
								{...commonProps}
							/>
						);
					case 'case-study':
						return (
							<ProjectsCaseStudyView key={instance.key} dataSnapshot={dataSnapshot} {...commonProps} />
						);
				}

			case 'skills':
				switch (dataSnapshot.variant) {
					case 'clusters':
						return (
							<ForceGraphView
								key={instance.key}
								graphData={dataSnapshot.forceGraphData}
								{...commonProps}
							/>
						);
					case 'matrix':
						return (
							<SkillsMatrixView
								key={instance.key}
								matrix={dataSnapshot.matrix}
								highlights={dataSnapshot.directive.data.highlights}
								background="gradient-neutral"
								// Available options: 'none', 'gradient-neutral', 'gradient-colored', 'gradient-fade',
								// 'pattern-dots', 'pattern-grid', 'pattern-diagonal', 'pattern-noise', 'floating-icons'
								{...commonProps}
							/>
						);
				}
				break;

			case 'values':
				switch (dataSnapshot.variant) {
					case 'mindmap':
						return (
							<ForceGraphView
								key={instance.key}
								graphData={dataSnapshot.forceGraphData}
								warmupTicks={4}
								onCollisionForceSetup={(forceGraphRef) => {
									if (forceGraphRef) {
										// Custom collision radii based on node type
										forceGraphRef.d3Force(
											'collision',
											forceCollide<
												{ type?: string } & {
													index?: number;
													x?: number;
													y?: number;
													z?: number;
													vx?: number;
													vy?: number;
													vz?: number;
												}
											>().radius((n) => {
												switch (n.type) {
													case 'person':
														return 30; // Person node (center) - largest
													case 'value':
														return 26; // Value nodes - large
													case 'project':
														return 20; // Project evidence - medium
													case 'story':
														return 18; // Story evidence - medium
													case 'role':
														return 18; // Role evidence - medium
													case 'tag':
														return 12; // Tag nodes - small
													default:
														return 14; // Default - small
												}
											}),
										);
										// Set up mild charge for organic layout
										forceGraphRef.d3Force('charge')?.strength(-100);
										// Set up link distances (person→value stronger, value→evidence softer)
										forceGraphRef
											.d3Force('link')
											?.distance((l: { rel?: string }) => (l.rel === 'values' ? 110 : 80))
											.strength((l: { rel?: string }) => (l.rel === 'values' ? 0.6 : 0.3));
									}
								}}
								{...commonProps}
							/>
						);
					case 'evidence':
						return <ValuesEvidenceView key={instance.key} dataSnapshot={dataSnapshot} {...commonProps} />;
				}
				break;

			case 'compare':
				switch (dataSnapshot.variant) {
					case 'skills':
						return (
							<ForceGraphView
								key={instance.key}
								graphData={dataSnapshot.forceGraphData}
								overlay={<CompareSkillsLegend dataSnapshot={dataSnapshot} />}
								{...commonProps}
							/>
						);
					case 'projects':
						return (
							<ForceGraphView
								key={instance.key}
								graphData={dataSnapshot.forceGraphData}
								overlay={<CompareProjectsLegend dataSnapshot={dataSnapshot} />}
								{...commonProps}
							/>
						);
					case 'frontend-vs-backend':
						return (
							<ForceGraphView
								key={instance.key}
								graphData={dataSnapshot.forceGraphData}
								overlay={<CompareFrontendVsBackendLegend dataSnapshot={dataSnapshot} />}
								{...commonProps}
							/>
						);
				}

			case 'explore':
				switch (dataSnapshot.variant) {
					case 'all':
						// TODO: Create ExploreAllView component
						return (
							<ForceGraphView
								key={instance.key}
								graphData={dataSnapshot.forceGraphData}
								{...commonProps}
							/>
						);
					case 'filtered':
						// TODO: Create ExploreFilteredView component
						return (
							<ForceGraphView
								key={instance.key}
								graphData={dataSnapshot.forceGraphData}
								{...commonProps}
							/>
						);
				}
				break;

			case 'landing':
				return <LandingView key={instance.key} {...commonProps} />;

			case 'resume':
				// TODO: Create or enhance ResumeView component to use dataSnapshot.resumeData
				return <ResumeView key={instance.key} {...commonProps} />;

			default:
				// Fallback
				return <LandingView key={instance.key} {...commonProps} />;
		}
	};

	return (
		<div className="view-transition-manager">
			{transitionState.instances.map((instance) => (
				<div
					key={instance.key}
					className={`view-instance view-instance--${instance.phase}`}
					style={{ zIndex: instance.zIndex }}
				>
					{renderViewComponent(instance)}
				</div>
			))}
		</div>
	);
}
