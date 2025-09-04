import { MaterialIcon } from '~/components/Ui';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTheme } from '~/contexts/theme-context';
import './OptionsDropdown.scss';
import type { Directive } from '~/lib/ai/directiveTools';
import { usePortfolioStore, graph } from '~/lib/PortfolioStore';
import { useApplyDirective } from '~/hooks/useApplyDirective';
import { filterNodesByType } from '~/lib/ViewTransitions';
import type { SkillNode, ProjectNode } from '~/lib/PortfolioStore';

// Component no longer needs props as it accesses store directly

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
			{ value: 'technical', label: 'Technical' },
			{ value: 'soft', label: 'Soft' },
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

export function OptionsDropdown() {
	const router = useRouter();
	const { themeName, availableThemes, setTheme } = useTheme();
	const currentDirective = usePortfolioStore((state) => state.directive);
	const clearMessages = usePortfolioStore((s) => s.clearMessages);
	const applyDirective = useApplyDirective();
	const messages = usePortfolioStore((state) => state.messages);

	const hasHadInteraction = messages.length > 0;
	const landingMode = currentDirective.mode === 'landing' && !hasHadInteraction;

	function getTwoRandomIds<T extends { id: string }>(items: T[]): [string, string] {
		if (!items || items.length === 0) return ['', ''];
		if (items.length === 1) {
			const only = items[0]!;
			return [only.id, only.id];
		}
		const i1 = Math.floor(Math.random() * items.length);
		let i2 = Math.floor(Math.random() * (items.length - 1));
		if (i2 >= i1) i2 += 1; // ensure distinct
		const a = items[i1]!;
		const b = items[i2]!;
		return [a.id, b.id];
	}

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
						variant: (variant as 'technical' | 'soft' | 'matrix') || 'technical',
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
				const finalVariant = (variant as 'skills' | 'projects' | 'frontend-vs-backend') || 'skills';
				let leftId = '';
				let rightId = '';

				if (finalVariant === 'skills' && graph?.nodes) {
					const skills = filterNodesByType<SkillNode>(graph.nodes, 'skill');
					[leftId, rightId] = getTwoRandomIds(skills);
				} else if (finalVariant === 'projects' && graph?.nodes) {
					const projects = filterNodesByType<ProjectNode>(graph.nodes, 'project');
					[leftId, rightId] = getTwoRandomIds(projects);
				}

				return {
					mode: 'compare',
					data: {
						leftId,
						rightId,
						showOverlap: true,
						variant: finalVariant,
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

	const activeOption = MENU_OPTIONS.find((option) => option.mode === currentDirective.mode);

	return (
		<div className={`options-dropdown-container visible`}>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<button className="options-dropdown-trigger" aria-label="Menu">
						{activeOption?.label ?? 'Menu'}
						<MaterialIcon name="chevron_right" size={16} />
					</button>
				</DropdownMenu.Trigger>

				<DropdownMenu.Portal>
					<DropdownMenu.Content className="options-dropdown-menu" align="start" sideOffset={12}>
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
																applyDirective(
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
										onSelect={() => applyDirective(createDirective(option.mode))}
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

						<div className="dropdown-separator" />

						{/* Home reset: clears chat and resets directive; UrlStateSync will clean URL to '/' */}
						<DropdownMenu.Item
							className="mode-button"
							onSelect={() => {
								clearMessages();
								// Let UrlStateSync write landing; keep history by pushing
								router.push('/');
							}}
						>
							Go Home (clear chat)
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
		</div>
	);
}
