'use client';

import './ChatContainer.scss';
import { useEffect, useRef } from 'react';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import { useTheme } from '~/contexts/theme-context';
import { MaterialIcon, Spinner } from '~/components/Ui';
import { StreamingText } from '~/components/Ui/StreamingText';
import { handleChatSubmit } from '~/lib/chat-actions';
import { useState } from 'react';

export interface ChatContainerProps {
	onSubmitSuccess?: () => void;
}

export function ChatContainer({ onSubmitSuccess }: ChatContainerProps) {
	const {
		input,
		narrative,
		messages,
		directive,
		isLoading,
		setInput,
		setNarrative,
		setLoading,
		setDirective,
		addMessage,
		pendingClarify,
		setPendingClarify,
	} = usePortfolioStore();
	
	const hasHadInteraction = messages.length > 0;
	const landingMode = directive.mode === 'landing' && !hasHadInteraction;

	const { setTheme } = useTheme();
	const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
	const containerRef = useRef<HTMLDivElement>(null);

	const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (isLoading) return;

		let userMessage: string;

		if (pendingClarify) {
			// Handle clarify response
			if (pendingClarify.kind === 'choice' && selectedOptions.length > 0) {
				const answer = pendingClarify.multi ? selectedOptions.join(', ') : selectedOptions[0];
				userMessage = `[clarify:${pendingClarify.slot}] ${answer}`;
			} else if (pendingClarify.kind === 'free' && input.trim()) {
				userMessage = `[clarify:${pendingClarify.slot}] ${input.trim()}`;
			} else {
				return; // Invalid state, don't submit
			}

			// Clear clarify state
			setPendingClarify(undefined);
			setSelectedOptions([]);
		} else {
			// Regular chat submission
			if (!input.trim()) return;
			userMessage = input.trim();
		}

		setInput('');

		await handleChatSubmit({
			userMessage,
			messages,
			directive,
			addMessage,
			setDirective,
			setNarrative,
			setLoading,
			setPendingClarify,
			setTheme,
		});

		onSubmitSuccess?.();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			const form = e.currentTarget.form;
			if (form) {
				form.requestSubmit();
			}
		}
	};

	const handleOptionClick = (option: string) => {
		if (!pendingClarify || pendingClarify.kind !== 'choice') return;

		if (pendingClarify.multi) {
			setSelectedOptions((prev) =>
				prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
			);
		} else {
			// Single choice - auto submit
			setSelectedOptions([option]);
			setTimeout(async () => {
				const userMessage = `[clarify:${pendingClarify.slot}] ${option}`;
				setPendingClarify(undefined);
				setSelectedOptions([]);

				await handleChatSubmit({
					userMessage,
					messages,
					directive,
					addMessage,
					setDirective,
					setNarrative,
					setLoading,
					setPendingClarify,
					setTheme,
				});

				onSubmitSuccess?.();
			}, 100);
		}
	};

	// Clear selected options when clarify changes
	useEffect(() => {
		if (!pendingClarify) {
			setSelectedOptions([]);
		}
	}, [pendingClarify]);

	// Set up ResizeObserver to track chat container height
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const updateChatHeight = () => {
			const rect = container.getBoundingClientRect();
			document.documentElement.style.setProperty('--chat-container-height', `${rect.height}px`);
		};

		const resizeObserver = new ResizeObserver(updateChatHeight);
		resizeObserver.observe(container);

		// Initial measurement
		updateChatHeight();

		return () => {
			resizeObserver.disconnect();
		};
	}, []);

	return (
		<div ref={containerRef} className={`chat-container ${landingMode ? 'landing-mode' : ''}`}>
			<form onSubmit={onSubmit} className="chat-form">
				{isLoading && <div className="loading-response" />}

				{/* Show clarify question in narration area */}
				{pendingClarify && (
					<StreamingText className="streaming-text">
						<StreamingText>{pendingClarify.question}</StreamingText>

						{/* Show option chips for choice clarifications */}
						{pendingClarify.kind === 'choice' && pendingClarify.options && (
							<StreamingText className="clarify-options">
								{pendingClarify.options.map((option) => (
									<StreamingText
										as="button"
										key={option}
										type="button"
										onClick={() => handleOptionClick(option)}
										className={`option-chip ${selectedOptions.includes(option) ? 'selected' : ''}`}
										about={selectedOptions.includes(option) ? 'hello' : ''}
									>
										{option}
									</StreamingText>
								))}
							</StreamingText>
						)}
					</StreamingText>
				)}

				{/* Show regular narrative */}
				{narrative && !pendingClarify && (
					<StreamingText speed={2} className="streaming-text">
						{narrative}
					</StreamingText>
				)}

				<div className="input-container">
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={
							pendingClarify?.kind === 'free'
								? pendingClarify.placeholder || 'Type your answer...'
								: pendingClarify?.kind === 'choice' && pendingClarify.multi
									? 'Click options above or type a custom answer...'
									: 'Ask me anything'
						}
						disabled={isLoading || (pendingClarify?.kind === 'choice' && !pendingClarify.multi)}
						className="chat-input"
						rows={1}
						onInput={(e) => {
							const target = e.target as HTMLTextAreaElement;
							target.style.height = 'auto';
							target.style.height = target.scrollHeight + 'px';
						}}
					/>
					<button
						type="submit"
						disabled={
							isLoading ||
							(pendingClarify?.kind === 'choice' &&
								!pendingClarify.multi &&
								selectedOptions.length === 0) ||
							(pendingClarify?.kind === 'choice' &&
								pendingClarify.multi &&
								selectedOptions.length === 0 &&
								!input.trim()) ||
							(pendingClarify?.kind === 'free' && !input.trim()) ||
							(!pendingClarify && !input.trim())
						}
						className={`submit-button ${
							isLoading ||
							(pendingClarify?.kind === 'choice' &&
								!pendingClarify.multi &&
								selectedOptions.length === 0) ||
							(pendingClarify?.kind === 'choice' &&
								pendingClarify.multi &&
								selectedOptions.length === 0 &&
								!input.trim()) ||
							(pendingClarify?.kind === 'free' && !input.trim()) ||
							(!pendingClarify && !input.trim())
								? 'disabled'
								: 'enabled'
						}`}
					>
						{isLoading ? (
							<Spinner size="sm" color="neutral-500" />
						) : (
							<MaterialIcon name="arrow_upward" size="sm" />
						)}
					</button>
				</div>
			</form>
		</div>
	);
}
