import { useState } from 'react';
import type { DirectiveType } from '~/lib/DirectiveTool';
import './DebugModeOverlay.scss';

interface DebugModeOverlayProps {
	currentMode: DirectiveType['mode'];
	onModeChange: (mode: DirectiveType['mode']) => void;
}

const DIRECTIVE_MODES: DirectiveType['mode'][] = [
	'timeline',
	'projects', 
	'skills',
	'values',
	'compare',
	'play'
];

export function DebugModeOverlay({ currentMode, onModeChange }: DebugModeOverlayProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div className="debug-mode-overlay">
			<button 
				className="debug-toggle"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				{isExpanded ? '←' : '→'} Debug
			</button>
			
			{isExpanded && (
				<div className="debug-panel">
					<h3>Directive Mode</h3>
					<div className="mode-buttons">
						{DIRECTIVE_MODES.map(mode => (
							<button
								key={mode}
								className={`mode-button ${currentMode === mode ? 'active' : ''}`}
								onClick={() => onModeChange(mode)}
							>
								{mode}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}