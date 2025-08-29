import { useState, useEffect, useRef, useMemo } from 'react';
import { ForceGraphView } from '~/components/ForceGraph/ForceGraphView';
import { ProjectsView } from '~/components/ProjectsView/ProjectsView';
import { SkillsView } from '~/components/SkillsView/SkillsView';
import { ValuesView } from '~/components/ValuesView/ValuesView';
import { CompareView } from '~/components/CompareView/CompareView';
import { LandingView } from '~/components/LandingView/LandingView';
import {
	type ViewInstanceState,
	type ViewTransitionState,
	type TransitionCallbacks,
	COMPONENT_TRANSITION_TIMINGS,
	createDataSnapshot,
} from '~/lib/ViewTransitions';
import type { DirectiveType } from '~/lib/DirectiveTool';
import type { Graph } from '~/lib/PortfolioStore';
import './ViewTransitionManager.scss';

interface ViewTransitionManagerProps {
	currentMode: DirectiveType['mode'];
	graph: Graph;
	directive: DirectiveType;
}

export function ViewTransitionManager({ currentMode, graph, directive }: ViewTransitionManagerProps) {
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

	// Handle mode changes
	useEffect(() => {
		const currentStableView = transitionState.instances.find((i) => i.phase === 'stable')?.mode;

		if (currentStableView === currentMode || transitionState.isTransitioning) {
			return;
		}

		startTransition(currentMode);
	}, [currentMode]);

	const startTransition = async (newMode: DirectiveType['mode']) => {
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

		// Get component-specific timings
		const exitTiming = COMPONENT_TRANSITION_TIMINGS[exitingInstance.mode];
		const enterTiming = COMPONENT_TRANSITION_TIMINGS[incomingInstance.mode];

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

		switch (instance.mode) {
			case 'landing':
				return <LandingView key={instance.key} {...commonProps} />;
			case 'projects':
				return <ProjectsView key={instance.key} {...commonProps} />;
			case 'skills':
				return <SkillsView key={instance.key} {...commonProps} />;
			case 'values':
				return <ValuesView key={instance.key} {...commonProps} />;
			case 'compare':
				return <CompareView key={instance.key} {...commonProps} />;
			case 'timeline':
			case 'play':
			default:
				// Use the instance's snapshot data (now required)
				return (
					<ForceGraphView
						key={instance.key}
						graphData={instance.dataSnapshot.forceGraphData}
						mode={instance.mode}
						{...commonProps}
					/>
				);
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
