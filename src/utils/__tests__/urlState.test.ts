import { describe, it, expect } from 'vitest';
import {
	encodeDirective,
	decodeDirective,
	validateUrlDirective,
	ensureThemeInDirective,
	toStoreDirective,
	UNCOMPRESSED_THRESHOLD,
	HARD_CAP,
	UrlStateTooLargeError,
} from '../urlState';
import type { Directive } from '~/lib/ai/directiveTools';
import type { ThemeName } from '~/lib/themes';

describe('urlState utils', () => {
	const base: Directive = {
		mode: 'timeline',
		data: {
			variant: 'career',
			narration: '',
			highlights: [],
			confidence: 0.7,
			theme: 'cold' as ThemeName,
		},
	};

	it('encodes and decodes round-trip', () => {
		const encoded = encodeDirective(base);
		const raw = decodeDirective(encoded);
		const validated = validateUrlDirective(raw!);
		expect(validated).not.toBeNull();
		const bridged = toStoreDirective(validated!);
		expect(bridged.mode).toBe('timeline');
		if (bridged.mode === 'timeline') {
			expect(bridged.data.variant).toBe('career');
		}
	});

	it('uses compression when state exceeds threshold and still round-trips', () => {
		const longNarration = 'x'.repeat(UNCOMPRESSED_THRESHOLD); // ensure over threshold after base64-url
		const big: Directive = {
			...base,
			data: { ...base.data, narration: longNarration },
		} as Directive;
		const encoded = encodeDirective(big);
		expect(encoded.startsWith('c:')).toBe(true);
		const raw = decodeDirective(encoded);
		const validated = validateUrlDirective(raw!);
		expect(validated).not.toBeNull();
		const bridged = toStoreDirective(validated!);
		expect(bridged.mode).toBe('timeline');
	});

	it('throws UrlStateTooLargeError when compressed state exceeds hard cap, and succeeds if narration is removed', () => {
		// Build a high-entropy narration that does not compress well
		const rand = (len: number) =>
			Array.from({ length: len })
				.map(() => {
					const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
					return chars.charAt(Math.floor(Math.random() * chars.length));
				})
				.join('');

		// Choose a size that will almost certainly exceed HARD_CAP when compressed & encoded
		const giantNarration = rand(14000);
		const big: Directive = {
			...base,
			data: { ...base.data, narration: giantNarration },
		} as Directive;

		expect(() => encodeDirective(big)).toThrow(UrlStateTooLargeError);

		const trimmed: Directive = { ...big, data: { ...big.data, narration: '' } } as Directive;
		const encodedTrimmed = encodeDirective(trimmed);
		expect(encodedTrimmed.length).toBeLessThanOrEqual(HARD_CAP);
	});

	it('uses URL-safe base64 without padding', () => {
		const encoded = encodeDirective(base);
		expect(encoded.includes('+')).toBe(false);
		expect(encoded.includes('/')).toBe(false);
		expect(encoded.endsWith('=')).toBe(false);
	});

	it('ensureThemeInDirective adds fallback theme when missing', () => {
		const withoutTheme: Directive = { ...base, data: { ...base.data, theme: undefined } } as Directive;
		const ensured = ensureThemeInDirective(withoutTheme, 'warm' as ThemeName);
		expect(ensured.data.theme).toBe('warm');
	});

	it('validateUrlDirective returns null on invalid', () => {
		const invalid = { mode: 'projects', data: { variant: 'oops' } };
		const validated = validateUrlDirective(invalid);
		expect(validated).toBeNull();
	});
});
