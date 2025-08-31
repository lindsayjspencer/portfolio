'use client';

import { useState, useEffect } from 'react';

interface StreamingTextProps {
	/** The complete text to stream */
	text: string;
	/** Characters per interval (default: 2) */
	speed?: number;
	/** Interval in milliseconds (default: 50) */
	interval?: number;
	/** Whether to start streaming immediately (default: true) */
	autoStart?: boolean;
	/** Callback when streaming completes */
	onComplete?: () => void;
	/** Custom CSS class */
	className?: string;
}

export function StreamingText({
	text,
	speed = 2,
	interval = 50,
	autoStart = true,
	onComplete,
	className = '',
}: StreamingTextProps) {
	const [displayedText, setDisplayedText] = useState('');
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isStreaming, setIsStreaming] = useState(autoStart);
	const [isComplete, setIsComplete] = useState(false);

	// Reset when text changes
	useEffect(() => {
		setDisplayedText('');
		setCurrentIndex(1);
		setIsComplete(false);
		if (autoStart) {
			setIsStreaming(true);
		}
	}, [text, autoStart]);

	// Streaming effect
	useEffect(() => {
		if (!isStreaming || isComplete) {
			return;
		}

		// Split text into words for word-by-word streaming
		const words = text.split(/(\s+)/); // Keep whitespace

		if (currentIndex >= words.length) {
			if (!isComplete) {
				setIsComplete(true);
				setIsStreaming(false);
				onComplete?.();
			}
			return;
		}

		const timer = setTimeout(() => {
			const nextIndex = Math.min(currentIndex + speed, words.length);
			const wordsToShow = words.slice(0, nextIndex);
			setDisplayedText(wordsToShow.join(''));
			setCurrentIndex(nextIndex);
		}, interval);

		return () => clearTimeout(timer);
	}, [currentIndex, text, speed, interval, isStreaming, isComplete, onComplete]);

	// Public methods for external control
	const start = () => {
		if (!isComplete) {
			setIsStreaming(true);
		}
	};

	const pause = () => {
		setIsStreaming(false);
	};

	const reset = () => {
		setDisplayedText('');
		setCurrentIndex(0);
		setIsComplete(false);
		setIsStreaming(autoStart);
	};

	const complete = () => {
		setDisplayedText(text);
		const words = text.split(/(\s+)/);
		setCurrentIndex(words.length);
		setIsComplete(true);
		setIsStreaming(false);
		onComplete?.();
	};

	// Expose control methods via ref
	useEffect(() => {
		const element = document.querySelector(`[data-streaming-text]`) as any;
		if (element) {
			element.streamingControls = { start, pause, reset, complete };
		}
	});

	return (
		<div className={className} data-streaming-text data-streaming={isStreaming} data-complete={isComplete}>
			{displayedText}
		</div>
	);
}

// Hook for external control
export function useStreamingText(ref?: React.RefObject<HTMLElement>) {
	const start = () => {
		const element = ref?.current?.querySelector('[data-streaming-text]') as any;
		element?.streamingControls?.start();
	};

	const pause = () => {
		const element = ref?.current?.querySelector('[data-streaming-text]') as any;
		element?.streamingControls?.pause();
	};

	const reset = () => {
		const element = ref?.current?.querySelector('[data-streaming-text]') as any;
		element?.streamingControls?.reset();
	};

	const complete = () => {
		const element = ref?.current?.querySelector('[data-streaming-text]') as any;
		element?.streamingControls?.complete();
	};

	return { start, pause, reset, complete };
}
