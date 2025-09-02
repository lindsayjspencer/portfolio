import React from 'react';
import './Tag.scss';

type Tone = 'accent' | 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger';
type Variant = 'subtle' | 'solid' | 'outline';
type Size = 'sm' | 'md';
type Shape = 'rounded' | 'pill';

export interface TagProps {
	children: React.ReactNode;
	className?: string;
	tone?: Tone; // color family
	variant?: Variant; // visual style
	size?: Size; // compact vs regular
	shape?: Shape; // rounded corner vs pill
	selected?: boolean; // toggle/selected state (e.g., clarify chips)
	disabled?: boolean;
	bordered?: boolean; // optional border accent on non-outline variants
	darker?: boolean; // opt into darker subtle palette (200/300 instead of 100/200)
	href?: string; // if provided, renders an anchor
	target?: string;
	rel?: string;
	onClick?: (e: React.MouseEvent<HTMLElement>) => void;
	title?: string;
	ariaPressed?: boolean; // for toggle buttons
}

function cx(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(' ');
}

export function Tag({
	children,
	className,
	tone = 'accent',
	variant = 'subtle',
	size = 'md',
	shape = 'rounded',
	selected = false,
	disabled = false,
	bordered = false,
	darker = false,
	href,
	target,
	rel,
	onClick,
	title,
	ariaPressed,
}: TagProps) {
	const baseClass = cx(
		'ui-tag',
		`ui-tag--tone-${tone}`,
		`ui-tag--variant-${variant}`,
		`ui-tag--size-${size}`,
		`ui-tag--shape-${shape}`,
		selected && 'ui-tag--selected',
		disabled && 'ui-tag--disabled',
		bordered && 'ui-tag--bordered',
		darker && 'ui-tag--darker',
		className,
	);

	if (href) {
		const onAnchorClick: React.MouseEventHandler<HTMLAnchorElement> | undefined = onClick
			? (e) => onClick(e as unknown as React.MouseEvent<HTMLElement>)
			: undefined;
		return (
			<a className={baseClass} href={href} target={target} rel={rel} onClick={onAnchorClick} title={title}>
				{children}
			</a>
		);
	}

	// Button when interactive; span otherwise
	const asButton = typeof onClick === 'function';
	const commonProps = {
		className: baseClass,
		title,
	} as const;

	if (asButton) {
		return (
			<button
				type="button"
				{...commonProps}
				onClick={onClick}
				aria-pressed={ariaPressed ?? selected}
				disabled={disabled}
			>
				{children}
			</button>
		);
	}

	return <span {...commonProps}>{children}</span>;
}

export default Tag;
