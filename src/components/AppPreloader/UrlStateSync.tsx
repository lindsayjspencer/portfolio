'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import {
	encodeDirective,
	decodeDirective,
	validateUrlDirective,
	ensureThemeInDirective,
	toStoreDirective,
	UrlStateTooLargeError,
} from '~/utils/urlState';
import { useTheme } from '~/contexts/theme-context';
import type { Directive } from '~/lib/ai/directiveTools';

// Decides if a change warrants push (new history) vs replace (coalesce)
function modeVariantKey(d: Directive) {
	const v = 'variant' in d.data ? (d.data as { variant?: string }).variant : undefined;
	return `${d.mode}:${v ?? ''}`;
}

export function UrlStateSync() {
	const router = useRouter();
	const directive = usePortfolioStore((s) => s.directive);
	const setDirective = usePortfolioStore((s) => s.setDirective);
	const { themeName, setTheme } = useTheme();

	const lastEncodedRef = useRef<string | null>(null);
	const lastKeyRef = useRef<string | null>(null);
	const applyingFromUrlRef = useRef(false);

	// Write back to URL on directive changes (debounced)
	useEffect(() => {
		if (!directive) return;
		if (applyingFromUrlRef.current) {
			// Skip write-back when applying from URL/navigation
			applyingFromUrlRef.current = false;
			return;
		}

		// Ensure theme is present in directive before encoding
		const hasTheme = typeof (directive.data as { theme?: unknown }).theme !== 'undefined';
		const dWithTheme: Directive = hasTheme
			? directive
			: ({ ...directive, data: { ...directive.data, theme: themeName } } as Directive);

		let encoded: string;
		try {
			encoded = encodeDirective(dWithTheme);
		} catch (e) {
			if (e instanceof UrlStateTooLargeError) {
				// Fallback: drop narration from URL to stay within bounds, keep full in store
				const withoutNarration: Directive = {
					...dWithTheme,
					data: { ...dWithTheme.data, narration: '' },
				} as Directive;
				try {
					encoded = encodeDirective(withoutNarration);
					// do not mutate store; only URL will contain shortened state
					console.warn('[UrlStateSync] URL state too large; writing truncated narration to URL.');
				} catch {
					// Give up if still too large
					return;
				}
			} else {
				return;
			}
		}
		// If URL already has the same state, do nothing
		try {
			const current = new URLSearchParams(window.location.search).get('state');
			if (current === encoded) return;
		} catch {}
		if (lastEncodedRef.current === encoded) return;

		const nextKey = modeVariantKey(dWithTheme);
		const prevKey = lastKeyRef.current;
		lastEncodedRef.current = encoded;
		lastKeyRef.current = nextKey;

		const url = `/?state=${encoded}`;
		const push = prevKey && prevKey !== nextKey;

		const t = setTimeout(() => {
			// Re-check current to avoid redundant writes if state changed again during debounce
			try {
				const current = new URLSearchParams(window.location.search).get('state');
				if (current === encoded) return;
			} catch {}

			if (push) router.push(url);
			else router.replace(url);
		}, 250);
		return () => clearTimeout(t);
	}, [directive, router, themeName]);

	// Handle back/forward (popstate)
	useEffect(() => {
		const onPopState = () => {
			try {
				const params = new URLSearchParams(window.location.search);
				const encoded = params.get('state');
				if (!encoded) {
					// No state -> go to landing with current theme
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
					applyingFromUrlRef.current = true;
					setDirective(landing);
					return;
				}
				const raw = decodeDirective(encoded);
				const validated = validateUrlDirective(raw);
				if (!validated) return;
				const withTheme = ensureThemeInDirective(validated, themeName);
				const storeDirective = toStoreDirective(withTheme);

				// Apply theme from URL if different
				const urlTheme = withTheme.data?.theme;
				if (urlTheme && urlTheme !== themeName) setTheme(urlTheme);

				applyingFromUrlRef.current = true;
				setDirective(storeDirective);
			} catch (e) {
				// noop
			}
		};
		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	}, [setDirective, themeName, setTheme]);

	// If user changes theme from UI, reflect it into directive so URL stays the source of truth
	useEffect(() => {
		if (!directive) return;
		const currentTheme = (directive.data as { theme?: string }).theme;
		if (currentTheme === themeName) return;
		// Update store directive with new theme
		applyingFromUrlRef.current = false; // user-initiated; allow write-back
		setDirective({ ...directive, data: { ...directive.data, theme: themeName } } as Directive);
	}, [themeName, directive, setDirective]);

	return null;
}
