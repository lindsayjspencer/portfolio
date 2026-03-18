import { useCallback, useEffect, useRef } from 'react';

/**
 * useSequentialScheduler
 *
 * Centralizes setTimeout scheduling with guarantees:
 * - Only callbacks scheduled in the latest run execute (run-token guard)
 * - All timers are cleared on unmount
 * - cancelAll() clears any pending timers for the current run
 */
export function useSequentialScheduler() {
	const runIdRef = useRef(0);
	const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

	const cancelAll = useCallback(() => {
		for (const t of timersRef.current) clearTimeout(t);
		timersRef.current = [];
	}, []);

	const nextRunToken = useCallback(() => {
		runIdRef.current += 1;
		cancelAll();
		return runIdRef.current;
	}, [cancelAll]);

	const schedule = useCallback((fn: () => void, delay = 0) => {
		const token = runIdRef.current;
		const t = setTimeout(() => {
			if (runIdRef.current === token) fn();
		}, Math.max(0, delay));
		timersRef.current.push(t);
		return t;
	}, []);

	useEffect(() => () => cancelAll(), [cancelAll]);

	return { schedule, cancelAll, nextRunToken };
}

export type SequentialScheduler = ReturnType<typeof useSequentialScheduler>;
