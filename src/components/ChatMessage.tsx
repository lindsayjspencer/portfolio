import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { type ChatMessage } from '~/lib/PortfolioStore';
import './ChatMessage.scss';

interface ChatMessageProps {
	message: ChatMessage;
	userName?: string;
}

const components: Components = {
	// Override default elements with custom styling
	p: ({ children }) => <p>{children}</p>,
	ul: ({ children }) => <ul>{children}</ul>,
	ol: ({ children }) => <ol>{children}</ol>,
	li: ({ children }) => <li>{children}</li>,
	code: ({ className, children, ...props }) => (
		<code className={className ?? ''} {...props}>
			{children}
		</code>
	),
	pre: ({ children }) => <pre>{children}</pre>,
	a: ({ children, ...props }) => (
		<a target="_blank" rel="noopener noreferrer" {...props}>
			{children}
		</a>
	),
};

const Markdown = ({ children }: { children: string }) => {
	return (
		<div className="markdown-content">
			<ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
				{children}
			</ReactMarkdown>
		</div>
	);
};

export function ChatMessage({ message, userName = 'You' }: ChatMessageProps) {
	const isAI = message.role === 'assistant';

	return (
		<div className={`chat-message ${isAI ? 'ai-message' : 'user-message'}`}>
			<div className="message-sender">{isAI ? 'Assistant' : userName}</div>
			<div className="message-content">
				<Markdown>{message.content}</Markdown>
			</div>
			{message.directive && (
				<div className="message-directive">
					Mode: {message.directive.mode}
					{message.directive.highlights && message.directive.highlights.length > 0 && (
						<span> • Highlighting {message.directive.highlights.length} items</span>
					)}
				</div>
			)}
		</div>
	);
}
