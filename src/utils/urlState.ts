import { z } from 'zod';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { Directive } from '~/lib/ai/directiveTools';
import { getThemeNames, type ThemeName } from '~/lib/themes';

function toBase64(input: string): string {
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(input, 'utf-8').toString('base64');
	}
	return btoa(unescape(encodeURIComponent(input)));
}

function fromBase64(input: string): string {
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(input, 'base64').toString('utf-8');
	}
	return decodeURIComponent(escape(atob(input)));
}

function toBase64Url(b64: string): string {
	return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(b64url: string): string {
	const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
	const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
	return fromBase64(b64 + pad);
}

export const UNCOMPRESSED_THRESHOLD = 1800;
export const HARD_CAP = 7500;

export class UrlStateTooLargeError extends Error {
	constructor(message = 'Encoded URL state exceeds hard cap') {
		super(message);
		this.name = 'UrlStateTooLargeError';
	}
}

const Theme = z.enum(getThemeNames() as [ThemeName, ...ThemeName[]]);

const HighlightsOption = {
	highlights: z.array(z.string()).default([]),
};

const timelineData = z.object({
	...HighlightsOption,
	variant: z.enum(['career', 'projects', 'skills']).default('career'),
});

const projectsData = z.object({
	...HighlightsOption,
	variant: z.enum(['grid', 'radial', 'case-study']).default('grid'),
	pinned: z.array(z.string()).optional(),
});

const skillsData = z.object({
	...HighlightsOption,
	variant: z.enum(['technical', 'soft', 'matrix']).default('technical'),
});

const valuesData = z.object({
	...HighlightsOption,
	variant: z.enum(['mindmap', 'evidence']).default('mindmap'),
});

const compareData = z.object({
	...HighlightsOption,
	variant: z.enum(['skills', 'projects', 'frontend-vs-backend']).default('skills'),
	leftId: z.string(),
	rightId: z.string(),
});

const exploreData = z.object({
	...HighlightsOption,
});

const landingData = z.object({});
const resumeData = z.object({});

const urlDirectiveSchema = z.discriminatedUnion('mode', [
	z.object({ mode: z.literal('timeline'), theme: Theme, data: timelineData }),
	z.object({ mode: z.literal('projects'), theme: Theme, data: projectsData }),
	z.object({ mode: z.literal('skills'), theme: Theme, data: skillsData }),
	z.object({ mode: z.literal('values'), theme: Theme, data: valuesData }),
	z.object({ mode: z.literal('compare'), theme: Theme, data: compareData }),
	z.object({ mode: z.literal('explore'), theme: Theme, data: exploreData }),
	z.object({ mode: z.literal('landing'), theme: Theme, data: landingData }),
	z.object({ mode: z.literal('resume'), theme: Theme, data: resumeData }),
]);

export type UrlDirective = z.infer<typeof urlDirectiveSchema>;
export type UrlState = UrlDirective;
export type ValidUrlState = z.infer<typeof urlDirectiveSchema>;

export function encodeUrlState(state: UrlState): string {
	const json = JSON.stringify(state);
	const b64url = toBase64Url(toBase64(json));
	if (b64url.length <= UNCOMPRESSED_THRESHOLD) return b64url;

	const compressed = `c:${compressToEncodedURIComponent(json)}`;
	if (compressed.length <= HARD_CAP) return compressed;

	throw new UrlStateTooLargeError();
}

export function decodeUrlState(encoded: string): unknown {
	try {
		if (encoded.startsWith('c:')) {
			const decompressed = decompressFromEncodedURIComponent(encoded.slice(2));
			if (!decompressed) return null;
			return JSON.parse(decompressed);
		}

		return JSON.parse(fromBase64Url(encoded));
	} catch {
		return null;
	}
}

export function validateUrlDirective(data: unknown): UrlDirective | null {
	const result = urlDirectiveSchema.safeParse(data);
	if (!result.success) return null;
	return result.data;
}

export function validateUrlState(data: unknown): ValidUrlState | null {
	return validateUrlDirective(data);
}

export function toStoreDirectiveFromUrlState(state: ValidUrlState): Directive {
	return state as Directive;
}
