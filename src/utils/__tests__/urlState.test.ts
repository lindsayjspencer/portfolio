import { describe, it, expect } from 'vitest';
import {
	HARD_CAP,
	UNCOMPRESSED_THRESHOLD,
	UrlStateTooLargeError,
	decodeUrlState,
	encodeUrlState,
	toStoreDirectiveFromUrlState,
	validateUrlState,
} from '../urlState';
import { getDirectiveHighlights, type Directive } from '~/lib/ai/directiveTools';

describe('urlState utils', () => {
	const base: Directive = {
		mode: 'timeline',
		theme: 'cold',
		data: {
			variant: 'career',
			highlights: [],
		},
	};

	it('encodes and decodes round-trip', () => {
		const encoded = encodeUrlState(base);
		const raw = decodeUrlState(encoded);
		const validated = validateUrlState(raw);

		expect(validated).not.toBeNull();

		const bridged = toStoreDirectiveFromUrlState(validated!);
		expect(bridged.mode).toBe('timeline');
		expect(bridged.theme).toBe('cold');
		if (bridged.mode === 'timeline') {
			expect(bridged.data.variant).toBe('career');
		}
	});

	it('uses compression when directive state exceeds threshold and still round-trips', () => {
		const encoded = encodeUrlState({
			...base,
			data: {
				...base.data,
				highlights: ['x'.repeat(UNCOMPRESSED_THRESHOLD)],
			},
		});

		expect(encoded.startsWith('c:')).toBe(true);

		const raw = decodeUrlState(encoded);
		const validated = validateUrlState(raw);
		expect(validated).not.toBeNull();
		expect(validated ? getDirectiveHighlights(validated) : []).toHaveLength(1);
	});

	it('throws UrlStateTooLargeError when compressed directive state exceeds the hard cap', () => {
		const rand = (len: number) =>
			Array.from({ length: len })
				.map(() => {
					const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
					return chars.charAt(Math.floor(Math.random() * chars.length));
				})
				.join('');

		const hugeDirective: Directive = {
			...base,
			data: {
				...base.data,
				highlights: Array.from({ length: 16 }, () => rand(1000)),
			},
		};

		expect(() => encodeUrlState(hugeDirective)).toThrow(UrlStateTooLargeError);
		expect(encodeUrlState(base).length).toBeLessThanOrEqual(HARD_CAP);
	});

	it('uses URL-safe base64 without padding', () => {
		const encoded = encodeUrlState(base);
		expect(encoded.includes('+')).toBe(false);
		expect(encoded.includes('/')).toBe(false);
		expect(encoded.endsWith('=')).toBe(false);
	});

	it('returns null on invalid directives', () => {
		const invalid = { mode: 'projects', theme: 'cold', data: { variant: 'oops' } };
		const validated = validateUrlState(invalid);
		expect(validated).toBeNull();
	});

	it('strips removed directive fields from URL state', () => {
		const validated = validateUrlState({
			mode: 'explore',
			theme: 'cold',
			data: {
				highlights: ['skill_react'],
				filterTags: ['frontend'],
				hints: { limit: 2 },
			},
		});

		expect(validated).not.toBeNull();
		expect(validated ? getDirectiveHighlights(validated) : []).toEqual(['skill_react']);
		expect('filterTags' in (validated?.data ?? {})).toBe(false);
		expect('hints' in (validated?.data ?? {})).toBe(false);
		expect('confidence' in (validated?.data ?? {})).toBe(false);
	});
});
