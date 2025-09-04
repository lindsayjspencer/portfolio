'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import { handleChatSubmit } from '~/lib/chat-actions';
import { useTheme } from '~/contexts/theme-context';
import './SuggestionChips.scss';

const ALL_QUESTIONS = [
	"What's your experience with modern web frameworks?",
	'Why should we hire you over an AI?',
	'What are you most proud of in your career?',
	'Do you have experience in Typescript?',
	'Are you just another programmer?',
	'How does this portfolio work?',
	'Show me your React projects',
];

function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
	}
	return shuffled;
}

export function SuggestionChips() {
	const { messages, directive, isLoading, addMessage, setDirective, setLoading, setPendingClarify, setInput } =
		usePortfolioStore();
	const { setTheme } = useTheme();

	const hasHadInteraction = messages.length > 0;
	const landingMode = directive.mode === 'landing' && !hasHadInteraction;
	const [shouldRender, setShouldRender] = useState(landingMode);
	const [isAnimating, setIsAnimating] = useState(false);

	const [randomQuestions, setRandomQuestions] = useState<string[]>([]);

	useEffect(() => {
		if (landingMode && shouldRender) {
			const questions = shuffleArray([...ALL_QUESTIONS]).slice(0, 2);
			setRandomQuestions([...questions, 'Just put the resume in the bag']);
		}
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

		await handleChatSubmit({
			userMessage: question,
			messages,
			directive,
			addMessage,
			setDirective,
			setLoading,
			setPendingClarify,
			setTheme,
		});
	};

	if (!shouldRender) {
		return null;
	}

	const className = `suggestion-chips ${landingMode ? 'landing-mode' : 'exiting'}`;

	return (
		<div className={className}>
			<div className="chips-container">
				{randomQuestions.map((question, index) => (
					<button
						key={index}
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
