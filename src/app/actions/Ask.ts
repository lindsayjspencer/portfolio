'use server';

import { streamText, type ModelMessage } from 'ai';
import { generalModel } from '~/server/model';
import { enhancedDirectiveTool, type DirectiveType } from '~/lib/DirectiveTool';
import { setServerTheme } from '~/lib/server-theme';
import portfolioData from '~/data/portfolio.json';
import { langfuse } from '~/server/langfuse';
import { randomUUID } from 'crypto';

// Convert portfolio data to markdown context
function formatPortfolioAsMarkdown() {
	const { nodes, edges } = portfolioData;

	let markdown = '# Portfolio Data\n\n';

	// Group nodes by type
	const nodesByType = nodes.reduce(
		(acc, node) => {
			if (!acc[node.type]) acc[node.type] = [];
			acc[node.type]!.push(node);
			return acc;
		},
		{} as Record<string, typeof nodes>,
	);

	// Format each type
	Object.entries(nodesByType).forEach(([type, typeNodes]) => {
		markdown += `## ${type.charAt(0).toUpperCase() + type.slice(1)}s\n\n`;
		typeNodes.forEach((node) => {
			markdown += `- **${node.label}** (${node.id})\n`;
			if (node.summary) markdown += `  - ${node.summary}\n`;
			if (node.tags) markdown += `  - Tags: ${node.tags.join(', ')}\n`;
			if (node.years) markdown += `  - Years: ${node.years[0]}-${node.years[1]}\n`;
			if (node.level) markdown += `  - Level: ${node.level}\n`;
		});
		markdown += '\n';
	});

	// Add key relationships
	markdown += '## Key Relationships\n\n';
	edges.forEach((edge) => {
		const sourceNode = nodes.find((n) => n.id === edge.source);
		const targetNode = nodes.find((n) => n.id === edge.target);
		if (sourceNode && targetNode) {
			markdown += `- ${sourceNode.label} ${edge.rel} ${targetNode.label}\n`;
		}
	});

	return markdown;
}

const formatMessagesAsMarkdown = (messages: ModelMessage[]): string => {
	const formattedMessages = messages
		.map((msg) => {
			const role = msg.role === 'user' ? 'User' : 'AI';
			return `**${role}:** ${msg.content}`;
		})
		.join('\n\n');
	return `<conversationHistory>${formattedMessages}</conversationHistory>`;
};

const formatDirectiveAsMarkdown = (directive: DirectiveType | null): string => {
	if (!directive) return 'No directive';

	let markdown = `## Directive: ${directive.mode}\n\n`;

	if (directive.highlights.length > 0) {
		markdown += `### Highlights\n\n`;
		directive.highlights.forEach((highlight) => {
			markdown += `- ${highlight}\n`;
		});
	}

	if (directive.narration) {
		markdown += `### Narration\n\n${directive.narration}\n`;
	}

	return markdown;
};

interface EnhancedAskResult {
	directive: DirectiveType | null;
	text: string;
	themeChanged: boolean;
	themeReason?: string;
}

export async function Ask(
	messages: ModelMessage[],
	currentDirective: DirectiveType | null,
): Promise<EnhancedAskResult> {
	const portfolioContext = formatPortfolioAsMarkdown();

	const SYSTEM_PROMPT = `You are an AI assistant for Lindsay Spencer's interactive portfolio. Your job is to help users explore their background through a dynamic graph visualization.

IMPORTANT: You must respond with exactly one directive using the tool. The directive controls how the graph displays information.

Available modes:
- timeline: Show career progression chronologically
- projects: Focus on specific projects and their relationships
- skills: Highlight technical skills and competencies
- values: Display personal values and motivations
- compare: Compare different aspects (skills, projects, etc.)
- play: Interactive exploration mode

Guidelines:
- Always highlight relevant nodes based on the user's question
- Keep narration conversational and informative
- Use node IDs from the portfolio data for highlights
- Suggest theme changes when the conversation context shifts significantly
- Provide a brief reason for theme suggestions

Portfolio context:
${portfolioContext}

Return exactly one directive via the tool.`;

	const trace = langfuse.trace({
		id: randomUUID(),
		name: 'directive-call',
	});

	const result = await streamText({
		model: generalModel,
		messages: [
			{ role: 'system', content: SYSTEM_PROMPT },
			{
				role: 'user',
				content: `
The text inbetween <conversationHistory> tags are the conversation history.

${formatMessagesAsMarkdown(messages)}

The current directive is ${formatDirectiveAsMarkdown(currentDirective)}
`,
			},
		],
		tools: {
			directive: enhancedDirectiveTool,
		},
		toolChoice: { type: 'tool', toolName: 'directive' },
		experimental_telemetry: {
			isEnabled: true,
			metadata: {
				langfuseTraceId: trace.id,
				langfuseUpdateParent: false,
			},
		},
	});

	langfuse.flushAsync();

	// Extract the directive and text from the stream
	let directive: DirectiveType | null = null;
	let text = '';

	for await (const part of result.fullStream) {
		if (part.type === 'tool-call' && part.toolName === 'directive') {
			directive = part.input as DirectiveType;
		}
		if (part.type === 'text-delta') {
			text += part.text;
		}
	}

	console.log('🎯 LLM Response:', {
		directive,
		text,
		themeRequested: directive?.theme,
		themeReason: directive?.themeReason,
	});

	// Apply theme suggestion if provided
	if (directive?.theme) {
		try {
			console.log('🎨 Setting server theme to:', directive.theme);
			await setServerTheme(directive.theme);
		} catch (error) {
			console.warn('Failed to set server theme:', error);
		}
	}

	// Return plain objects only
	return {
		directive,
		text: text || directive?.narration || '',
		themeChanged: !!directive?.theme,
		themeReason: directive?.themeReason,
	};
}
