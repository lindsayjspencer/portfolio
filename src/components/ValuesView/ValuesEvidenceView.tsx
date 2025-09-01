import { LandingView } from '../LandingView/LandingView';
import type { TransitionPhase, TransitionCallbacks } from '~/lib/ViewTransitions';

interface ValuesEvidenceViewProps {
	transitionPhase: TransitionPhase;
	onRegisterCallbacks: (callbacks: TransitionCallbacks) => void;
}

export function ValuesEvidenceView({ transitionPhase, onRegisterCallbacks }: ValuesEvidenceViewProps) {
	// TODO: Implement ValuesEvidenceView component
	// This should use dataSnapshot.values and dataSnapshot.evidence
	// and render values with supporting evidence/stories
	
	return <LandingView transitionPhase={transitionPhase} onRegisterCallbacks={onRegisterCallbacks} />;
}