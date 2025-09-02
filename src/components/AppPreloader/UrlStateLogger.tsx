'use client';

import { useEffect, useRef } from 'react';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import { encodeDirective, ensureThemeInDirective } from '~/utils/urlState';
import { useTheme } from '~/contexts/theme-context';

/**
 * Development helper: logs an encoded URL whenever the directive changes.
 * Guarded to run only in non-production environments.
 */
export function UrlStateLogger() {
	const directive = usePortfolioStore((s) => s.directive);
	const { themeName } = useTheme();
	const last = useRef<string | null>(null);

	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return;
		const withTheme = ensureThemeInDirective(directive, themeName);
		const stateParam = encodeDirective(withTheme);
		if (last.current === stateParam) return;
		last.current = stateParam;
		const url = `/?state=${stateParam}`;
		// Clearer grouping in console
		// eslint-disable-next-line no-console
		console.log('\nEncoded directive URL:', url, '\nDirective:', withTheme);
	}, [directive, themeName]);

	return null;
}
