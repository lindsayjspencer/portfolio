import { LandingView } from '../LandingView/LandingView';
import type { TransitionPhase, TransitionCallbacks } from '~/lib/ViewTransitions';

interface ProjectsCaseStudyViewProps {
	transitionPhase: TransitionPhase;
	onRegisterCallbacks: (callbacks: TransitionCallbacks) => void;
}

export function ProjectsCaseStudyView({ transitionPhase, onRegisterCallbacks }: ProjectsCaseStudyViewProps) {
	// TODO: Implement ProjectsCaseStudyView component
	// This should use dataSnapshot.projects, dataSnapshot.metrics, dataSnapshot.pinnedProjects
	// and render detailed case studies of selected projects
	
	return <LandingView transitionPhase={transitionPhase} onRegisterCallbacks={onRegisterCallbacks} />;
}