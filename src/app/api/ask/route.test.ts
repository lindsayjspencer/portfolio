import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseAskSseBlock } from '~/lib/askStream';
import type { LanguageModelUsage } from 'ai';

const streamTextMock = vi.fn();
const traceUpdateMock = vi.fn();
const traceGenerationMock = vi.fn();
const flushAsyncMock = vi.fn();

vi.mock('ai', () => ({
	streamText: streamTextMock,
	tool: <T>(config: T) => config,
}));

vi.mock('~/server/langfuse', () => ({
	langfuse: {
		trace: () => ({
			update: traceUpdateMock,
			generation: traceGenerationMock,
		}),
		flushAsync: flushAsyncMock,
	},
}));

function createUsage(): LanguageModelUsage {
	return {
		inputTokens: 10,
		outputTokens: 5,
		totalTokens: 15,
		inputTokenDetails: {
			cacheReadTokens: 0,
			cacheWriteTokens: 0,
			noCacheTokens: 10,
		},
		outputTokenDetails: {
			reasoningTokens: 0,
			textTokens: 5,
		},
	};
}

async function* createFullStream(parts: unknown[]) {
	for (const part of parts) {
		yield part;
	}
}

function createStreamResult(parts: unknown[]) {
	return {
		fullStream: createFullStream(parts),
		totalUsage: Promise.resolve(createUsage()),
	};
}

afterEach(() => {
	streamTextMock.mockReset();
	traceUpdateMock.mockReset();
	traceGenerationMock.mockReset();
	flushAsyncMock.mockReset();
	flushAsyncMock.mockResolvedValue(undefined);
});

describe('POST /api/ask', () => {
	it('emits directive before narration, never forwards planner text, and uses a tool-free narrator call', async () => {
		streamTextMock.mockImplementation((_options: unknown) => {
			return streamTextMock.mock.calls.length === 1
				? createStreamResult([
						{ type: 'text-delta', text: 'Internal planning text that should never reach the user.' },
						{
							type: 'tool-call',
							toolName: 'showSkillsView',
							input: {
								variant: 'technical',
								highlights: ['skill_typescript'],
								reason: 'A technical skills view best supports the answer.',
							},
						},
					])
				: createStreamResult([
						{
							type: 'text-delta',
							text: "I'm strongest when the work needs deep frontend craft and strong TypeScript judgment.",
						},
						{
							type: 'text-delta',
							text: ' That usually means turning messy product problems into polished, fast interfaces.',
						},
					]);
		});

		const { POST } = await import('./route');
		const response = await POST(
			new Request('http://localhost/api/ask', {
				method: 'POST',
				body: JSON.stringify({
					messages: [{ role: 'user', content: 'What are you strongest at?' }],
					currentDirective: null,
				}),
				headers: {
					'Content-Type': 'application/json',
				},
			}),
		);

		expect(streamTextMock.mock.calls[0]?.[0]).toMatchObject({
			toolChoice: 'required',
		});

		const body = await response.text();
		const events = body
			.trim()
			.split('\n\n')
			.map((block) => parseAskSseBlock(block))
			.filter((event): event is NonNullable<typeof event> => event !== null);

		expect(events[0]).toMatchObject({
			type: 'directive',
			directive: {
				mode: 'skills',
				theme: 'cold',
				data: {
					variant: 'technical',
					highlights: ['skill_typescript'],
				},
			},
		});
		expect(events[1]).toMatchObject({ type: 'text' });
		expect(body).not.toContain('Internal planning text');
		expect(body).toContain("I'm strongest when the work needs deep frontend craft");
		expect(events.at(-1)).toEqual({ type: 'done', ok: true });
	});
});
