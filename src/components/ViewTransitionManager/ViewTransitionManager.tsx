import { useState, useEffect, useRef, useMemo } from 'react';
import { forceCollide } from 'd3-force-3d';
import { ForceGraphView } from '~/components/ForceGraph/ForceGraphView';
import { ProjectsGridView } from '~/components/ProjectsView/ProjectsGridView';
import { ProjectsCaseStudyView } from '~/components/ProjectsView/ProjectsCaseStudyView';
import { SkillsView } from '~/components/SkillsView/SkillsView';
import SkillsMatrixView from '~/components/SkillsMatrixView/SkillsMatrixView';
import { ValuesView } from '~/components/ValuesView/ValuesView';
import { ValuesEvidenceView } from '~/components/ValuesView/ValuesEvidenceView';
import { CompareView } from '~/components/CompareView/CompareView';
import { LandingView } from '~/components/LandingView/LandingView';
import { ResumeView } from '~/components/ResumeView/ResumeView';
import {
	type ViewInstanceState,
	type ViewTransitionState,
	type TransitionCallbacks,
	COMPONENT_TRANSITION_TIMINGS,
	createDataSnapshot,
} from '~/lib/ViewTransitions';
import type { Graph } from '~/lib/PortfolioStore';
import './ViewTransitionManager.scss';
import type { Directive } from '~/lib/ai/directiveTools';
import { FORCE_CONFIG } from '../ForceGraph/constants';

interface ViewTransitionManagerProps {
	directive: Directive;
	graph: Graph;
}

export function ViewTransitionManager({ directive, graph }: ViewTransitionManagerProps) {
	const currentMode = directive.mode;
	// Create initial data snapshot using utility
	const initialDataSnapshot = useMemo(() => createDataSnapshot(graph, directive), [graph, directive]);

	const [transitionState, setTransitionState] = useState<ViewTransitionState>({
		instances: [
			{
				mode: currentMode,
				phase: 'stable',
				zIndex: 1,
				key: `${currentMode}-${Date.now()}`,
				dataSnapshot: initialDataSnapshot,
			},
		],
		isTransitioning: false,
	});

	const transitionCallbacks = useRef<Map<string, TransitionCallbacks>>(new Map());
	const transitionTimeouts = useRef<NodeJS.Timeout[]>([]);

	// Clean up timeouts on unmount
	useEffect(() => {
		return () => {
			transitionTimeouts.current.forEach(clearTimeout);
		};
	}, []);

	// Handle directive changes (including mode and variant changes)
	useEffect(() => {
		const currentStableView = transitionState.instances.find((i) => i.phase === 'stable');

		// Compare the full directive, not just the mode
		if (!currentStableView || transitionState.isTransitioning) {
			return;
		}

		// Check if this is a meaningful change that requires a transition
		const needsTransition =
			currentStableView.mode !== currentMode ||
			JSON.stringify(currentStableView.dataSnapshot) !== JSON.stringify(createDataSnapshot(graph, directive));

		if (needsTransition) {
			startTransition(currentMode);
		}
	}, [directive, graph]);

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
						// TODO: Create ValuesMindmapView component
						return (
							<ForceGraphView
								key={instance.key}
								graphData={dataSnapshot.forceGraphData}
								{...commonProps}
							/>
						);
					case 'evidence':
						return <ValuesEvidenceView key={instance.key} {...commonProps} />;
				}
				break;

			case 'compare':
				switch (dataSnapshot.variant) {
					case 'skills':
						// TODO: Create CompareSkillsView component
						return <LandingView key={instance.key} {...commonProps} />; // Placeholder
					case 'projects':
						// TODO: Create CompareProjectsView component
						return <LandingView key={instance.key} {...commonProps} />; // Placeholder
					case 'frontend-vs-backend':
						// TODO: Create CompareFrontendVsBackendView component
						return <LandingView key={instance.key} {...commonProps} />; // Placeholder
				}
				break;

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
