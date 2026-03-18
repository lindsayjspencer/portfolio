'use client';

import { useEffect, useRef } from 'react';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import { encodeUrlState } from '~/utils/urlState';
import { useTheme } from '~/contexts/theme-context';

/**
 * Development helper: logs an encoded URL whenever the directive changes.
 * Guarded to run only in non-production environments.
 */
export function UrlStateLogger() {
	const directive = usePortfolioStore((s) => s.directive);
	const messages = usePortfolioStore((s) => s.messages);
	const { themeName } = useTheme();
	const pendingClarify = usePortfolioStore((s) => s.pendingClarify);
	const last = useRef<string | null>(null);

	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return;
		// Get latest assistant message for URL state
		let lastAssistant = '';
		for (let i = messages.length - 1; i >= 0; i--) {
			const m = messages[i];
			if (m && m.role === 'assistant' && m.content) {
				lastAssistant = m.content;
				break;
			}
		}
		const stateParam = encodeUrlState({
			directive: directive as any,
			message: lastAssistant,
			pendingClarify,
			theme: themeName,
		});
		if (last.current === stateParam) return;
		last.current = stateParam;
		const url = `/?state=${stateParam}`;
		// Clearer grouping in console
		// eslint-disable-next-line no-console
		console.log('\nEncoded directive URL:', url, '\nDirective:', directive, '\nTheme:', themeName);
	}, [directive, messages, themeName, pendingClarify]);

	return null;
}
