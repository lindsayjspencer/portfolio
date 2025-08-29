import { useEffect, useState } from 'react';
import type { TransitionPhase, TransitionCallbacks } from '~/lib/ViewTransitions';
import './ValuesView.scss';

interface ValuesViewProps {
	transitionPhase?: TransitionPhase;
	onRegisterCallbacks?: (callbacks: TransitionCallbacks) => void;
}

export function ValuesView({ transitionPhase = 'stable', onRegisterCallbacks }: ValuesViewProps) {
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
		<div className="values-view">
			<div 
				className="center-content"
				style={{ 
					opacity: textOpacity,
					transition: `opacity ${transitionDuration}ms ease-in-out`
				}}
			>
				Values
			</div>
		</div>
	);
}