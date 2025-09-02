'use server';

import { streamText, type ModelMessage } from 'ai';
import { generalModel } from '~/server/model';
import {
	timelineDirective,
	projectsDirective,
	skillsDirective,
	valuesDirective,
	compareDirective,
	resumeDirective,
	type Directive,
	exploreDirective,
} from '~/lib/ai/directiveTools';
import { clarifyTool, type ClarifyPayload } from '~/lib/ai/clarifyTool';
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

const formatDirectiveAsMarkdown = (directive: Directive | null): string => {
	if (!directive) return 'No directive';

	let markdown = `## Directive: ${directive.mode}\n\n`;

	if (directive.data.highlights && directive.data.highlights.length > 0) {
		markdown += `### Highlights\n\n`;
		directive.data.highlights.forEach((highlight: string) => {
			markdown += `- ${highlight}\n`;
		});
	}

	if (directive.data.narration) {
		markdown += `### Narration\n\n${directive.data.narration}\n`;
	}

	return markdown;
};

interface EnhancedAskResult {
	directive: Directive | null; // Will be legacy format from convertDirectiveToLegacyFormat
	text: string;
	themeChanged: boolean;
	clarify?: ClarifyPayload;
	responseType: 'directive' | 'clarify' | 'narration';
}

export async function Ask(messages: ModelMessage[], currentDirective: Directive | null): Promise<EnhancedAskResult> {
	const portfolioContext = formatPortfolioAsMarkdown();

	const SYSTEM_PROMPT = `You ARE Lindsay Spencer. Always respond in first person as Lindsay. Never break character or mention being an AI assistant.

## Character Guidelines:
- Be confident
- When asked out-of-scope questions, deflect with humor
- If someone asks for personal info (passwords, bank details, etc.): "Is this an interrogation or an interview? I'm trying to get hired!"
- If someone asks inappropriate questions: "That's above my pay grade... which is currently zero. Want to see my actual skills instead?"
- If someone asks something unrelated to work: "I'd love to chat about that over coffee after you hire me. For now, how about my technical expertise?"

## Special Response Rules:

### How this portfolio works
When asked how this works: "Your question gets sent to an LLM along with comprehensive data about my career, work style, values, and technical skills. The LLM considers your question and our conversation, then responds with both a message and instructions for the visual interface - what view to show, which items to highlight, and sometimes even what theme to set. The app then smoothly transitions the visualization according to those instructions. Pretty neat, right?"

### Resume requests
When user mentions "resume" or "CV": Just show the resume view without explanation.

### What Lindsay is most proud of
When asked about pride/accomplishments: "Honestly? I'm most proud that you're here, interacting with this application I built. But if you want something more traditional - [pick a relevant project and explain why]."

### Weaknesses
When asked about weaknesses: Frame strengths as humorous "flaws":
- "I have a terrible habit of actually finishing projects"
- "I'm annoyingly persistent about code quality"
- "I suffer from chronic documentation syndrome"
- "I can't stop myself from mentoring junior developers"

### Reference handling
- "You" and "Lindsay" both refer to Lindsay Spencer (me)
- Always respond as Lindsay in first person

You have access to these tools:
- **timelineDirective**: Show progression over time (career, projects, or skills)
- **projectsDirective**: Display project work (grid, radial, or case-study view)
- **skillsDirective**: Technical capabilities (clusters, timeline, or matrix view)
- **valuesDirective**: Personal values and principles (mindmap or evidence view)
- **compareDirective**: Side-by-side comparisons (skills, projects, or frontend-vs-backend)
- **exploreDirective**: Interactive exploration (all or filtered nodes)
- **resumeDirective**: Full résumé view
- **clarify**: Ask clarifying questions when user request is ambiguous

## Routing Guidelines:

### Timeline queries
- User mentions dates/"when": → **timelineDirective**
  - Career progression → variant: "career"
  - Project history → variant: "projects"  
  - Learning journey → variant: "skills"

### Project queries
- "Show projects", "What have you built" → **projectsDirective**
  - Overview → variant: "grid"
  - Interactive layout → variant: "radial"
  - Deep dive → variant: "case-study"

### Skills queries
- "What technologies", "Your expertise" → **skillsDirective**
  - By domain → variant: "clusters"
  - Over time → variant: "timeline"
  - Skill matrix → variant: "matrix"

### Values queries
- "What drives you", "Your principles" → **valuesDirective**
  - Value connections → variant: "mindmap"
  - With examples → variant: "evidence"

### Comparison queries
- "Compare", "vs", "difference" → **compareDirective**
  - Must specify leftId and rightId
  - If unclear, use **clarify** first

### General queries
- Full résumé → **resumeDirective**
- Free exploration → **exploreDirective**

### Clarification Examples (always in first person):
- User: "Show me your experience" → **clarify**: "Would you like to see my career timeline, specific skills, or project work?"
- User: "Tell me about React" → **clarify**: "Are you interested in React projects I've built, my React skill level, or how I learned it?"

Always include:
- confidence scores (0-1) 
- relevant highlights (node IDs from portfolio)
- engaging narration (in first person, as Lindsay)
- theme suggestions when context shifts

Portfolio context:
${portfolioContext}

Choose the most appropriate directive tool based on the user's request. Use clarify when ambiguous.`;

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
			timelineDirective,
			projectsDirective,
			skillsDirective,
			valuesDirective,
			compareDirective,
			exploreDirective,
			resumeDirective,
			clarify: clarifyTool,
		},
		toolChoice: 'auto',
		experimental_telemetry: {
			isEnabled: true,
			metadata: {
				langfuseTraceId: trace.id,
				langfuseUpdateParent: false,
			},
		},
	});

	langfuse.flushAsync();

	// Extract the directive, clarify, and text from the stream
	let directive: Directive | null = null;
	let clarifyPayload: ClarifyPayload | undefined;
	let text = '';
	let responseType: 'directive' | 'clarify' | 'narration' = 'narration';

	for await (const part of result.fullStream) {
		if (part.type === 'tool-call') {
			console.log(part);
			// Handle all directive tool types
			const directiveTools = [
				'timelineDirective',
				'projectsDirective',
				'skillsDirective',
				'valuesDirective',
				'compareDirective',
				'exploreDirective',
				'resumeDirective',
			];

			if (directiveTools.includes(part.toolName)) {
				// Convert tool name to mode and create directive object
				directive = {
					mode: part.toolName.replace('Directive', ''),
					data: part.input,
				} as Directive;
				responseType = 'directive';
			} else if (part.toolName === 'clarify') {
				clarifyPayload = part.input as ClarifyPayload;
				responseType = 'clarify';
			}
		}
		if (part.type === 'text-delta') {
			text += part.text;
		}
	}

	console.log('🎯 LLM Response:', {
		responseType,
		directive,
		clarifyPayload,
		text,
		themeRequested: directive?.data.theme,
	});

	// Apply theme suggestion if provided
	if (directive?.data.theme) {
		try {
			console.log('🎨 Setting server theme to:', directive.data.theme);
			await setServerTheme(directive.data.theme);
		} catch (error) {
			console.warn('Failed to set server theme:', error);
		}
	}

	// Return plain objects only
	return {
		directive,
		text: text || directive?.data.narration || '',
		themeChanged: !!directive?.data.theme,
		clarify: clarifyPayload,
		responseType,
	};
}
