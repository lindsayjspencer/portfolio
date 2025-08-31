'use client';

import { usePortfolioStore } from '~/lib/PortfolioStore';
import { useTheme } from '~/contexts/theme-context';
import { MaterialIcon, Spinner } from '~/components/Ui';
import { StreamingText } from '~/components/Ui/StreamingText';
import { handleChatSubmit } from '~/lib/chat-actions';

export interface ChatContainerProps {
	isLandingMode: boolean;
	hasHadInteraction: boolean;
	onSubmitSuccess?: () => void;
}

export function ChatContainer({ isLandingMode, hasHadInteraction, onSubmitSuccess }: ChatContainerProps) {
	const {
		input,
		narrative,
		messages,
		directive,
		isLoading,
		isTransitioningFromLanding,
		setInput,
		setNarrative,
		setLoading,
		setDirective,
		addMessage,
		setIsTransitioningFromLanding,
	} = usePortfolioStore();

	const { setTheme } = useTheme();

	const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!input.trim() || isLoading) return;

		const userMessage = input.trim();
		setInput('');

		await handleChatSubmit({
			userMessage,
			messages,
			directive,
			isLandingMode,
			addMessage,
			setDirective,
			setNarrative,
			setLoading,
			setIsTransitioningFromLanding,
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

	return (
		<div className="chat-container">
			<form onSubmit={onSubmit} className="chat-form">
				{!narrative && hasHadInteraction && <div className="loading-response" />}
				{narrative && <StreamingText speed={2} className="streaming-text">{narrative}</StreamingText>}
				<div className="input-container">
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Ask me anything"
						disabled={isLoading}
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
						disabled={isLoading || !input.trim()}
						className={`submit-button ${isLoading || !input.trim() ? 'disabled' : 'enabled'}`}
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
