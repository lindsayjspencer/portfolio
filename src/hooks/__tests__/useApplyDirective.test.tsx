import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { ThemeProvider } from '~/contexts/theme-context';
import { PortfolioStoreProvider } from '~/lib/PortfolioStoreProvider';
import { useApplyDirective } from '~/hooks/useApplyDirective';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import {
	createDefaultLandingDirective,
	createTimelineDirective,
	getDirectiveVariant,
	type Directive,
} from '~/lib/ai/directiveTools';

function TestHarness({
	next,
	onApplied,
	id = 'h',
}: {
	next: Directive;
	onApplied: (d: Directive) => void;
	id?: string;
}) {
	const apply = useApplyDirective();
	const current = usePortfolioStore((s) => s.directive);
	return (
		<>
			<button
				data-testid={`apply-${id}`}
				onClick={() => {
					apply(next);
					onApplied(next);
				}}
			>
				apply
			</button>
			<div data-testid={`variant-${id}`}>{getDirectiveVariant(current) ?? ''}</div>
		</>
	);
}

function renderWithProviders(ui: React.ReactElement, initialDirective: Directive, theme: 'cold' | 'elegant' = 'cold') {
	return render(
		<PortfolioStoreProvider initialDirective={{ ...initialDirective, theme }}>
			<ThemeProvider>{ui}</ThemeProvider>
		</PortfolioStoreProvider>,
	);
}

describe('useApplyDirective', () => {
	it('applies directives without altering structure', async () => {
		const initial = createDefaultLandingDirective();
		const next = createTimelineDirective('cold', { variant: 'projects' });

		let applied: Directive | null = null;
		const { getByTestId } = renderWithProviders(
			<TestHarness id="t1" next={next} onApplied={(d) => (applied = d)} />,
			initial,
			'cold',
		);

		await act(async () => {
			getByTestId('apply-t1').click();
		});

		expect(applied).toBeTruthy();
		expect(getByTestId('variant-t1').textContent).toBe('projects');
	});
});
