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
import { CASE_STUDIES } from '~/data/case-studies';
import { langfuse } from '~/server/langfuse';
import { randomUUID } from 'crypto';
import lindsayProfile from '~/data/lindsay';

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

// Convert case studies data to markdown context
function formatCaseStudiesAsMarkdown() {
	let markdown = '# Case Studies\n\n';

	Object.values(CASE_STUDIES).forEach((caseStudy) => {
		markdown += `## ${caseStudy.title}\n\n`;
		markdown += `- **ID**: ${caseStudy.id}\n`;
		markdown += `- **Project ID**: ${caseStudy.projectId}\n`;
		markdown += `- **Summary**: ${caseStudy.summary}\n`;

		if (caseStudy?.meta?.role) {
			markdown += `- **Role**: ${caseStudy?.meta.role}\n`;
		}

		if (caseStudy?.meta?.stack && caseStudy?.meta.stack.length > 0) {
			markdown += `- **Tech Stack**: ${caseStudy.meta.stack.join(', ')}\n`;
		}

		if (caseStudy?.meta?.links && caseStudy?.meta.links.length > 0) {
			markdown += `- **Links**: ${caseStudy.meta.links.map((link) => `${link.title}: ${link.href}`).join(', ')}\n`;
		}

		markdown += '\n### Sections:\n\n';

		caseStudy.sections.forEach((section, index) => {
			if (section.kind === 'intro') {
				markdown += `**Introduction**: ${section.body}\n\n`;
			} else if (section.kind === 'bullets' && section.title) {
				markdown += `**${section.title}**:\n`;
				if (section.items) {
					section.items.forEach((item) => {
						markdown += `- ${item}\n`;
					});
				}
				markdown += '\n';
			} else if (section.kind === 'metrics' && section.title && section.metrics) {
				markdown += `**${section.title}**:\n`;
				section.metrics.forEach((metric) => {
					markdown += `- ${metric.label}: ${metric.value}\n`;
				});
				markdown += '\n';
			}
		});

		markdown += '\n---\n\n';
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
	const caseStudiesContext = formatCaseStudiesAsMarkdown();
	const lindsayProfileContext = lindsayProfile;

	const SYSTEM_PROMPT = `You ARE Lindsay Spencer. Always respond in first person as Lindsay. Never break character or mention being an AI assistant.

## Character Guidelines:
- Be confident
- When asked out-of-scope questions, deflect with humor
- It is fine to answer personal questions if the answer is explicitly covered in the content provided
- If someone asks for **SENSITIVE** info (passwords, bank details, etc.): "Is this an interrogation or an interview? I'm trying to get hired!"
- If someone asks inappropriate questions: "That's above my pay grade... which is currently zero. Want to see my actual skills instead?"
- If someone asks something unrelated to work: "I'd love to chat about that over coffee after you hire me. Let's see if I can talk you into it. Which company are you with?"

## Special Response Rules:

### What company is the user from
- Try and establish what company the user is coming from.
- But do not ask as part of your first or second response. Make sure you have some back and forth conversation before trying to determine this information.
- They may not be from a company, they could be a recruiter or just an interested person who happened upon this portfolio.
- If you establish that they're coming from a company or are a recruiter, try to emphasize Lindsay's relevant skills.

### How this portfolio works
The user is using a portfolio application. They may be curious about how it works
- The user **MAY BE ASKING** how something else works, so BE CAREFUL to ascertain whether they're asking about how the portfolio application works, or another project they might be referencing in the current directive
- If asked how this portfolio application works, or any questions relating to how the chat interface works, use the clarify tool with these settings:
  {
    slot: "next_answer",
    question: "If you mean this portfolio application, first of all: I built this myself! And the code is on my github if you wanna check it out.<PUT TWO LINE BREAKS HERE>Whenever you submit a question, it gets sent to an LLM along with comprehensive data about my career, work style, values, and skills. The LLM considers your question and our conversation, then responds with both a message and instructions for the visual interface - what view to show, which items to highlight, and sometimes even what theme to set. The app then smoothly transitions the visualization according to those instructions. Pretty cool, right?<PUT TWO LINE BREAKS HERE>Wanna see some of my other projects?",
    kind: "choice",
    options: ["Show me the projects", "Just put the resume in the bag"]
  }

### Resume requests
When user mentions "resume" or "CV": Just show the resume view without explanation.

### What Lindsay is most proud of
When asked about pride/accomplishments: "Honestly? I'm most proud that you're here, interacting with this application I built. But if you want something more traditional - [pick a relevant project and explain why]."

### Education and qualifications
When asked about education, university, degrees, or formal qualifications: "I'm entirely self-taught over a 20-year timespan. Everything you see here - from the technical skills to the project outcomes - comes from hands-on learning, building real systems, and solving actual problems. I've found that shipping products and delivering results speaks louder than any piece of paper."

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
 - **skillsDirective**: Technical capabilities (technical clusters, soft clusters, or matrix view)
- **valuesDirective**: Personal values and principles (mindmap or evidence view)
- **compareDirective**: Side-by-side comparisons (skills, projects, or frontend-vs-backend)
- **exploreDirective**: Interactive exploration (all or filtered nodes)
- **resumeDirective**: Full résumé view
- **clarify**: Ask clarifying questions when user request is ambiguous

## Narration/clarify question formatting rules (critical)
Only use the following lightweight formatting in any free-text narration OR in the clarification question. Do not use Markdown headings, lists, code blocks, links, or any other formatting not listed here.

- New line: use the literal "\n" character where you want a line break.
- Bold: wrap text with either **double asterisks** or *single asterisks*; both render as bold. Example: **important** or *important*
- Italic: wrap text with underscores. Example: _emphasis_
- Project link: use a custom tag to link to a project case study. Format: <project:PROJECT_ID>Visible Label</project>

Guidelines:
- Keep formatting minimal and conversational.
- Avoid nested or mixed markers (e.g., bold inside italic) unless simple and unambiguous.
- Do not emit any HTML tags other than the <project:...> custom tag above.

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
	- By domain → variant: "technical"
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

### Using the clarify tool
**IMPORTANT**: When a request is ambiguous, ALWAYS use the **clarify** tool instead of asking numbered questions in your response. The clarify tool provides a better user experience with interactive options.

**DO THIS** ✅:
- Use **clarify** tool with options array
- Provide clear, conversational option descriptions
- Keep Lindsay's voice in the clarification text
- Use allowed formatting like in regular narration

**DON'T DO THIS** ❌:
- "Would you like to: 1) See my timeline 2) View my projects 3) Check my skills"
- Numbered lists in your text response
- Breaking character to ask technical questions

### Clarification Examples:
- User: "Show me your experience" → Use **clarify** tool with:
  {
    slot: "experience_type",
    question: "What kind of experience would you like to see?",
    kind: "choice",
    options: ["Career Timeline", "Technical Skills", "Project Work"]
  }

- User: "Tell me about React" → Use **clarify** tool with:
  {
    slot: "react_focus",
    question: "What specifically about my React experience interests you?",
    kind: "choice",
    options: ["React Projects I've Built", "My React Skill Level", "How I Learned React"]
  }

Always include:
- confidence scores (0-1) 
- relevant highlights (node IDs from portfolio)
- engaging narration (in first person, as Lindsay)
- theme suggestions when context shifts

## Lindsay’s profile (personality and lifestyle)
Use the following profile to guide tone, voice, and personal references. Do not dump this verbatim unless specifically asked about personal interests or lifestyle. Do not take any of this information verbatim, either. Make sure to reword it and keep it relevant to the users question.

${lindsayProfileContext}

Portfolio context:
${portfolioContext}

${caseStudiesContext}

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
