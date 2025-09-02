import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { ThemeProvider } from '~/contexts/theme-context';
import { PortfolioStoreProvider } from '~/lib/PortfolioStoreProvider';
import { useApplyDirective } from '~/hooks/useApplyDirective';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import type { Directive } from '~/lib/ai/directiveTools';

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
			<div data-testid={`narration-${id}`}>{(current.data as any).narration ?? ''}</div>
			<div data-testid={`theme-${id}`}>{(current.data as any).theme ?? ''}</div>
		</>
	);
}

function renderWithProviders(
	ui: React.ReactElement,
	initialDirective: Directive,
	theme: 'cold' | 'corporate' = 'cold',
) {
	return render(
		<ThemeProvider initialTheme={theme}>
			<PortfolioStoreProvider initialDirective={initialDirective}>{ui}</PortfolioStoreProvider>
		</ThemeProvider>,
	);
}

const landing = (overrides?: Partial<Directive>): Directive =>
	({
		mode: 'landing',
		data: {
			variant: 'neutral',
			highlights: [],
			narration: '',
			confidence: 0.7,
			...((overrides?.data as any) || {}),
		},
		...(overrides || {}),
	}) as Directive;

describe('useApplyDirective', () => {
	it('ensures theme when missing on incoming directive', async () => {
		const initial = landing({ data: { theme: 'cold' } as any });
		const next = landing(); // no theme

		const onApplied = (_: Directive) => {};
		const { getByTestId } = renderWithProviders(
			<TestHarness id="t1" next={next} onApplied={onApplied} />,
			initial,
			'corporate',
		);

		await act(async () => {
			getByTestId('apply-t1').click();
		});

		expect(getByTestId('theme-t1').textContent).toBe('corporate');
	});

	it('inherits narration when incoming directive narration is empty', async () => {
		const initial = landing({ data: { theme: 'cold', narration: 'keep me' } as any });
		const next = landing({ data: { narration: '' } as any });

		let applied: Directive | null = null;
		const { getByTestId } = renderWithProviders(
			<TestHarness id="t2" next={next} onApplied={(d) => (applied = d)} />,
			initial,
			'cold',
		);

		await act(async () => {
			getByTestId('apply-t2').click();
		});

		expect(applied).toBeTruthy();
		expect(getByTestId('narration-t2').textContent).toBe('keep me');
	});
});
