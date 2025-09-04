'use client';

import './ChatContainer.scss';
import { useEffect, useMemo, useRef, useCallback } from 'react';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import { useTheme } from '~/contexts/theme-context';
import { MaterialIcon, Spinner } from '~/components/Ui';
import { StreamingText } from '~/components/Ui/StreamingText';
import { handleChatSubmit } from '~/lib/chat-actions';
import { useState } from 'react';
import { useApplyDirective } from '~/hooks/useApplyDirective';

export interface ChatContainerProps {
	onSubmitSuccess?: () => void;
}

export function ChatContainer({ onSubmitSuccess }: ChatContainerProps) {
	const {
		input,
		messages,
		directive,
		isLoading,
		setInput,
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
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const applyDirective = useApplyDirective();

	// narrative now comes from directive data; no component seeding needed

	// Emphasis processor: **bold** or *bold* => <strong>, _italic_ => <i>
	const processEmphasis = useCallback((segment: string, lineIdx: number) => {
		const out: React.ReactNode[] = [];
		const regex = /(\*\*([^*]+?)\*\*|\*([^*]+?)\*|_([^_]+?)_)/g;
		let lastIndex = 0;
		let match: RegExpExecArray | null;
		let idx = 0;
		while ((match = regex.exec(segment)) !== null) {
			const [full, _gBoldAll, gBold2, gBold1, gItalic] = match as unknown as [
				string,
				string,
				string,
				string,
				string,
			];
			const start = match.index;
			const end = start + full.length;
			if (start > lastIndex) out.push(segment.slice(lastIndex, start));
			const content = gBold2 ?? gBold1 ?? gItalic ?? '';
			if (gItalic) {
				out.push(
					<StreamingText as="i" key={`it-${lineIdx}-${idx++}`}>
						{content}
					</StreamingText>,
				);
			} else {
				out.push(
					<StreamingText as="strong" key={`em-${lineIdx}-${idx++}`}>
						{content}
					</StreamingText>,
				);
			}
			lastIndex = end;
		}
		if (lastIndex < segment.length) out.push(segment.slice(lastIndex));
		return out;
	}, []);

	// Inline node maker: handles <project:...>Label</project> and emphasis inside
	const makeInlineNodes = useCallback(
		(text: string, lineIdx: number) => {
			const nodes: React.ReactNode[] = [];
			const projectRe = /<project:([a-zA-Z0-9_\-]+)>([\s\S]*?)<\/project>/g;
			let projLast = 0;
			let pm: RegExpExecArray | null;
			let projIdx = 0;
			while ((pm = projectRe.exec(text)) !== null) {
				const [full, projectId, label] = pm;
				if (!projectId) continue;
				const start = pm.index;
				const end = start + full.length;
				if (start > projLast) nodes.push(...processEmphasis(text.slice(projLast, start), lineIdx));
				nodes.push(
					<a
						href="#"
						className="project-link"
						onClick={(e) => {
							e.preventDefault();
							applyDirective({
								mode: 'projects',
								data: {
									variant: 'case-study',
									highlights: [projectId],
									narration: '',
									confidence: 1,
									showMetrics: true,
								},
							});
						}}
						key={`proj-${lineIdx}-${projIdx++}`}
					>
						<StreamingText as="span">{processEmphasis((label ?? '') as string, lineIdx)}</StreamingText>
					</a>,
				);
				projLast = end;
			}
			if (projLast < text.length) nodes.push(...processEmphasis(text.slice(projLast), lineIdx));
			return nodes;
		},
		[applyDirective, processEmphasis],
	);

	// Transform narration
	const narrationNodes = useMemo(() => {
		const narration = directive.data.narration ?? '';
		if (!narration) return null;
		const lines = narration.split('\n');
		const out: React.ReactNode[] = [];
		lines.forEach((line, i) => {
			out.push(...makeInlineNodes(line, i));
			if (i < lines.length - 1) out.push(<br key={`br-${i}`} />);
		});
		return out;
	}, [directive.data.narration, makeInlineNodes]);

	// Transform clarify question similarly
	const clarifyQuestionNodes = useMemo(() => {
		const q = pendingClarify?.question ?? '';
		if (!q) return null;
		const lines = q.split('\n');
		const out: React.ReactNode[] = [];
		lines.forEach((line, i) => {
			out.push(...makeInlineNodes(line, i));
			if (i < lines.length - 1) out.push(<br key={`cbr-${i}`} />);
		});
		return out;
	}, [pendingClarify?.question, makeInlineNodes]);

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

		// Ensure textarea resizes after programmatic value change
		requestAnimationFrame(() => {
			const el = inputRef.current;
			if (el) {
				el.style.height = 'auto';
				el.style.height = el.scrollHeight + 'px';
			}
		});

		await handleChatSubmit({
			userMessage,
			messages,
			directive,
			addMessage,
			setDirective,
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

	// Autofocus textarea on mount
	useEffect(() => {
		inputRef.current?.focus();
	}, []);

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
						<StreamingText>{clarifyQuestionNodes}</StreamingText>

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
				{directive.data.narration && !pendingClarify && !isLoading && (
					<StreamingText speed={2} className="streaming-text">
						{narrationNodes}
					</StreamingText>
				)}

				<div className="input-container">
					<textarea
						ref={inputRef}
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
