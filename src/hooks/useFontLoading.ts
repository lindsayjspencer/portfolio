'use client';

import { useEffect, useRef, useState } from 'react';

const DEFAULT_FALLBACK_TIMEOUT = 12000;
const MIN_LOADING_TIME = 800;

export interface FontLoadingState {
	isLoading: boolean;
	isLoaded: boolean;
	hasError: boolean;
	loadedFonts: string[];
}

/**
 * Pass the exact families you use, e.g.:
 * ['Material Symbols Outlined','Material Symbols Rounded','Material Symbols Sharp']
 * or ['Material Icons'] if you still use the legacy set.
 */
export function useFontLoading(
	families: readonly string[],
	opts?: { timeoutMs?: number; testText?: string; size?: string },
): FontLoadingState {
	const timeoutMs = opts?.timeoutMs ?? DEFAULT_FALLBACK_TIMEOUT;
	const testText = opts?.testText ?? 'home';
	const size = opts?.size ?? '24px';

	const [state, setState] = useState<FontLoadingState>({
		isLoading: true,
		isLoaded: false,
		hasError: false,
		loadedFonts: [],
	});

	const cancelled = useRef(false);
	const settled = useRef(false);
	const hardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const minTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		cancelled.current = false;
		settled.current = false;

		let canComplete = false;

		const clearTimers = () => {
			if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
			if (minTimerRef.current) clearTimeout(minTimerRef.current);
			hardTimeoutRef.current = null;
			minTimerRef.current = null;
		};

		const finish = (next: Omit<FontLoadingState, 'isLoading'>) => {
			if (settled.current || cancelled.current) return;
			settled.current = true;
			clearTimers(); // ✅ ensure hard-timeout can't fire later
			const run = () => {
				if (cancelled.current) return;
				setState({ isLoading: false, ...next });
			};
			if (canComplete) run();
			else setTimeout(run, 50);
		};

		minTimerRef.current = setTimeout(() => {
			canComplete = true;
		}, MIN_LOADING_TIME);

		const ensureDomReady = async () => {
			if (document.readyState === 'loading') {
				await new Promise<void>((res) => {
					const h = () => {
						document.removeEventListener('DOMContentLoaded', h);
						res();
					};
					document.addEventListener('DOMContentLoaded', h);
				});
			}
			// Wait for any pending font loads to settle
			if ('fonts' in document && 'ready' in document.fonts) {
				try {
					await (document.fonts as FontFaceSet).ready;
				} catch {
					/* ignore */
				}
			}
		};

		const tryLoad = async (): Promise<string[]> => {
			if (typeof document === 'undefined' || !('fonts' in document)) {
				return [...families];
			}
			await ensureDomReady();

			// Kick each face (pass representative text for ligature shaping)
			await Promise.all(families.map((f) => document.fonts.load(`${size} "${f}"`, testText)));

			// Prefer check(), but if a UA reports false negatives, fall back to load-success
			const checked = families.filter((f) => document.fonts.check(`${size} "${f}"`, testText));
			return checked.length ? checked : [...families];
		};

		const run = async () => {
			try {
				const loaded = await tryLoad();
				const all = loaded.length === families.length;
				finish({
					isLoaded: all,
					hasError: !all,
					loadedFonts: loaded,
				});
			} catch {
				finish({ isLoaded: false, hasError: true, loadedFonts: [] });
			}
		};

		// Hard stop so we never hang; cleared on finish()
		hardTimeoutRef.current = setTimeout(() => {
			// If already settled, this no-ops via guard
			finish({ isLoaded: false, hasError: true, loadedFonts: [] });
		}, timeoutMs);

		void run();

		return () => {
			cancelled.current = true;
			clearTimers();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(families), timeoutMs, testText, size]);

	return state;
}
