import { describe, expect, it } from 'vitest';
import { parseNarration } from './narration';

describe('parseNarration', () => {
	it('normalizes literal and actual line breaks into newline characters', () => {
		expect(parseNarration('First\\n\\nSecond', 'final')).toEqual([{ type: 'text', text: 'First\n\nSecond' }]);
		expect(parseNarration('First\\r\\nSecond\r\nThird', 'final')).toEqual([
			{ type: 'text', text: 'First\nSecond\nThird' },
		]);
	});

	it('eagerly formats bold text after an opening double-asterisk while streaming', () => {
		expect(parseNarration('Start **bold', 'streaming')).toEqual([
			{ type: 'text', text: 'Start ' },
			{
				type: 'strong',
				children: [{ type: 'text', text: 'bold' }],
			},
		]);
	});

	it('eagerly formats italic text after an opening underscore while streaming', () => {
		expect(parseNarration('Start _emphasis', 'streaming')).toEqual([
			{ type: 'text', text: 'Start ' },
			{
				type: 'em',
				children: [{ type: 'text', text: 'emphasis' }],
			},
		]);
	});

	it('keeps single-asterisk emphasis markers literal', () => {
		expect(parseNarration('Use *stars* literally', 'final')).toEqual([
			{ type: 'text', text: 'Use *stars* literally' },
		]);
	});

	it('suppresses incomplete trailing control fragments while streaming', () => {
		expect(parseNarration('Hello\\', 'streaming')).toEqual([{ type: 'text', text: 'Hello' }]);
		expect(parseNarration('Hello **', 'streaming')).toEqual([{ type: 'text', text: 'Hello ' }]);
		expect(parseNarration('Hello _', 'streaming')).toEqual([{ type: 'text', text: 'Hello ' }]);
		expect(parseNarration('Hello <project:proj_codebots_modeler', 'streaming')).toEqual([
			{ type: 'text', text: 'Hello ' },
		]);
		expect(parseNarration('Hello </pro', 'streaming')).toEqual([{ type: 'text', text: 'Hello ' }]);
	});

	it('shows open project labels as plain text until the closing tag arrives', () => {
		expect(parseNarration('Read <project:proj_codebots_modeler>Codebots Modeler', 'streaming')).toEqual([
			{ type: 'text', text: 'Read Codebots Modeler' },
		]);

		expect(parseNarration('Read <project:proj_codebots_modeler>Codebots Modeler</project>', 'streaming')).toEqual([
			{ type: 'text', text: 'Read ' },
			{
				type: 'project',
				projectId: 'proj_codebots_modeler',
				children: [{ type: 'text', text: 'Codebots Modeler' }],
			},
		]);
	});

	it('resolves known project labels used in the project-id slot', () => {
		expect(parseNarration('<project:Codebots Platform>Codebots Platform</project>', 'final')).toEqual([
			{
				type: 'project',
				projectId: 'proj_codebots_modeler',
				children: [{ type: 'text', text: 'Codebots Platform' }],
			},
		]);
	});

	it('renders malformed final markup literally after the strict pass', () => {
		expect(parseNarration('Look **unfinished', 'final')).toEqual([
			{ type: 'text', text: 'Look **unfinished' },
		]);
		expect(parseNarration('See <project:proj_codebots_modeler>Codebots', 'final')).toEqual([
			{ type: 'text', text: 'See <project:proj_codebots_modeler>Codebots' },
		]);
	});
});
