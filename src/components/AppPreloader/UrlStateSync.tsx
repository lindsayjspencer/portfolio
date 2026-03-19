'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import {
	UrlStateTooLargeError,
	decodeUrlState,
	encodeUrlState,
	toStoreDirectiveFromUrlState,
	validateUrlState,
} from '~/utils/urlState';
import {
	DEFAULT_THEME,
	createDefaultLandingDirective,
	getDirectiveViewKey,
	type Directive,
} from '~/lib/ai/directiveTools';

function isDefaultLandingDirective(directive: Directive): boolean {
	return (
		directive.mode === 'landing' &&
		directive.theme === DEFAULT_THEME &&
		Array.isArray((directive.data as { highlights?: string[] }).highlights) &&
		((directive.data as { highlights?: string[] }).highlights?.length ?? 0) === 0 &&
		((directive.data as { confidence?: number }).confidence ?? 0.7) === 0.7
	);
}

export function UrlStateSync() {
	const directive = usePortfolioStore((state) => state.directive);
	const setDirective = usePortfolioStore((state) => state.setDirective);

	const lastEncodedRef = useRef<string | null>(null);
	const lastKeyRef = useRef<string | null>(null);
	const applyingFromUrlRef = useRef(false);

	const writeSignature = useMemo(() => JSON.stringify(directive), [directive]);

	useEffect(() => {
		if (applyingFromUrlRef.current) {
			applyingFromUrlRef.current = false;
			lastKeyRef.current = getDirectiveViewKey(directive);
			return;
		}

		let encoded: string;
		try {
			encoded = encodeUrlState(directive);
		} catch (error) {
			if (error instanceof UrlStateTooLargeError) {
				console.warn('[UrlStateSync] URL state too large; skipping URL update.');
			}
			return;
		}

		const isDefaultLanding = isDefaultLandingDirective(directive);

		try {
			const current = new URLSearchParams(window.location.search).get('state');
			if (current === encoded || (isDefaultLanding && !current)) {
				lastEncodedRef.current = encoded;
				lastKeyRef.current = getDirectiveViewKey(directive);
				return;
			}
		} catch {
			// Ignore URL parsing failures and continue with the write attempt.
		}

		if (lastEncodedRef.current === encoded) {
			return;
		}

		const nextKey = getDirectiveViewKey(directive);
		const prevKey = lastKeyRef.current;
		const url = isDefaultLanding ? '/' : `/?state=${encoded}`;

		if (prevKey !== nextKey) {
			window.history.pushState(null, '', url);
			lastEncodedRef.current = encoded;
			lastKeyRef.current = nextKey;
			return;
		}

		const timeoutId = window.setTimeout(() => {
			try {
				const current = new URLSearchParams(window.location.search).get('state');
				if (current === encoded) {
					return;
				}
			} catch {
				// Ignore URL parsing failures and continue with the replace.
			}

			window.history.replaceState(null, '', url);
			lastEncodedRef.current = encoded;
			lastKeyRef.current = nextKey;
		}, 250);

		return () => window.clearTimeout(timeoutId);
	}, [directive, writeSignature]);

	useEffect(() => {
		const onPopState = () => {
			try {
				const encoded = new URLSearchParams(window.location.search).get('state');
				if (!encoded) {
					applyingFromUrlRef.current = true;
					setDirective(createDefaultLandingDirective());
					return;
				}

				const raw = decodeUrlState(encoded);
				const validated = validateUrlState(raw);
				if (!validated) {
					return;
				}

				applyingFromUrlRef.current = true;
				setDirective(toStoreDirectiveFromUrlState(validated));
			} catch {
				// Ignore malformed history entries.
			}
		};

		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	}, [setDirective]);

	return null;
}
