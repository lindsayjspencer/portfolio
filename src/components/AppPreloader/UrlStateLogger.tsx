'use client';

import { useEffect, useRef } from 'react';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import { encodeUrlState } from '~/utils/urlState';

/**
 * Development helper: logs an encoded URL whenever the directive changes.
 * Guarded to run only in non-production environments.
 */
export function UrlStateLogger() {
	const directive = usePortfolioStore((s) => s.directive);
	const last = useRef<string | null>(null);

	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return;
		const stateParam = encodeUrlState(directive);
		if (last.current === stateParam) return;
		last.current = stateParam;
		const url = `/?state=${stateParam}`;
		// Clearer grouping in console
		// eslint-disable-next-line no-console
		console.log('\nEncoded directive URL:', url, '\nDirective:', directive);
	}, [directive]);

	return null;
}
