import { useState, useEffect, useRef, useCallback, type SetStateAction } from 'react';
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
	type TransitionDecision,
	type TransitionCallbacks,
	COMPONENT_TRANSITION_TIMINGS,
	createDataSnapshot,
	getTransitionDecision,
} from '~/lib/ViewTransitions';
import { usePortfolioStore, graph } from '~/lib/PortfolioStore';
import './ViewTransitionManager.scss';
import './CompareLegends.scss';
import { FORCE_CONFIG } from '../ForceGraph/constants';
import { getDirectiveViewKey, type Directive } from '~/lib/ai/directiveTools';

function CompareSkillsLegend() {
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

function CompareProjectsLegend() {
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

function CompareFrontendVsBackendLegend() {
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

type ChargeForceLike = {
	strength: (value: number) => ChargeForceLike;
};

type LinkForceLike = {
	distance: (value: number | ((link: { rel?: string }) => number)) => LinkForceLike;
	strength: (value: number | ((link: { rel?: string }) => number)) => LinkForceLike;
};

type TransitionDebugEntry = {
	id: string;
	at: string;
	event: string;
	details?: Record<string, unknown>;
};

const DEBUG_QUERY_KEY = 'debugTransitions';
const DEBUG_STORAGE_KEY = 'portfolio:debug-transitions';

function isChargeForce(force: unknown): force is ChargeForceLike {
	return (
		typeof force === 'object' &&
		force !== null &&
		'strength' in force &&
		typeof force.strength === 'function'
	);
}

function isLinkForce(force: unknown): force is LinkForceLike {
	return (
		typeof force === 'object' &&
		force !== null &&
		'distance' in force &&
		typeof force.distance === 'function' &&
		'strength' in force &&
		typeof force.strength === 'function'
	);
}

export function ViewTransitionManager() {
	const directive = usePortfolioStore((state) => state.directive);

	const [transitionState, setTransitionState] = useState<ViewTransitionState>(() => {
		const initialDataSnapshot = createDataSnapshot(graph, directive);
		return {
			instances: [
				{
					mode: directive.mode,
					phase: 'entering',
					zIndex: 1,
					key: `${directive.mode}-${Date.now()}`,
					dataSnapshot: initialDataSnapshot,
				},
			],
			isTransitioning: true,
		};
	});
	const [debugEnabled, setDebugEnabled] = useState(false);
	const [debugEvents, setDebugEvents] = useState<TransitionDebugEntry[]>([]);

	const transitionStateRef = useRef(transitionState);
	const transitionCallbacks = useRef<Map<string, TransitionCallbacks>>(new Map());
	const transitionCallbackRegistrars = useRef<Map<string, (callbacks: TransitionCallbacks) => void>>(new Map());
	const transitionTimeouts = useRef<NodeJS.Timeout[]>([]);
	const lastTransitionKeyRef = useRef<string | null>(null);
	const isUnmountedRef = useRef(false);
	const lastDecisionRef = useRef<TransitionDecision | null>(null);

	useEffect(() => {
		transitionStateRef.current = transitionState;
	}, [transitionState]);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const params = new URLSearchParams(window.location.search);
		const queryValue = params.get(DEBUG_QUERY_KEY);
		if (queryValue === '1') {
			window.localStorage.setItem(DEBUG_STORAGE_KEY, '1');
		} else if (queryValue === '0') {
			window.localStorage.removeItem(DEBUG_STORAGE_KEY);
		}

		const stored = window.localStorage.getItem(DEBUG_STORAGE_KEY) === '1';
		setDebugEnabled(queryValue === '1' || (queryValue !== '0' && stored));
	}, []);

	const pushDebug = useCallback(
		(event: string, details?: Record<string, unknown>) => {
			if (!debugEnabled) {
				return;
			}

			const entry: TransitionDebugEntry = {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				at: new Date().toISOString(),
				event,
				details,
			};

			setDebugEvents((prev) => [entry, ...prev].slice(0, 12));
			console.debug('[transition-debug]', event, details ?? {});

			if (typeof window !== 'undefined') {
				const debugWindow = window as Window & { __portfolioTransitionDebug?: TransitionDebugEntry[] };
				debugWindow.__portfolioTransitionDebug = [entry, ...(debugWindow.__portfolioTransitionDebug ?? [])].slice(
					0,
					50,
				);
			}
		},
		[debugEnabled],
	);

	useEffect(() => {
		pushDebug('state-updated', {
			isTransitioning: transitionState.isTransitioning,
			instances: transitionState.instances.map((instance) => ({
				key: instance.key,
				mode: instance.mode,
				phase: instance.phase,
				zIndex: instance.zIndex,
			})),
		});
	}, [pushDebug, transitionState]);

	const setManagedTransitionState = useCallback((updater: SetStateAction<ViewTransitionState>) => {
		setTransitionState((prev) => {
			const next = typeof updater === 'function' ? updater(prev) : updater;
			transitionStateRef.current = next;
			return next;
		});
	}, []);

	const clearTransitionTimeouts = useCallback(() => {
		transitionTimeouts.current.forEach(clearTimeout);
		transitionTimeouts.current = [];
	}, []);

	const waitForDuration = useCallback((duration: number) => {
		return new Promise<void>((resolve) => {
			const timeout = setTimeout(() => {
				transitionTimeouts.current = transitionTimeouts.current.filter((tracked) => tracked !== timeout);
				resolve();
			}, duration);
			transitionTimeouts.current.push(timeout);
		});
	}, []);

	const waitForCallbacks = useCallback(
		async (key: string, timeoutMs = 300) => {
			const start = Date.now();
			while (
				!isUnmountedRef.current &&
				!transitionCallbacks.current.has(key) &&
				Date.now() - start <= timeoutMs
			) {
				await waitForDuration(16);
			}

			pushDebug('callbacks-ready-check', {
				key,
				found: transitionCallbacks.current.has(key),
				waitedMs: Date.now() - start,
			});
		},
		[pushDebug, waitForDuration],
	);

	const getTransitionTiming = useCallback(
		(mode: Directive['mode']) => COMPONENT_TRANSITION_TIMINGS[mode] ?? COMPONENT_TRANSITION_TIMINGS.landing,
		[],
	);

	const finalizeStableInstance = useCallback(
		(instance: ViewInstanceState) => {
			pushDebug('finalize-stable', {
				key: instance.key,
				mode: instance.mode,
			});
			setManagedTransitionState({
				instances: [
					{
						...instance,
						phase: 'stable',
						zIndex: 1,
					},
				],
				isTransitioning: false,
			});
		},
		[pushDebug, setManagedTransitionState],
	);

	useEffect(() => {
		const callbackRegistrars = transitionCallbackRegistrars.current;
		isUnmountedRef.current = false;
		pushDebug('manager-mounted');
		return () => {
			isUnmountedRef.current = true;
			pushDebug('manager-unmounted');
			clearTransitionTimeouts();
			callbackRegistrars.clear();
		};
	}, [clearTransitionTimeouts, pushDebug]);

	useEffect(() => {
		const runInitialEnter = async () => {
			const current = transitionStateRef.current.instances[0];
			if (current?.phase !== 'entering') {
				return;
			}

			pushDebug('initial-enter-start', {
				key: current.key,
				mode: current.mode,
			});
			const enterTiming = getTransitionTiming(current.mode);
			await waitForCallbacks(current.key);
			if (isUnmountedRef.current) {
				pushDebug('initial-enter-aborted', { reason: 'unmounted' });
				return;
			}

			const callbacks = transitionCallbacks.current.get(current.key);
			if (callbacks) {
				pushDebug('initial-enter-callback', { key: current.key, duration: enterTiming.in });
				await callbacks.onTransitionIn(enterTiming.in);
			}

			await waitForDuration(enterTiming.in);
			if (isUnmountedRef.current) {
				pushDebug('initial-enter-aborted', { reason: 'unmounted-after-wait' });
				return;
			}

			finalizeStableInstance(current);
		};

		void runInitialEnter();
	}, [finalizeStableInstance, getTransitionTiming, pushDebug, waitForCallbacks, waitForDuration]);

	const startTransition = useCallback(
		async (nextDirective: Directive) => {
			const currentState = transitionStateRef.current;
			if (currentState.isTransitioning) {
				return;
			}

			const stableInstance = currentState.instances.find((instance) => instance.phase === 'stable');
			if (!stableInstance) {
				pushDebug('transition-skipped', { reason: 'no-stable-instance' });
				return;
			}

			const incomingInstance: ViewInstanceState = {
				mode: nextDirective.mode,
				phase: 'entering',
				zIndex: 2,
				key: `${nextDirective.mode}-${Date.now()}`,
				dataSnapshot: createDataSnapshot(graph, nextDirective),
			};

			const exitingInstance: ViewInstanceState = {
				...stableInstance,
				phase: 'exiting',
				zIndex: 1,
			};

			setManagedTransitionState({
				instances: [exitingInstance, incomingInstance],
				isTransitioning: true,
			});
			pushDebug('transition-start', {
				from: exitingInstance.key,
				to: incomingInstance.key,
				fromMode: exitingInstance.mode,
				toMode: incomingInstance.mode,
			});

			const exitTiming = getTransitionTiming(exitingInstance.mode);
			const enterTiming = getTransitionTiming(incomingInstance.mode);

			try {
				const exitCallbacks = transitionCallbacks.current.get(exitingInstance.key);
				if (exitCallbacks) {
					pushDebug('transition-exit-callback', {
						key: exitingInstance.key,
						duration: exitTiming.out,
					});
					await exitCallbacks.onTransitionOut(exitTiming.out);
				}
				await waitForDuration(exitTiming.out);
				if (isUnmountedRef.current) {
					pushDebug('transition-aborted', { reason: 'unmounted-after-exit' });
					return;
				}

				await waitForCallbacks(incomingInstance.key);
				if (isUnmountedRef.current) {
					return;
				}

				const enterCallbacks = transitionCallbacks.current.get(incomingInstance.key);
				if (enterCallbacks) {
					pushDebug('transition-enter-callback', {
						key: incomingInstance.key,
						duration: enterTiming.in,
					});
					await enterCallbacks.onTransitionIn(enterTiming.in);
				}
				await waitForDuration(enterTiming.in);
				if (isUnmountedRef.current) {
					pushDebug('transition-aborted', { reason: 'unmounted-after-enter' });
					return;
				}

				finalizeStableInstance(incomingInstance);
			} catch (error) {
				console.error('View transition failed:', error);
				pushDebug('transition-error', {
					message: error instanceof Error ? error.message : 'unknown error',
				});
				if (!isUnmountedRef.current) {
					finalizeStableInstance(incomingInstance);
				}
			} finally {
				transitionCallbacks.current.delete(exitingInstance.key);
				transitionCallbackRegistrars.current.delete(exitingInstance.key);
				lastTransitionKeyRef.current = null;
			}
		},
		[finalizeStableInstance, getTransitionTiming, pushDebug, setManagedTransitionState, waitForCallbacks, waitForDuration],
	);

	useEffect(() => {
		const currentState = transitionStateRef.current;
		const currentStableView = currentState.instances.find((instance) => instance.phase === 'stable');
		if (!currentStableView || currentState.isTransitioning) {
			if (!currentStableView) {
				pushDebug('directive-evaluation-skipped', { reason: 'no-stable-view' });
			}
			return;
		}

		const prevDirective = currentStableView.dataSnapshot.directive;
		const nextDirective = directive;
		const decision = getTransitionDecision(prevDirective, nextDirective);
		lastDecisionRef.current = decision;
		pushDebug('directive-evaluated', {
			prevViewKey: getDirectiveViewKey(prevDirective),
			nextViewKey: getDirectiveViewKey(nextDirective),
			reason: decision.reason,
			shouldTransition: decision.shouldTransition,
		});

		if (decision.shouldTransition) {
			const nextKey = `${getDirectiveViewKey(nextDirective)}:${decision.nextSignature}`;
			if (lastTransitionKeyRef.current === nextKey) {
				pushDebug('transition-suppressed', { reason: 'duplicate-target', nextKey });
				return;
			}
			lastTransitionKeyRef.current = nextKey;
			void startTransition(nextDirective);
			return;
		}

		const nextSnapshot = createDataSnapshot(graph, nextDirective);
		pushDebug('snapshot-updated-in-place', {
			viewKey: getDirectiveViewKey(nextDirective),
			reason: decision.reason,
		});
		setManagedTransitionState((prev) => {
			const stableIdx = prev.instances.findIndex((instance) => instance.phase === 'stable');
			if (stableIdx === -1 || prev.isTransitioning) {
				return prev;
			}

			const stableInstance = prev.instances[stableIdx];
			if (!stableInstance) {
				return prev;
			}

			const instances = prev.instances.slice();
			instances[stableIdx] = { ...stableInstance, dataSnapshot: nextSnapshot };
			return { ...prev, instances };
		});
	}, [directive, pushDebug, setManagedTransitionState, startTransition, transitionState.isTransitioning]);

	const registerTransitionCallbacks = useCallback((key: string, callbacks: TransitionCallbacks) => {
		transitionCallbacks.current.set(key, callbacks);
		pushDebug('callbacks-registered', { key });
	}, [pushDebug]);

	const getCallbackRegistrar = useCallback(
		(key: string) => {
			const existing = transitionCallbackRegistrars.current.get(key);
			if (existing) {
				return existing;
			}

			const registrar = (callbacks: TransitionCallbacks) => {
				registerTransitionCallbacks(key, callbacks);
			};
			transitionCallbackRegistrars.current.set(key, registrar);
			return registrar;
		},
		[registerTransitionCallbacks],
	);

	const renderViewComponent = (instance: ViewInstanceState) => {
		const commonProps = {
			transitionPhase: instance.phase,
			onRegisterCallbacks: getCallbackRegistrar(instance.key),
		};

		const { dataSnapshot } = instance;

		switch (dataSnapshot.mode) {
			case 'timeline':
				switch (dataSnapshot.variant) {
					case 'career':
					case 'projects':
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
					case 'technical':
					case 'soft':
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
											>().radius((node) => {
												switch (node.type) {
													case 'person':
														return 30;
													case 'value':
														return 26;
													case 'project':
														return 20;
													case 'story':
													case 'role':
														return 18;
													case 'tag':
														return 12;
													default:
														return 14;
												}
											}),
										);

										const chargeForce = forceGraphRef.d3Force('charge');
										if (isChargeForce(chargeForce)) {
											chargeForce.strength(-100);
										}

										const linkForce = forceGraphRef.d3Force('link');
										if (isLinkForce(linkForce)) {
											linkForce
												.distance((link) => (link.rel === 'values' ? 110 : 80))
												.strength((link) => (link.rel === 'values' ? 0.6 : 0.3));
										}
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
								overlay={<CompareSkillsLegend />}
								{...commonProps}
							/>
						);
					case 'projects':
						return (
							<ForceGraphView
								key={instance.key}
								graphData={dataSnapshot.forceGraphData}
								overlay={<CompareProjectsLegend />}
								{...commonProps}
							/>
						);
					case 'frontend-vs-backend':
						return (
							<ForceGraphView
								key={instance.key}
								graphData={dataSnapshot.forceGraphData}
								overlay={<CompareFrontendVsBackendLegend />}
								{...commonProps}
							/>
						);
				}

			case 'explore':
				return (
					<ForceGraphView key={instance.key} graphData={dataSnapshot.forceGraphData} {...commonProps} />
				);

			case 'landing':
				return <LandingView key={instance.key} {...commonProps} />;

			case 'resume':
				return <ResumeView key={instance.key} {...commonProps} />;

			default:
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
			{debugEnabled && (
				<div
					style={{
						position: 'fixed',
						right: '1rem',
						bottom: '1rem',
						zIndex: 9999,
						width: 'min(32rem, calc(100vw - 2rem))',
						maxHeight: '40vh',
						overflow: 'auto',
						padding: '0.75rem',
						borderRadius: '0.75rem',
						background: 'rgba(0, 0, 0, 0.82)',
						color: '#fff',
						fontFamily: 'monospace',
						fontSize: '12px',
						lineHeight: 1.45,
						boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
					}}
				>
					<div>transition-debug</div>
					<div>directive: {getDirectiveViewKey(directive)}</div>
					<div>isTransitioning: {String(transitionState.isTransitioning)}</div>
					<div>
						instances:{' '}
						{transitionState.instances
							.map((instance) => `${instance.mode}:${instance.phase}:${instance.key}`)
							.join(' | ')}
					</div>
					{lastDecisionRef.current && (
						<div>
							lastDecision: {lastDecisionRef.current.reason} /{' '}
							{String(lastDecisionRef.current.shouldTransition)}
						</div>
					)}
					<div style={{ marginTop: '0.5rem' }}>recent events:</div>
					{debugEvents.map((entry) => (
						<div key={entry.id} style={{ marginTop: '0.35rem', whiteSpace: 'pre-wrap' }}>
							[{entry.at.slice(11, 23)}] {entry.event}
							{entry.details ? ` ${JSON.stringify(entry.details)}` : ''}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
