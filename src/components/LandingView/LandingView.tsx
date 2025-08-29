import { useEffect, useRef, useCallback } from 'react';
import Starfield from '~/components/ForceGraph/Starfield';
import type { TransitionCallbacks, TransitionPhase } from '~/lib/ViewTransitions';
import './LandingView.scss';

interface LandingViewProps {
	transitionPhase: TransitionPhase;
	onRegisterCallbacks: (callbacks: TransitionCallbacks) => void;
}

export function LandingView({ transitionPhase, onRegisterCallbacks }: LandingViewProps) {
	const fadeControllerRef = useRef<{
		fadeIn: (duration: number) => void;
		fadeOut: (duration: number) => void;
		resetAlpha: (alpha: number) => void;
	} | null>(null);
	const rafIdRef = useRef<number | null>(null);

	// Ensure we don't race transition callbacks before starfield is ready
	const waitForController = useCallback(() => {
		return new Promise<void>((resolve) => {
			const check = () => {
				if (fadeControllerRef.current) resolve();
				else setTimeout(check, 10);
			};
			check();
		});
	}, []);

	// Fixed bounds for landing view (no zoom interactions)
	const bounds = {
		minX: -window.innerWidth,
		maxX: window.innerWidth,
		minY: -window.innerHeight,
		maxY: window.innerHeight,
	};

	// Register transition callbacks
	useEffect(() => {
		const callbacks: TransitionCallbacks = {
			onTransitionOut: async (duration: number) => {
				await waitForController();
				fadeControllerRef.current?.fadeOut(duration);
			},
			onTransitionIn: async (duration: number) => {
				await waitForController();
				fadeControllerRef.current?.fadeIn(duration);
			},
		};

		onRegisterCallbacks(callbacks);
	}, [onRegisterCallbacks, waitForController]);

	const handleStarfieldReady = (
		renderFn: (transform?: DOMMatrix) => void,
		fadeController?: {
			fadeIn: (duration: number) => void;
			fadeOut: (duration: number) => void;
			resetAlpha: (alpha: number) => void;
		},
	) => {
		fadeControllerRef.current = fadeController || null;

		// Set initial alpha based on phase; do NOT start animation here.
		// The manager will call onTransitionIn with the correct duration.
		if (transitionPhase === 'entering' && fadeController) {
			fadeController.resetAlpha(0);
		} else if (transitionPhase === 'stable' && fadeController) {
			fadeController.resetAlpha(1);
		}

		// Start rendering with identity transform (no zoom/pan)
		const renderLoop = () => {
			renderFn();
			rafIdRef.current = requestAnimationFrame(renderLoop);
		};
		renderLoop();
	};

	// Cleanup render loop on unmount
	useEffect(() => {
		return () => {
			if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
		};
	}, []);

	return (
		<div className={`landing-view landing-view--${transitionPhase}`}>
			<Starfield
				bounds={bounds}
				starCount={2500}
				color="100,100,120"
				linkDistance={105}
				linkFps={30}
				startInvisible={transitionPhase === 'entering'}
				onReady={handleStarfieldReady}
			/>
		</div>
	);
}
