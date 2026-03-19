'use client';

import { useCallback } from 'react';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import type { Directive } from '~/lib/ai/directiveTools';

export type ApplyDirectiveOptions = {
	// reserved for future origin flags, analytics, etc.
};

export function useApplyDirective() {
	const setDirective = usePortfolioStore((s) => s.setDirective);
	const setLastDirective = usePortfolioStore((s) => s.setLastDirective);
	// const currentDirective = usePortfolioStore((s) => s.directive);

	return useCallback(
		(directive: Directive, _opts?: ApplyDirectiveOptions) => {
			setLastDirective?.(directive);
			setDirective(directive);
		},
		[setDirective, setLastDirective],
	);
}
