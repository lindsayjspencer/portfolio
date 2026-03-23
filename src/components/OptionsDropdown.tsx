import { MaterialIcon } from '~/components/Ui';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTheme } from '~/contexts/theme-context';
import './OptionsDropdown.scss';
import {
	createCompareDirective,
	createExploreDirective,
	createProjectsDirective,
	createResumeDirective,
	createSkillsDirective,
	createTimelineDirective,
	createValuesDirective,
	getDirectiveVariant,
	type CompareDirective,
	type Directive,
	type DirectiveMode,
	type ProjectsDirective,
	type SkillsDirective,
	type TimelineDirective,
	type ValuesDirective,
} from '~/lib/ai/directiveTools';
import { usePortfolioStore, graph } from '~/lib/PortfolioStore';
import { useApplyDirective } from '~/hooks/useApplyDirective';
import { filterNodesByType } from '~/lib/ViewTransitions';
import type { SkillNode, ProjectNode } from '~/lib/PortfolioStore';

// Component no longer needs props as it accesses store directly

type TimelineVariant = TimelineDirective['variant'];
type ProjectsVariant = ProjectsDirective['variant'];
type SkillsVariant = SkillsDirective['variant'];
type ValuesVariant = ValuesDirective['variant'];
type CompareVariant = CompareDirective['variant'];
type MenuVariant = TimelineVariant | ProjectsVariant | SkillsVariant | ValuesVariant | CompareVariant;
type NonLandingDirectiveMode = Exclude<DirectiveMode, 'landing'>;

type MenuOption =
	| { mode: 'timeline'; label: string; variants: { value: TimelineVariant; label: string }[] }
	| { mode: 'projects'; label: string; variants: { value: ProjectsVariant; label: string }[] }
	| { mode: 'skills'; label: string; variants: { value: SkillsVariant; label: string }[] }
	| { mode: 'values'; label: string; variants: { value: ValuesVariant; label: string }[] }
	| { mode: 'compare'; label: string; variants: { value: CompareVariant; label: string }[] }
	| { mode: 'explore'; label: string; variants?: undefined }
	| { mode: 'resume'; label: string; variants?: undefined };

const TIMELINE_VARIANTS = ['career', 'skills', 'projects'] as const;
const PROJECT_VARIANTS = ['grid', 'radial', 'case-study'] as const;
const SKILL_VARIANTS = ['technical', 'soft', 'matrix'] as const;
const VALUE_VARIANTS = ['mindmap', 'evidence'] as const;
const COMPARE_VARIANTS = ['skills', 'projects', 'frontend-vs-backend'] as const;

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
	},
	{ mode: 'resume', label: 'Resume' },
];

function isVariantForMode<T extends MenuVariant>(value: string | undefined, allowed: readonly T[]): value is T {
	return value !== undefined && (allowed as readonly string[]).includes(value);
}

function assertUnreachable(value: never): never {
	throw new Error(`Unsupported mode: ${String(value)}`);
}

export function OptionsDropdown() {
	const { themeName, availableThemes, setTheme } = useTheme();
	const currentDirective = usePortfolioStore((state) => state.directive);
	const clearMessages = usePortfolioStore((s) => s.clearMessages);
	const applyDirective = useApplyDirective();

	function getTwoRandomIds<T extends { id: string }>(items: T[]): [string, string] {
		if (items.length === 0) return ['', ''];
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

	const createDirective = (mode: NonLandingDirectiveMode, variant?: MenuVariant): Directive => {
		const theme = currentDirective.theme;

		switch (mode) {
			case 'timeline': {
				const resolvedVariant = isVariantForMode(variant, TIMELINE_VARIANTS) ? variant : 'career';
				return createTimelineDirective(theme, {
					variant: resolvedVariant,
				});
			}
			case 'projects': {
				const resolvedVariant = isVariantForMode(variant, PROJECT_VARIANTS) ? variant : 'grid';
				return createProjectsDirective(theme, {
					variant: resolvedVariant,
				});
			}
			case 'skills': {
				const resolvedVariant = isVariantForMode(variant, SKILL_VARIANTS) ? variant : 'technical';
				return createSkillsDirective(theme, {
					variant: resolvedVariant,
				});
			}
			case 'values': {
				const resolvedVariant = isVariantForMode(variant, VALUE_VARIANTS) ? variant : 'mindmap';
				return createValuesDirective(theme, {
					variant: resolvedVariant,
				});
			}
			case 'explore':
				return createExploreDirective(theme);
			case 'compare': {
				const finalVariant = isVariantForMode(variant, COMPARE_VARIANTS) ? variant : 'skills';
				let leftId = '';
				let rightId = '';

				if (finalVariant === 'skills') {
					const skills = filterNodesByType<SkillNode>(graph.nodes, 'skill');
					[leftId, rightId] = getTwoRandomIds(skills);
				} else if (finalVariant === 'projects') {
					const projects = filterNodesByType<ProjectNode>(graph.nodes, 'project');
					[leftId, rightId] = getTwoRandomIds(projects);
				}

				return createCompareDirective(theme, {
					leftId,
					rightId,
					variant: finalVariant,
				});
			}
			case 'resume':
				return createResumeDirective(theme);
		}

		return assertUnreachable(mode);
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
														getDirectiveVariant(currentDirective) === variant.value;
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

						{/* Home reset: clears chat and resets directive; UrlStateSync will push the clean URL */}
						<DropdownMenu.Item
							className="mode-button"
							onSelect={() => {
								clearMessages();
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
