import { MaterialIcon } from '~/components/Ui';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTheme } from '~/contexts/theme-context';
import './OptionsDropdown.scss';
import type { Directive } from '~/lib/ai/directiveTools';

interface TopNavBarProps {
	currentDirective: Directive;
	onDirectiveChange: (directive: Directive) => void;
	landingMode: boolean;
}

// Define the menu structure with variants
type MenuOption = {
	mode: string;
	label: string;
	variants?: { value: string; label: string }[];
};

const MENU_OPTIONS: MenuOption[] = [
	{
		mode: 'timeline',
		label: 'Timeline',
		variants: [
			{ value: 'career', label: 'Career' },
			{ value: 'skills', label: 'Skills' },
			{ value: 'projects', label: 'Projects' },
		],
	},
	{
		mode: 'projects',
		label: 'Projects',
		variants: [
			{ value: 'grid', label: 'Grid' },
			{ value: 'radial', label: 'Radial' },
			{ value: 'case-study', label: 'Case Study' },
		],
	},
	{
		mode: 'skills',
		label: 'Skills',
		variants: [
			{ value: 'clusters', label: 'Clusters' },
			{ value: 'matrix', label: 'Matrix' },
		],
	},
	{
		mode: 'values',
		label: 'Values',
		variants: [
			{ value: 'mindmap', label: 'Mindmap' },
			{ value: 'evidence', label: 'Evidence' },
		],
	},
	{
		mode: 'compare',
		label: 'Compare',
		variants: [
			{ value: 'skills', label: 'Skills' },
			{ value: 'projects', label: 'Projects' },
			{ value: 'frontend-vs-backend', label: 'Frontend vs Backend' },
		],
	},
	{
		mode: 'explore',
		label: 'Explore',
		variants: [
			{ value: 'all', label: 'All' },
			{ value: 'filtered', label: 'Filtered' },
		],
	},
	{ mode: 'resume', label: 'Resume' },
];

export function OptionsDropdown({ currentDirective, onDirectiveChange, landingMode }: TopNavBarProps) {
	const { themeName, availableThemes, setTheme } = useTheme();

	const createDirective = (mode: string, variant?: string): Directive => {
		// Helper function to create a proper directive based on mode and variant
		const base = {
			narration: '',
			highlights: [],
			confidence: 0.7,
		};

		switch (mode) {
			case 'timeline':
				return {
					mode: 'timeline',
					data: {
						variant: (variant as 'career' | 'skills' | 'projects') || 'career',
						axis: 'months',
						...base,
					},
				} as Directive;
			case 'projects':
				return {
					mode: 'projects',
					data: {
						variant: (variant as 'grid' | 'radial' | 'case-study') || 'grid',
						showMetrics: true,
						...base,
					},
				} as Directive;
			case 'skills':
				return {
					mode: 'skills',
					data: {
						variant: (variant as 'clusters' | 'matrix') || 'clusters',
						clusterBy: 'domain',
						...base,
					},
				} as Directive;
			case 'values':
				return {
					mode: 'values',
					data: {
						variant: (variant as 'mindmap' | 'evidence') || 'mindmap',
						...base,
					},
				} as Directive;
			case 'explore':
				return {
					mode: 'explore',
					data: {
						variant: (variant as 'all' | 'filtered') || 'all',
						...base,
					},
				} as Directive;
			case 'landing':
				return {
					mode: 'landing',
					data: {
						variant: 'neutral',
						...base,
					},
				} as Directive;
			case 'compare': {
				return {
					mode: 'compare',
					data: {
						leftId: '',
						rightId: '',
						showOverlap: true,
						variant: (variant as 'skills' | 'projects' | 'frontend-vs-backend') || 'skills',
						...base,
					},
				} as Directive;
			}
			case 'resume':
				return {
					mode: 'resume',
					data: {
						...base,
					},
				} as Directive;
			default:
				return {
					mode: 'landing',
					data: {
						variant: 'neutral',
						...base,
					},
				} as Directive;
		}
	};

	return (
		<div className={`options-dropdown-container ${!landingMode ? 'visible' : ''}`}>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<button className="options-dropdown-trigger" aria-label="Debug menu">
						<MaterialIcon name="more_horiz" size={16} />
					</button>
				</DropdownMenu.Trigger>

				<DropdownMenu.Portal>
					<DropdownMenu.Content className="options-dropdown-menu" align="start" sideOffset={12}>
						<div className="dropdown-header">View Mode</div>
						{MENU_OPTIONS.map((option) => {
							if (option.variants) {
								// Check if any variant of this mode is active
								const isParentActive = currentDirective.mode === option.mode;

								// Render submenu for modes with variants
								return (
									<DropdownMenu.Sub key={option.mode}>
										<DropdownMenu.SubTrigger
											className={`mode-button submenu-trigger ${isParentActive ? 'active' : ''}`}
										>
											{option.label}
											<MaterialIcon name="chevron_right" size={16} className="submenu-arrow" />
										</DropdownMenu.SubTrigger>
										<DropdownMenu.Portal>
											<DropdownMenu.SubContent className="options-dropdown-submenu">
												{option.variants.map((variant) => {
													const isActive =
														currentDirective.mode === option.mode &&
														currentDirective.data &&
														'variant' in currentDirective.data &&
														currentDirective.data.variant === variant.value;
													return (
														<DropdownMenu.Item
															key={variant.value}
															className={`mode-button ${isActive ? 'active' : ''}`}
															onSelect={() =>
																onDirectiveChange(
																	createDirective(option.mode, variant.value),
																)
															}
														>
															{variant.label}
														</DropdownMenu.Item>
													);
												})}
											</DropdownMenu.SubContent>
										</DropdownMenu.Portal>
									</DropdownMenu.Sub>
								);
							} else {
								// Render normal item for modes without variants
								return (
									<DropdownMenu.Item
										key={option.mode}
										className={`mode-button ${currentDirective.mode === option.mode ? 'active' : ''}`}
										onSelect={() => onDirectiveChange(createDirective(option.mode))}
									>
										{option.label}
									</DropdownMenu.Item>
								);
							}
						})}

						<div className="dropdown-separator" />

						{/* Theme submenu */}
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger className="mode-button submenu-trigger">
								Theme
								<MaterialIcon name="chevron_right" size={16} className="submenu-arrow" />
							</DropdownMenu.SubTrigger>
							<DropdownMenu.Portal>
								<DropdownMenu.SubContent className="options-dropdown-submenu">
									{availableThemes.map((theme) => (
										<DropdownMenu.Item
											key={theme}
											className={`mode-button ${themeName === theme ? 'active' : ''}`}
											onSelect={() => setTheme(theme)}
										>
											{theme.charAt(0).toUpperCase() + theme.slice(1)}
										</DropdownMenu.Item>
									))}
								</DropdownMenu.SubContent>
							</DropdownMenu.Portal>
						</DropdownMenu.Sub>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
		</div>
	);
}
