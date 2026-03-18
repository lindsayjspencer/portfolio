import { describe, it, expect } from 'vitest';
import {
	encodeUrlState,
	decodeUrlState,
	validateUrlState,
	toStoreDirectiveFromUrlState,
	UNCOMPRESSED_THRESHOLD,
	HARD_CAP,
	UrlStateTooLargeError,
} from '../urlState';
import type { Directive } from '~/lib/ai/directiveTools';
import type { ThemeName } from '~/lib/themes';
import type { ClarifyPayload } from '~/lib/ai/clarifyTool';

describe('urlState utils', () => {
	const base: Directive = {
		mode: 'timeline',
		data: {
			variant: 'career',
			highlights: [],
			confidence: 0.7,
		},
	};

	it('encodes and decodes round-trip', () => {
		const encoded = encodeUrlState({ directive: base as any, message: '', theme: 'cold' as ThemeName });
		const raw = decodeUrlState(encoded);
		const validated = validateUrlState(raw!);
		expect(validated).not.toBeNull();
		const bridged = toStoreDirectiveFromUrlState(validated!);
		expect(bridged.mode).toBe('timeline');
		if (bridged.mode === 'timeline') {
			expect(bridged.data.variant).toBe('career');
		}
	});

	it('persists pendingClarify with message in URL and round-trips', () => {
		const pending: ClarifyPayload = {
			slot: 'skill_scope',
			kind: 'choice',
			options: ['Frontend', 'Backend', 'Fullstack'],
			multi: false,
			placeholder: 'Pick one',
		};
		const encoded = encodeUrlState({
			directive: base as any,
			message: 'Which skill area should I focus on?',
			pendingClarify: pending,
			theme: 'cold' as ThemeName,
		});
		const raw = decodeUrlState(encoded);
		const validated = validateUrlState(raw!);
		expect(validated).not.toBeNull();
		expect(validated!.pendingClarify?.slot).toBe('skill_scope');
	});

	it('uses compression when state exceeds threshold and still round-trips', () => {
		const longMessage = 'x'.repeat(UNCOMPRESSED_THRESHOLD); // ensure over threshold after base64-url
		const encoded = encodeUrlState({ directive: base as any, message: longMessage, theme: 'cold' as ThemeName });
		expect(encoded.startsWith('c:')).toBe(true);
		const raw = decodeUrlState(encoded);
		const validated = validateUrlState(raw!);
		expect(validated).not.toBeNull();
		const bridged = toStoreDirectiveFromUrlState(validated!);
		expect(bridged.mode).toBe('timeline');
	});

	it('throws UrlStateTooLargeError when compressed state exceeds hard cap, and succeeds if message is removed', () => {
		// Build a high-entropy message that does not compress well
		const rand = (len: number) =>
			Array.from({ length: len })
				.map(() => {
					const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
					return chars.charAt(Math.floor(Math.random() * chars.length));
				})
				.join('');

		// Choose a size that will almost certainly exceed HARD_CAP when compressed & encoded
		const giantMessage = rand(14000);
		expect(() =>
			encodeUrlState({ directive: base as any, message: giantMessage, theme: 'cold' as ThemeName }),
		).toThrow(UrlStateTooLargeError);
		const encodedTrimmed = encodeUrlState({ directive: base as any, message: '', theme: 'cold' as ThemeName });
		expect(encodedTrimmed.length).toBeLessThanOrEqual(HARD_CAP);
	});

	it('uses URL-safe base64 without padding', () => {
		const encoded = encodeUrlState({ directive: base as any, message: '', theme: 'cold' as ThemeName });
		expect(encoded.includes('+')).toBe(false);
		expect(encoded.includes('/')).toBe(false);
		expect(encoded.endsWith('=')).toBe(false);
	});

	it('validateUrlDirective returns null on invalid', () => {
		const invalid = { directive: { mode: 'projects', data: { variant: 'oops' } }, theme: 'cold' };
		const validated = validateUrlState(invalid);
		expect(validated).toBeNull();
	});

	it('rejects overly large pendingClarify options', () => {
		const pending: any = {
			slot: 's'.repeat(1000),
			kind: 'choice',
			options: Array.from({ length: 100 }, (_, i) => 'x'.repeat(1000)),
		};
		const raw: any = {
			directive: base,
			message: 'q',
			pendingClarify: pending,
			theme: 'cold',
		};
		// validateUrlState should return null for invalid shapes
		expect(validateUrlState(raw)).toBeNull();
	});
});
