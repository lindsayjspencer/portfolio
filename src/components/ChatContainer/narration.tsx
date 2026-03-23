import type { MouseEvent, ReactNode } from 'react';
import portfolioData from '~/data/portfolio.json';

export type NarrationParseMode = 'streaming' | 'final';

type TextNode = {
	type: 'text';
	text: string;
};

type StrongNode = {
	type: 'strong';
	children: NarrationNode[];
};

type EmNode = {
	type: 'em';
	children: NarrationNode[];
};

type ProjectNode = {
	type: 'project';
	projectId: string;
	children: NarrationNode[];
};

export type NarrationNode = TextNode | StrongNode | EmNode | ProjectNode;

type ParseOptions = {
	allowProjects: boolean;
};

const PROJECT_OPEN_TAG = '<project:';
const PROJECT_CLOSE_TAG = '</project>';

type PortfolioNode = {
	id: string;
	type: string;
	label: string;
};

const projectNodes = (portfolioData as { nodes: PortfolioNode[] }).nodes.filter((node) => node.type === 'project');

function normalizeProjectReference(value: string): string {
	return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

const projectReferenceMap = projectNodes.reduce<Map<string, string>>((map, node) => {
	map.set(normalizeProjectReference(node.id), node.id);
	map.set(normalizeProjectReference(node.label), node.id);
	return map;
}, new Map<string, string>());

function resolveProjectReference(projectReference: string): string | null {
	return projectReferenceMap.get(normalizeProjectReference(projectReference)) ?? null;
}

function appendText(nodes: NarrationNode[], text: string) {
	if (!text) {
		return;
	}

	const lastNode = nodes[nodes.length - 1];
	if (lastNode?.type === 'text') {
		lastNode.text += text;
		return;
	}

	nodes.push({ type: 'text', text });
}

function normalizeNarrationText(text: string): string {
	return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
}

function trimPartialTagPrefix(text: string, tag: string): string {
	for (let length = tag.length - 1; length >= 2; length -= 1) {
		const prefix = tag.slice(0, length);
		if (text.endsWith(prefix)) {
			return text.slice(0, -length);
		}
	}

	return text;
}

function trimIncompleteProjectTail(text: string): string {
	const openIndex = text.lastIndexOf(PROJECT_OPEN_TAG);
	if (openIndex !== -1) {
		const openTagCloseIndex = text.indexOf('>', openIndex + PROJECT_OPEN_TAG.length);
		if (openTagCloseIndex === -1) {
			return text.slice(0, openIndex);
		}
	}

	return trimPartialTagPrefix(trimPartialTagPrefix(text, PROJECT_OPEN_TAG), PROJECT_CLOSE_TAG);
}

function trimStreamingTail(text: string): string {
	let out = text;

	while (true) {
		let next = trimIncompleteProjectTail(out);

		if (next === out && out.endsWith('\\')) {
			next = out.slice(0, -1);
		}

		if (next === out && out.endsWith('**')) {
			next = out.slice(0, -2);
		}

		if (next === out && out.endsWith('_')) {
			next = out.slice(0, -1);
		}

		if (next === out) {
			return out;
		}

		out = next;
	}
}

function preprocessNarrationText(text: string, mode: NarrationParseMode): string {
	const normalized = normalizeNarrationText(text);
	return mode === 'streaming' ? trimStreamingTail(normalized) : normalized;
}

function parseDelimitedNode(
	text: string,
	startIndex: number,
	marker: '**' | '_',
	mode: NarrationParseMode,
	options: ParseOptions,
): { node: NarrationNode; nextIndex: number } | null {
	const contentStart = startIndex + marker.length;
	const closeIndex = text.indexOf(marker, contentStart);

	if (closeIndex === -1) {
		if (mode === 'final') {
			return null;
		}

		return {
			node: {
				type: marker === '**' ? 'strong' : 'em',
				children: parseSegments(text.slice(contentStart), mode, options),
			},
			nextIndex: text.length,
		};
	}

	return {
		node: {
			type: marker === '**' ? 'strong' : 'em',
			children: parseSegments(text.slice(contentStart, closeIndex), mode, options),
		},
		nextIndex: closeIndex + marker.length,
	};
}

function parseProjectNode(
	text: string,
	startIndex: number,
	mode: NarrationParseMode,
): { node?: NarrationNode; plainText?: string; nextIndex: number } | null {
	const openTagCloseIndex = text.indexOf('>', startIndex + PROJECT_OPEN_TAG.length);
	if (openTagCloseIndex === -1) {
		return null;
	}

	const projectReference = text.slice(startIndex + PROJECT_OPEN_TAG.length, openTagCloseIndex).trim();
	if (!projectReference) {
		return null;
	}

	const closeTagStartIndex = text.indexOf(PROJECT_CLOSE_TAG, openTagCloseIndex + 1);
	if (closeTagStartIndex === -1) {
		if (mode === 'streaming') {
			return {
				plainText: text.slice(openTagCloseIndex + 1),
				nextIndex: text.length,
			};
		}

		return {
			plainText: text.slice(startIndex),
			nextIndex: text.length,
		};
	}

	const projectId = resolveProjectReference(projectReference);
	if (!projectId) {
		return {
			plainText: text.slice(startIndex, closeTagStartIndex + PROJECT_CLOSE_TAG.length),
			nextIndex: closeTagStartIndex + PROJECT_CLOSE_TAG.length,
		};
	}

	return {
		node: {
			type: 'project',
			projectId,
			children: parseSegments(text.slice(openTagCloseIndex + 1, closeTagStartIndex), mode, {
				allowProjects: false,
			}),
		},
		nextIndex: closeTagStartIndex + PROJECT_CLOSE_TAG.length,
	};
}

function parseSegments(text: string, mode: NarrationParseMode, options: ParseOptions): NarrationNode[] {
	const nodes: NarrationNode[] = [];
	let index = 0;
	let buffer = '';

	const flushBuffer = () => {
		appendText(nodes, buffer);
		buffer = '';
	};

	while (index < text.length) {
		if (options.allowProjects && text.startsWith(PROJECT_OPEN_TAG, index)) {
			const project = parseProjectNode(text, index, mode);
			if (project) {
				flushBuffer();
				if (project.node) {
					nodes.push(project.node);
				} else if (project.plainText) {
					appendText(nodes, project.plainText);
				}
				index = project.nextIndex;
				continue;
			}
		}

		if (text.startsWith('**', index)) {
			const strongNode = parseDelimitedNode(text, index, '**', mode, options);
			if (strongNode) {
				flushBuffer();
				nodes.push(strongNode.node);
				index = strongNode.nextIndex;
				continue;
			}
		}

		if (text[index] === '_') {
			const emNode = parseDelimitedNode(text, index, '_', mode, options);
			if (emNode) {
				flushBuffer();
				nodes.push(emNode.node);
				index = emNode.nextIndex;
				continue;
			}
		}

		buffer += text[index];
		index += 1;
	}

	flushBuffer();
	return nodes;
}

export function parseNarration(text: string, mode: NarrationParseMode): NarrationNode[] {
	return parseSegments(preprocessNarrationText(text, mode), mode, { allowProjects: true });
}

function renderNarrationNode(
	node: NarrationNode,
	path: string,
	onProjectClick: (projectId: string) => void,
): ReactNode {
	switch (node.type) {
		case 'text':
			return node.text;
		case 'strong':
			return <strong key={path}>{renderNarration(node.children, onProjectClick, path)}</strong>;
		case 'em':
			return <em key={path}>{renderNarration(node.children, onProjectClick, path)}</em>;
		case 'project':
			return (
				<a
					href="#"
					className="project-link"
					onClick={(event: MouseEvent<HTMLAnchorElement>) => {
						event.preventDefault();
						onProjectClick(node.projectId);
					}}
					key={path}
				>
					{renderNarration(node.children, onProjectClick, path)}
				</a>
			);
	}
}

export function renderNarration(
	nodes: NarrationNode[],
	onProjectClick: (projectId: string) => void,
	pathPrefix = 'n',
): ReactNode[] {
	return nodes.map((node, index) => renderNarrationNode(node, `${pathPrefix}-${index}`, onProjectClick));
}
