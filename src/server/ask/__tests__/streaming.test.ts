import { afterEach, describe, expect, it, vi } from 'vitest';
import { emitSyntheticWordStream } from '../streaming';

describe('emitSyntheticWordStream', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('emits multiword text as multiple whitespace-preserving chunks', async () => {
		const deltas: string[] = [];

		await emitSyntheticWordStream({
			text: 'Hello  world\nagain',
			emit: (event) => deltas.push(event.delta),
			delayMs: 0,
		});

		expect(deltas.length).toBeGreaterThan(1);
		expect(deltas.join('')).toBe('Hello  world\nagain');
	});

	it('waits 20ms between chunks and does not add an extra final delay', async () => {
		vi.useFakeTimers();
		const deltas: string[] = [];
		let resolved = false;

		const streamPromise = emitSyntheticWordStream({
			text: 'one two three',
			emit: (event) => deltas.push(event.delta),
		}).then(() => {
			resolved = true;
		});

		expect(deltas).toEqual(['one ']);
		expect(resolved).toBe(false);

		await vi.advanceTimersByTimeAsync(19);
		expect(deltas).toEqual(['one ']);
		expect(resolved).toBe(false);

		await vi.advanceTimersByTimeAsync(1);
		expect(deltas).toEqual(['one ', 'two ']);
		expect(resolved).toBe(false);

		await vi.advanceTimersByTimeAsync(19);
		expect(deltas).toEqual(['one ', 'two ']);
		expect(resolved).toBe(false);

		await vi.advanceTimersByTimeAsync(1);
		expect(deltas).toEqual(['one ', 'two ', 'three']);
		expect(resolved).toBe(true);

		await streamPromise;
	});

	it('handles empty text without emitting anything', async () => {
		const deltas: string[] = [];

		await emitSyntheticWordStream({
			text: '',
			emit: (event) => deltas.push(event.delta),
			delayMs: 0,
		});

		expect(deltas).toEqual([]);
	});

	it('handles a single token without waiting for timers', async () => {
		vi.useFakeTimers();
		const deltas: string[] = [];
		let resolved = false;

		const streamPromise = emitSyntheticWordStream({
			text: 'hello',
			emit: (event) => deltas.push(event.delta),
		}).then(() => {
			resolved = true;
		});

		await Promise.resolve();

		expect(deltas).toEqual(['hello']);
		expect(resolved).toBe(true);

		await streamPromise;
	});
});
