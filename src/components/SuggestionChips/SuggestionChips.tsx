'use client';

import { useState, useEffect } from 'react';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import { handleChatSubmit } from '~/lib/chat-actions';
import {
	LANDING_FIXED_SUGGESTION_CHIP_QUESTION,
	LANDING_ROTATING_SUGGESTION_CHIP_QUESTIONS,
} from './questions';
import './SuggestionChips.scss';

function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
	}
	return shuffled;
}

export function SuggestionChips() {
	const {
		messages,
		directive,
		isLoading,
		addMessage,
		setDirective,
		setLoading,
		setStreamedText,
		setPendingSuggestedAnswers,
		setInput,
	} = usePortfolioStore();

	const hasHadInteraction = messages.length > 0;
	const landingMode = directive.mode === 'landing' && !hasHadInteraction;
	const [shouldRender, setShouldRender] = useState(landingMode);
	const [isAnimating, setIsAnimating] = useState(false);

	const [randomQuestions, setRandomQuestions] = useState<string[]>([]);
	const [fadingOut, setFadingOut] = useState(false);
	const [shuffleKey, setShuffleKey] = useState(0);

	// Rotate questions: reshuffle every 8 seconds while visible on landing
	useEffect(() => {
		if (!(landingMode && shouldRender)) return;

		const pick = () => {
			const questions = shuffleArray([...LANDING_ROTATING_SUGGESTION_CHIP_QUESTIONS]).slice(0, 2);
			setRandomQuestions([...questions, LANDING_FIXED_SUGGESTION_CHIP_QUESTION]);
		};

		// initial pick (no fade-out on first render)
		pick();
		setShuffleKey((k) => k + 1);

		let fadeTimeout: ReturnType<typeof setTimeout> | null = null;
		const rotate = () => {
			setFadingOut(true);
			fadeTimeout = setTimeout(() => {
				pick();
				setShuffleKey((k) => k + 1);
				setFadingOut(false);
			}, 220); // match CSS exit duration
		};

		const id = setInterval(rotate, 8000);
		return () => {
			clearInterval(id);
			if (fadeTimeout) clearTimeout(fadeTimeout);
		};
	}, [landingMode, shouldRender]);

	useEffect(() => {
		if (landingMode) {
			setShouldRender(true);
			setIsAnimating(false);
		} else if (shouldRender && !isAnimating) {
			setIsAnimating(true);
			const timer = setTimeout(() => {
				setShouldRender(false);
				setIsAnimating(false);
			}, 400);

			return () => {
				clearTimeout(timer);
			};
		}
	}, [landingMode, shouldRender, isAnimating]);

	const handleChipClick = async (question: string) => {
		if (isLoading) return;

		setInput('');
		setStreamedText('');

		await handleChatSubmit({
			userMessage: question,
			messages,
			directive,
			addMessage,
			setDirective,
			setLoading,
			setPendingSuggestedAnswers,
			onTextDelta: (delta) => setStreamedText((prev) => prev + delta),
		});
	};

	if (!shouldRender) {
		return null;
	}

	const className = `suggestion-chips ${landingMode ? 'landing-mode' : 'exiting'}`;

	return (
		<div className={className}>
			<div className={`chips-container ${fadingOut ? 'fading-out' : ''}`}>
				{randomQuestions.map((question, index) => (
					<button
						key={`${shuffleKey}-${index}`}
						className="suggestion-chip"
						onClick={() => handleChipClick(question)}
						disabled={isLoading}
					>
						{question}
					</button>
				))}
			</div>
		</div>
	);
}
