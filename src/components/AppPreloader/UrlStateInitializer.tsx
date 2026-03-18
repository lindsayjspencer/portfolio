'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { decodeUrlState, validateUrlState, toStoreDirectiveFromUrlState, type ValidUrlState } from '~/utils/urlState';
import { useTheme } from '~/contexts/theme-context';
import type { ThemeName } from '~/lib/themes';
import type { Directive } from '~/lib/ai/directiveTools';

/**
 * Phase 1: Read-only URL loader.
 * - On first mount, read ?state, decode/validate, apply to store with ensured theme.
 * - On failure, strip ?state.
 * - No syncing back to URL yet.
 */
export function UrlStateInitializer({ onReady }: { onReady?: (initial: Directive) => void }) {
	const params = useSearchParams();
	const router = useRouter();
	const hasInitialized = useRef(false);
	const { themeName, setTheme } = useTheme();

	useEffect(() => {
		if (hasInitialized.current) return;
		hasInitialized.current = true;

		const encoded = params.get('state');
		if (!encoded) {
			// Default landing directive; theme handled separately by ThemeProvider
			const landing: Directive = {
				mode: 'landing',
				data: {
					variant: 'neutral',
					highlights: [],
					confidence: 0.7,
				},
			} as Directive;
			onReady?.(landing);
			return;
		}

		const raw = decodeUrlState(encoded);
		const validated = validateUrlState(raw);
		if (!validated) {
			// Clean URL if invalid
			// Keep history consistent; push instead of replace
			router.push('/');
			const landing: Directive = {
				mode: 'landing',
				data: {
					variant: 'neutral',
					highlights: [],
					confidence: 0.7,
				},
			} as Directive;
			onReady?.(landing);
			return;
		}

		// Bridge to store Directive (structure-only)
		const storeDirective = toStoreDirectiveFromUrlState(validated);

		// Apply theme from URL to ThemeProvider if different
		const urlTheme = validated.theme as ThemeName;
		if (urlTheme && urlTheme !== themeName) {
			setTheme(urlTheme);
		}
		onReady?.(storeDirective);
	}, [params, router, themeName, setTheme, onReady]);

	return null;
}
