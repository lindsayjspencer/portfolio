import { describe, expect, it } from 'vitest';
import { createDataSnapshot, shouldTransition, structuralSignature } from '../ViewTransitions';
import { graph } from '../PortfolioStore';
import {
	createDefaultLandingDirective,
	createExploreDirective,
	createProjectsDirective,
	createResumeDirective,
	createSkillsDirective,
	withDirectiveTheme,
} from '../ai/directiveTools';

describe('ViewTransitions', () => {
	it('creates non-variant landing and resume snapshots', () => {
		const landingSnapshot = createDataSnapshot(graph, createDefaultLandingDirective());
		const resumeSnapshot = createDataSnapshot(graph, createResumeDirective('cold'));

		expect(landingSnapshot.mode).toBe('landing');
		expect('variant' in landingSnapshot).toBe(false);

		expect(resumeSnapshot.mode).toBe('resume');
		expect('variant' in resumeSnapshot).toBe(false);
	});

	it('filters explore snapshots by tag without inventing a variant', () => {
		const snapshot = createDataSnapshot(graph, createExploreDirective('cold', { filterTags: ['frontend'] }));

		expect(snapshot.mode).toBe('explore');
		expect('variant' in snapshot).toBe(false);
		if (snapshot.mode !== 'explore') {
			throw new Error('Expected explore snapshot');
		}
		expect(snapshot.filterTags).toEqual(['frontend']);
		expect(snapshot.nodes.length).toBeGreaterThan(0);
		expect(snapshot.nodes.every((node) => node.tags?.includes('frontend') ?? false)).toBe(true);
	});

	it('ignores theme and cosmetic directive fields when deciding transitions', () => {
		const base = createProjectsDirective('cold', {
			variant: 'grid',
			highlights: ['project-a'],
			showMetrics: true,
		});
		const themeOnly = withDirectiveTheme(base, 'elegant');
		const cosmeticOnly = createProjectsDirective('cold', {
			variant: 'grid',
			highlights: ['project-b'],
			showMetrics: false,
		});

		expect(structuralSignature(base)).toBe(structuralSignature(cosmeticOnly));
		expect(shouldTransition(base, themeOnly)).toBe(false);
		expect(shouldTransition(base, cosmeticOnly)).toBe(false);
	});

	it('transitions when the directive structure actually changes', () => {
		const technical = createSkillsDirective('cold', {
			variant: 'technical',
			clusterBy: 'domain',
		});
		const matrix = createSkillsDirective('cold', {
			variant: 'matrix',
			clusterBy: 'domain',
		});
		const filteredExplore = createExploreDirective('cold', { filterTags: ['frontend'] });
		const unfilteredExplore = createExploreDirective('cold');

		expect(shouldTransition(technical, matrix)).toBe(true);
		expect(shouldTransition(unfilteredExplore, filteredExplore)).toBe(true);
	});
});
