import { LandingView } from '../LandingView/LandingView';
import type { TransitionPhase, TransitionCallbacks } from '~/lib/ViewTransitions';

interface SkillsMatrixViewProps {
	transitionPhase: TransitionPhase;
	onRegisterCallbacks: (callbacks: TransitionCallbacks) => void;
}

export function SkillsMatrixView({ transitionPhase, onRegisterCallbacks }: SkillsMatrixViewProps) {
	// TODO: Implement SkillsMatrixView component
	// This should use dataSnapshot.skills and dataSnapshot.matrix
	// and render a matrix/table view of skills with different dimensions
	
	return <LandingView transitionPhase={transitionPhase} onRegisterCallbacks={onRegisterCallbacks} />;
}