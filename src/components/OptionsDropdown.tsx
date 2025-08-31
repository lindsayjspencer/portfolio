import type { DirectiveType } from '~/lib/DirectiveTool';
import { MaterialIcon } from '~/components/Ui';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import './OptionsDropdown.scss';

interface TopNavBarProps {
	currentMode: DirectiveType['mode'];
	onModeChange: (mode: DirectiveType['mode']) => void;
	isVisible: boolean;
}

const DIRECTIVE_MODES: DirectiveType['mode'][] = ['timeline', 'career-timeline', 'skills-timeline', 'projects', 'skills', 'values', 'compare', 'play', 'resume'];

export function OptionsDropdown({ currentMode, onModeChange, isVisible }: TopNavBarProps) {
	return (
		<div className={`options-dropdown-container ${isVisible ? 'visible' : ''}`}>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<button className="options-dropdown-trigger" aria-label="Debug menu">
						<MaterialIcon name="more_horiz" size={16} />
					</button>
				</DropdownMenu.Trigger>

				<DropdownMenu.Portal>
					<DropdownMenu.Content className="options-dropdown-menu" align="start" sideOffset={12}>
						<div className="dropdown-header">Directive Mode</div>
						{DIRECTIVE_MODES.map((mode, index) => (
							<DropdownMenu.Item
								key={mode}
								className={`mode-button ${currentMode === mode ? 'active' : ''}`}
								onSelect={() => onModeChange(mode)}
							>
								{mode}
							</DropdownMenu.Item>
						))}
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
		</div>
	);
}
