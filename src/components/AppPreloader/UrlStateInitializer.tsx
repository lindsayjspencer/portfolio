'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { decodeDirective, validateUrlDirective, ensureThemeInDirective, toStoreDirective } from '~/utils/urlState';
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
			// Default landing directive using current theme
			const landing: Directive = {
				mode: 'landing',
				data: {
					variant: 'neutral',
					highlights: [],
					narration: '',
					confidence: 0.7,
					theme: themeName,
				},
			} as Directive;
			onReady?.(landing);
			return;
		}

		const raw = decodeDirective(encoded);
		const validated = validateUrlDirective(raw);
		if (!validated) {
			// Clean URL if invalid
			router.replace('/');
			const landing: Directive = {
				mode: 'landing',
				data: {
					variant: 'neutral',
					highlights: [],
					narration: '',
					confidence: 0.7,
					theme: themeName,
				},
			} as Directive;
			onReady?.(landing);
			return;
		}

		// Enforce theme presence using current theme as fallback
		const directiveWithTheme = ensureThemeInDirective(validated, themeName);
		// Bridge to store Directive by ensuring narration exists (empty string default)
		const storeDirective = toStoreDirective(directiveWithTheme);

		// Apply theme from URL to ThemeProvider if different
		const urlTheme: ThemeName | undefined = directiveWithTheme.data?.theme as ThemeName | undefined;
		if (urlTheme && urlTheme !== themeName) {
			setTheme(urlTheme);
		}
		onReady?.(storeDirective);
	}, [params, router, themeName, setTheme, onReady]);

	return null;
}
