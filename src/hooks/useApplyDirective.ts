'use client';

import { useCallback } from 'react';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import { useTheme } from '~/contexts/theme-context';
import type { Directive } from '~/lib/ai/directiveTools';

export type ApplyDirectiveOptions = {
	// reserved for future origin flags, analytics, etc.
};

export function useApplyDirective() {
	const setDirective = usePortfolioStore((s) => s.setDirective);
	const setLastDirective = usePortfolioStore((s) => s.setLastDirective);
	const currentDirective = usePortfolioStore((s) => s.directive);
	const { themeName } = useTheme();

	return useCallback(
		(directive: Directive, _opts?: ApplyDirectiveOptions) => {
			const hasTheme = typeof (directive.data as { theme?: unknown }).theme !== 'undefined';
			const incomingNarration = (directive.data as { narration?: string }).narration;
			// Do not preserve previous narration; if none is provided, clear it to empty string
			const narration = incomingNarration != null ? incomingNarration : '';
			const normalized: Directive = {
				...directive,
				data: {
					...directive.data,
					narration,
					...(hasTheme ? {} : { theme: themeName }),
				},
			} as Directive;

			setLastDirective?.(normalized);
			setDirective(normalized);
		},
		[setDirective, setLastDirective, themeName, currentDirective],
	);
}
