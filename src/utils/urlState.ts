import { z } from 'zod';
import type { ClarifyPayload } from '~/lib/ai/clarifyTool';
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

// New top-level URL state type: directive (structure-only), latest streamed message text, and theme
export type UrlState = {
	directive: UrlDirective;
	message?: string;
	/** Present only during a clarify turn; persisted to render options after refresh */
	pendingClarify?: ClarifyPayload;
	theme: ThemeName;
};

export function encodeUrlState(state: UrlState): string {
	const json = JSON.stringify(state);
	const b64url = toBase64Url(toBase64(json));
	if (b64url.length <= UNCOMPRESSED_THRESHOLD) return b64url;

	const compressed = 'c:' + compressToEncodedURIComponent(json);
	if (compressed.length <= HARD_CAP) return compressed;

	throw new UrlStateTooLargeError();
}

export function decodeUrlState(encoded: string): unknown | null {
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

// URL-state directive schema: structure-only — no narration, no theme; passthrough extra fields.
const Theme = z.enum(getThemeNames() as [ThemeName, ...ThemeName[]]);

const BaseUrl = {
	highlights: z.array(z.string()).default([]),
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

// Clarify caps for URL persistence
export const PENDING_OPTIONS_MAX = 20;
export const PENDING_OPTION_STR_MAX = 120;
export const PENDING_SLOT_MAX = 64;
export const PENDING_PLACEHOLDER_MAX = 200;

const pendingClarifySchema = z
	.object({
		slot: z.string().min(1).max(PENDING_SLOT_MAX),
		kind: z.enum(['choice', 'free']),
		options: z.array(z.string().min(1).max(PENDING_OPTION_STR_MAX)).max(PENDING_OPTIONS_MAX).optional(),
		multi: z.boolean().optional(),
		placeholder: z.string().max(PENDING_PLACEHOLDER_MAX).optional(),
		// Example and timeout are not needed client-side for persistence; allow but cap
		exampleAnswer: z.string().max(200).optional(),
		timeoutSec: z.number().int().positive().max(600).optional(),
	})
	.strict();

// UrlState schema and validation
const urlStateSchema = z.object({
	directive: urlDirectiveSchema,
	message: z.string().optional(),
	pendingClarify: pendingClarifySchema.optional(),
	theme: Theme,
});
export type ValidUrlState = z.infer<typeof urlStateSchema>;

export function validateUrlState(data: unknown): ValidUrlState | null {
	const res = urlStateSchema.safeParse(data);
	return res.success ? res.data : null;
}

// Bridge: Convert a ValidUrlState to the store's Directive shape (unchanged; messages are separate)
export function toStoreDirectiveFromUrlState(s: ValidUrlState): Directive {
	return s.directive as Directive;
}
