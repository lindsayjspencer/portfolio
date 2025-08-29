import { useEffect, useState } from 'react';
import type { TransitionPhase, TransitionCallbacks } from '~/lib/ViewTransitions';
import './CompareView.scss';

interface CompareViewProps {
	transitionPhase?: TransitionPhase;
	onRegisterCallbacks?: (callbacks: TransitionCallbacks) => void;
}

export function CompareView({ transitionPhase = 'stable', onRegisterCallbacks }: CompareViewProps) {
	const [textOpacity, setTextOpacity] = useState(transitionPhase === 'stable' ? 1 : 0);
	const [transitionDuration, setTransitionDuration] = useState(400);

	useEffect(() => {
		if (onRegisterCallbacks) {
			onRegisterCallbacks({
				onTransitionIn: async (duration: number) => {
					setTransitionDuration(duration);
					setTextOpacity(1);
				},
				onTransitionOut: async (duration: number) => {
					setTransitionDuration(duration);
					setTextOpacity(0);
				}
			});
		}
	}, [onRegisterCallbacks]);

	// Handle initial entering state
	useEffect(() => {
		if (transitionPhase === 'entering') {
			setTextOpacity(0);
		}
	}, [transitionPhase]);

	return (
		<div className="compare-view">
			<div 
				className="center-content"
				style={{ 
					opacity: textOpacity,
					transition: `opacity ${transitionDuration}ms ease-in-out`
				}}
			>
				Compare
			</div>
		</div>
	);
}