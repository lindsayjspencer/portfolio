'use client';

import { useCallback } from 'react';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import type { Directive } from '~/lib/ai/directiveTools';

export function useApplyDirective() {
	const setDirective = usePortfolioStore((s) => s.setDirective);
	const setLastDirective = usePortfolioStore((s) => s.setLastDirective);
	// const currentDirective = usePortfolioStore((s) => s.directive);

	return useCallback(
		(directive: Directive) => {
			setLastDirective?.(directive);
			setDirective(directive);
		},
		[setDirective, setLastDirective],
	);
}
