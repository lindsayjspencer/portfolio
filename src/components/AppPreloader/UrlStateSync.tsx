'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import {
	encodeUrlState,
	decodeUrlState,
	validateUrlState,
	toStoreDirectiveFromUrlState,
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
	const messages = usePortfolioStore((s) => s.messages);
	const pendingClarify = usePortfolioStore((s) => s.pendingClarify);
	const setDirective = usePortfolioStore((s) => s.setDirective);
	const addMessage = usePortfolioStore((s) => s.addMessage);
	const setPendingClarify = usePortfolioStore((s) => s.setPendingClarify);
	const { themeName, setTheme } = useTheme();

	const lastEncodedRef = useRef<string | null>(null);
	const lastKeyRef = useRef<string | null>(null);
	const applyingFromUrlRef = useRef(false);

	// Derive a lightweight signature so in-place directive mutations still trigger this effect
	// Compute latest assistant message for URL state
	const lastAssistantMessage = useMemo(() => {
		for (let i = messages.length - 1; i >= 0; i--) {
			const m = messages[i];
			if (m && m.role === 'assistant' && m.content) return m.content;
		}
		return '';
	}, [messages]);

	const writeSignature = useMemo(() => {
		if (!directive) return '';
		const v = 'variant' in directive.data ? (directive.data as any).variant : undefined;
		const highlights = (directive.data as any)?.highlights ?? [];
		// Include a compact summary of the message so URL updates when it changes
		const msg = lastAssistantMessage
			? { ml: lastAssistantMessage.length, mh: lastAssistantMessage.slice(0, 64) }
			: {};
		return JSON.stringify({ m: directive.mode, v, h: highlights, t: themeName, ...msg });
	}, [
		directive?.mode,
		(directive as any)?.data?.variant,
		(directive as any)?.data?.highlights,
		themeName,
		lastAssistantMessage,
	]);

	// Write back to URL on directive changes (debounced)
	useEffect(() => {
		if (!directive) return;
		if (applyingFromUrlRef.current) {
			// Skip write-back when applying from URL/navigation
			applyingFromUrlRef.current = false;
			return;
		}

		let encoded: string;
		try {
			// Use latest assistant message for URL state; include pendingClarify when present
			const message = lastAssistantMessage || '';
			const state = { directive: directive as any, message, theme: themeName, pendingClarify } as const;
			encoded = encodeUrlState(state);
		} catch (e) {
			if (e instanceof UrlStateTooLargeError) {
				try {
					// Fallback: drop message first
					encoded = encodeUrlState({
						directive: directive as any,
						message: '',
						theme: themeName,
						pendingClarify,
					});
					console.warn('[UrlStateSync] URL state too large; writing without message.');
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

		const nextKey = modeVariantKey(directive);
		const prevKey = lastKeyRef.current;

		// Special case: for the default landing state, clean the URL to '/'
		const isDefaultLanding =
			directive.mode === 'landing' &&
			Array.isArray((directive.data as any)?.highlights) &&
			(directive.data as any)?.highlights.length === 0 &&
			true;

		const url = isDefaultLanding ? '/' : `/?state=${encoded}`;

		// If mode/variant changed, write immediately (no debounce) to avoid being starved by rapid intra-view updates
		if (prevKey !== nextKey) {
			try {
				const current = new URLSearchParams(window.location.search).get('state');
				if (current !== encoded) {
					// Always push a new history entry (even for landing) so Back behaves predictably
					router.push(url);
				}
			} catch {}
			lastEncodedRef.current = encoded;
			lastKeyRef.current = nextKey;
			return;
		}

		const t = setTimeout(() => {
			// Re-check current to avoid redundant writes if state changed again during debounce
			try {
				const current = new URLSearchParams(window.location.search).get('state');
				if (current === encoded) return;
			} catch {}

			// Always push a new history entry
			router.push(url);
			lastEncodedRef.current = encoded;
			lastKeyRef.current = nextKey;
		}, 250);
		return () => clearTimeout(t);
	}, [writeSignature, directive, router, themeName]);

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
							confidence: 0.7,
						},
					} as Directive;
					applyingFromUrlRef.current = true;
					setDirective(landing);
					return;
				}
				const raw = decodeUrlState(encoded);
				const validated = validateUrlState(raw);
				if (!validated) return;
				const storeDirective = toStoreDirectiveFromUrlState(validated);

				// Apply theme from URL if different
				const urlTheme = validated.theme;
				if (urlTheme && urlTheme !== themeName) setTheme(urlTheme as any);

				applyingFromUrlRef.current = true;
				setDirective(storeDirective);
				// Restore pendingClarify from URL so options render immediately
				setPendingClarify(validated.pendingClarify as any);
			} catch (e) {
				// noop
			}
		};
		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	}, [setDirective, themeName, setTheme]);

	// On initial mount, seed pendingClarify and last assistant message from URL (directive is already applied by UrlStateInitializer)
	useEffect(() => {
		try {
			const params = new URLSearchParams(window.location.search);
			const encoded = params.get('state');
			if (!encoded) return;
			const raw = decodeUrlState(encoded);
			const validated = validateUrlState(raw);
			if (!validated) return;
			setPendingClarify(validated.pendingClarify as any);
			// If a message exists in URL, seed it as an assistant message so the chat shows the last answer
			if (validated.message && typeof validated.message === 'string' && validated.message.trim().length > 0) {
				addMessage({ role: 'assistant', content: validated.message });
			}
		} catch {
			// ignore
		}
	}, [setPendingClarify, addMessage]);

	// Theme changes are independent and included in URL top-level; no directive mutation
	useEffect(() => {
		// When theme changes, writeSignature will include it and write URL via effect above
	}, [themeName]);

	return null;
}
