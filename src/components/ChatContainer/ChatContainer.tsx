'use client';

import './ChatContainer.scss';
import { useEffect, useMemo, useRef, useCallback } from 'react';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import { MaterialIcon, Spinner } from '~/components/Ui';
import TreeStream from 'react-tree-stream';
import { handleChatSubmit } from '~/lib/chat-actions';
import { useApplyDirective } from '~/hooks/useApplyDirective';
import { createProjectsDirective } from '~/lib/ai/directiveTools';

interface ChatContainerProps {
	onSubmitSuccess?: () => void;
}

export function ChatContainer({ onSubmitSuccess }: ChatContainerProps) {
	const {
		input,
		messages,
		directive,
		isLoading,
		streamedText,
		setInput,
		setLoading,
		setStreamedText,
		setDirective,
		addMessage,
		pendingSuggestedAnswers,
		setPendingSuggestedAnswers,
	} = usePortfolioStore();

	const hasHadInteraction = messages.length > 0;
	const landingMode = directive.mode === 'landing' && !hasHadInteraction;

	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const applyDirective = useApplyDirective();
	const latestAssistantMessage = useMemo(
		() =>
			[...messages]
				.reverse()
				.find((message) => message.role === 'assistant')?.content ?? '',
		[messages],
	);
	const visibleAssistantText = streamedText || (!isLoading ? latestAssistantMessage : '');

	const submitChatMessage = useCallback(
		async (userMessage: string) => {
			setStreamedText('');

			await handleChatSubmit({
				userMessage,
				messages,
				directive,
				addMessage,
				setDirective,
				setLoading,
				setPendingSuggestedAnswers,
				onTextDelta: (delta) => setStreamedText((prev) => prev + delta),
			});

			onSubmitSuccess?.();
		},
		[
			addMessage,
			directive,
			messages,
			onSubmitSuccess,
			setDirective,
			setLoading,
			setStreamedText,
			setPendingSuggestedAnswers,
		],
	);

	// narrative now comes from directive data; no component seeding needed

	// Emphasis processor: **bold** or *bold* => <strong>, _italic_ => <i>
	const processEmphasis = useCallback((segment: string, lineIdx: number) => {
		const out: React.ReactNode[] = [];
		const regex = /(\*\*([^*]+?)\*\*|\*([^*]+?)\*|_([^_]+?)_)/g;
		let lastIndex = 0;
		let match: RegExpExecArray | null;
		let idx = 0;
		while ((match = regex.exec(segment)) !== null) {
			const [full, , gBold2, gBold1, gItalic] = match as unknown as [
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
					<TreeStream as="i" key={`it-${lineIdx}-${idx++}`}>
						{content}
					</TreeStream>,
				);
			} else {
				out.push(
					<TreeStream as="strong" key={`em-${lineIdx}-${idx++}`}>
						{content}
					</TreeStream>,
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
							applyDirective(
								createProjectsDirective(directive.theme, {
									variant: 'case-study',
									highlights: [projectId],
								}),
							);
						}}
						key={`proj-${lineIdx}-${projIdx++}`}
					>
						<TreeStream as="span">{processEmphasis(label ?? '', lineIdx)}</TreeStream>
					</a>,
				);
				projLast = end;
			}
			if (projLast < text.length) nodes.push(...processEmphasis(text.slice(projLast), lineIdx));
			return nodes;
		},
		[applyDirective, directive.theme, processEmphasis],
	);

	// No directive-based narration; all user-facing text is streamed

	// Transform streamed text (used during loading and for suggested-answer questions)
	const streamingNodes = useMemo(() => {
		if (!visibleAssistantText) return null;
		const lines = visibleAssistantText.split('\n');
		const out: React.ReactNode[] = [];
		lines.forEach((line, i) => {
			out.push(...makeInlineNodes(line, i));
			if (i < lines.length - 1) out.push(<br key={`sbr-${i}`} />);
		});
		return out;
	}, [visibleAssistantText, makeInlineNodes]);

	const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (isLoading) return;
		if (!input.trim()) return;
		const userMessage = input.trim();

		setInput('');

		// Ensure textarea resizes after programmatic value change
		requestAnimationFrame(() => {
			const el = inputRef.current;
			if (el) {
				el.style.height = 'auto';
				el.style.height = el.scrollHeight + 'px';
			}
		});

		// reset streamed text and begin streaming
		await submitChatMessage(userMessage);
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
		if (isLoading) return;
		setInput('');
		void submitChatMessage(option);
	};

	// Keep streamed text after completion so the final answer remains visible.

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

	const hasTypedInput = input.trim().length > 0;
	const isSubmitDisabled = isLoading || !hasTypedInput;

	return (
		<div ref={containerRef} className={`chat-container ${landingMode ? 'landing-mode' : ''}`}>
			<form onSubmit={onSubmit} className="chat-form">
				{isLoading && <div className="loading-response" />}

				{/* Single streaming area for all user-facing text */}
				{streamingNodes && <div className="streaming-text">{streamingNodes}</div>}

				{/* Suggested answers (if any) beneath the streamed text */}
				{pendingSuggestedAnswers?.answers && (
					<TreeStream className="suggested-answers">
						{pendingSuggestedAnswers.answers.map((option) => (
							<TreeStream
								as="button"
								key={option}
								type="button"
								onClick={() => handleOptionClick(option)}
								disabled={isLoading}
								className="option-chip"
							>
								{option}
							</TreeStream>
						))}
					</TreeStream>
				)}

				<div className="input-container">
					<textarea
						ref={inputRef}
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
						disabled={isSubmitDisabled}
						className={`submit-button ${isSubmitDisabled ? 'disabled' : 'enabled'}`}
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

