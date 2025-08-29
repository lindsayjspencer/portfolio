'use client';

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';

export interface FpsCounterRef {
	updateFps: () => void;
}

const FpsCounter = forwardRef<FpsCounterRef>((_, ref) => {
	const [fps, setFps] = useState(0);
	const frameTimesRef = useRef<number[]>([]);
	const lastFrameTimeRef = useRef(performance.now());

	const updateFps = () => {
		const now = performance.now();
		const deltaTime = now - lastFrameTimeRef.current;
		lastFrameTimeRef.current = now;

		frameTimesRef.current.push(deltaTime);
		if (frameTimesRef.current.length > 60) {
			frameTimesRef.current.shift();
		}

		// Update FPS every 10 frames
		if (frameTimesRef.current.length % 10 === 0) {
			const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
			setFps(Math.round(1000 / avgDelta));
		}
	};

	useImperativeHandle(ref, () => ({
		updateFps,
	}));

	return (
		<div
			style={{
				position: 'absolute',
				bottom: '10px',
				right: '10px',
				background: 'rgba(0,0,0,0.7)',
				color: 'white',
				padding: '4px 8px',
				borderRadius: '4px',
				fontSize: '12px',
				fontFamily: 'monospace',
				zIndex: 1000,
			}}
		>
			{fps} FPS
		</div>
	);
});

FpsCounter.displayName = 'FpsCounter';

export default FpsCounter;