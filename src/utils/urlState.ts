import { z } from 'zod';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { Directive } from '~/lib/ai/directiveTools';
import { getThemeNames, type ThemeName } from '~/lib/themes';

// URL-safe base64 helpers
function toBase64(input: string): string {
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(input, 'utf-8').toString('base64');
	}
	// @ts-ignore
	return btoa(unescape(encodeURIComponent(input)));
}

function fromBase64(input: string): string {
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(input, 'base64').toString('utf-8');
	}
	// @ts-ignore
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

export const UNCOMPRESSED_THRESHOLD = 1800; // ~2KB URL budget minus headroom
export const HARD_CAP = 7500; // stay under common 8KB request-line limits

export class UrlStateTooLargeError extends Error {
	constructor(message = 'Encoded URL state exceeds hard cap') {
		super(message);
		this.name = 'UrlStateTooLargeError';
	}
}

export function encodeDirective(directive: Directive): string {
	const json = JSON.stringify(directive);
	const b64url = toBase64Url(toBase64(json));
	if (b64url.length <= UNCOMPRESSED_THRESHOLD) return b64url;

	const compressed = 'c:' + compressToEncodedURIComponent(json);
	if (compressed.length <= HARD_CAP) return compressed;

	throw new UrlStateTooLargeError();
}

export function decodeDirective(encoded: string): unknown | null {
	try {
		if (encoded.startsWith('c:')) {
			const decompressed = decompressFromEncodedURIComponent(encoded.slice(2));
			if (!decompressed) return null;
			return JSON.parse(decompressed);
		}
		const json = fromBase64Url(encoded);
		return JSON.parse(json);
	} catch {
		return null;
	}
}

// URL-state schema: narration optional, theme REQUIRED; passthrough extra fields.
const Theme = z.enum(getThemeNames() as [ThemeName, ...ThemeName[]]);

const BaseUrl = {
	narration: z.string().optional(),
	highlights: z.array(z.string()).default([]),
	theme: Theme, // required in URL state
	confidence: z.number().min(0).max(1).default(0.7),
	hints: z
		.object({
			limit: z.number().int().positive().optional(),
			sortBy: z.enum(['recency', 'impact', 'alpha']).optional(),
		})
		.optional(),
};

const timelineData = z
	.object({
		...BaseUrl,
		variant: z.enum(['career', 'projects', 'skills']).default('career'),
	})
	.passthrough();

const projectsData = z
	.object({
		...BaseUrl,
		variant: z.enum(['grid', 'radial', 'case-study']).default('grid'),
		pinned: z.array(z.string()).optional(),
		showMetrics: z.boolean().optional(),
	})
	.passthrough();

const skillsData = z
	.object({
		...BaseUrl,
		variant: z.enum(['technical', 'soft', 'matrix']).default('technical'),
		focusLevel: z.enum(['expert', 'advanced', 'intermediate']).optional(),
		clusterBy: z.enum(['domain', 'recency', 'usage']).optional(),
	})
	.passthrough();

const valuesData = z
	.object({
		...BaseUrl,
		variant: z.enum(['mindmap', 'evidence']).default('mindmap'),
		emphasizeStories: z.boolean().optional(),
	})
	.passthrough();

const compareData = z
	.object({
		...BaseUrl,
		variant: z.enum(['skills', 'projects', 'frontend-vs-backend']).default('skills'),
		leftId: z.string(),
		rightId: z.string(),
		showOverlap: z.boolean().optional(),
	})
	.passthrough();

const exploreData = z
	.object({
		...BaseUrl,
		variant: z.enum(['all', 'filtered']).default('all'),
		filterTags: z.array(z.string()).optional(),
	})
	.passthrough();

const landingData = z.object({ ...BaseUrl }).passthrough();
const resumeData = z.object({ ...BaseUrl }).passthrough();

const urlDirectiveSchema = z.discriminatedUnion('mode', [
	z.object({ mode: z.literal('timeline'), data: timelineData }),
	z.object({ mode: z.literal('projects'), data: projectsData }),
	z.object({ mode: z.literal('skills'), data: skillsData }),
	z.object({ mode: z.literal('values'), data: valuesData }),
	z.object({ mode: z.literal('compare'), data: compareData }),
	z.object({ mode: z.literal('explore'), data: exploreData }),
	z.object({ mode: z.literal('landing'), data: landingData }),
	z.object({ mode: z.literal('resume'), data: resumeData }),
]);

export type UrlDirective = z.infer<typeof urlDirectiveSchema>;

export function validateUrlDirective(data: unknown): UrlDirective | null {
	const res = urlDirectiveSchema.safeParse(data);
	if (!res.success) return null;
	const d = res.data;
	d.data.highlights = d.data.highlights ?? [];
	d.data.confidence = d.data.confidence ?? 0.7;
	return d;
}

export function ensureThemeInDirective<T extends { data: { theme?: ThemeName } }>(
	directive: T,
	fallbackTheme: ThemeName,
): T {
	if (!directive.data?.theme) {
		return {
			...directive,
			data: {
				...directive.data,
				theme: fallbackTheme,
			},
		} as T;
	}
	return directive;
}

// Bridge: Convert a validated UrlDirective to the store's Directive shape
// by ensuring narration is present (store currently expects it),
// while keeping the URL contract (narration optional) intact.
export function toStoreDirective(d: UrlDirective, narrationDefault = ''): Directive {
	return {
		...d,
		data: {
			...d.data,
			narration: d.data.narration ?? narrationDefault,
		},
	} as Directive;
}
