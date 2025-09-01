import { LandingView } from '../LandingView/LandingView';
import type { TransitionPhase, TransitionCallbacks } from '~/lib/ViewTransitions';

interface ProjectsGridViewProps {
	transitionPhase: TransitionPhase;
	onRegisterCallbacks: (callbacks: TransitionCallbacks) => void;
}

export function ProjectsGridView({ transitionPhase, onRegisterCallbacks }: ProjectsGridViewProps) {
	// TODO: Implement ProjectsGridView component
	// This should use dataSnapshot.projects, dataSnapshot.metrics, dataSnapshot.pinnedProjects
	// and render a grid layout of projects
	
	return <LandingView transitionPhase={transitionPhase} onRegisterCallbacks={onRegisterCallbacks} />;
}