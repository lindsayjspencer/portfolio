'use client';

import React from 'react';
import { useComponentSize, type ComponentSize } from '~/hooks/UseComponentSize';
import { useComponentColor, type ThemeColor } from '~/hooks/UseComponentColor';
import './MaterialIcon.scss';

// Common Material Symbols icon names - can be extended as needed
export type MaterialIconName =
	// Navigation & UI
	| 'send'
	| 'close'
	| 'menu'
	| 'arrow_back'
	| 'arrow_forward'
	| 'arrow_upward'
	| 'expand_more'
	| 'expand_less'
	| 'chevron_left'
	| 'chevron_right'
	| 'home'
	| 'search'
	| 'settings'
	| 'info'
	| 'help'
	| 'more_vert'
	| 'more_horiz'
	| 'description'
	// Actions
	| 'add'
	| 'remove'
	| 'edit'
	| 'delete'
	| 'save'
	| 'download'
	| 'upload'
	| 'share'
	| 'copy'
	| 'check'
	| 'clear'
	// Content
	| 'star'
	| 'favorite'
	| 'bookmark'
	| 'visibility'
	| 'visibility_off'
	| 'thumb_up'
	| 'thumb_down'
	| 'comment'
	| 'attach_file'
	// Status
	| 'error'
	| 'warning'
	| 'check_circle'
	| 'cancel'
	| 'radio_button_checked'
	| 'radio_button_unchecked'
	// Graph specific
	| 'zoom_in'
	| 'zoom_out'
	| 'center_focus_strong'
	| 'fit_page'
	| 'fullscreen'
	| 'fullscreen_exit'
	| 'refresh'
	| 'play_arrow'
	| 'pause'
	| 'stop'
	// Communication
	| 'chat'
	| 'phone'
	| 'email'
	| 'notifications'
	| 'notifications_off';

// Size variants (alias for consistency)
export type IconSize = ComponentSize;

// Icon variant (filled vs outlined)
export type IconVariant = 'outlined' | 'rounded' | 'sharp';

export interface MaterialIconProps {
	/** Icon name from Material Symbols */
	name: MaterialIconName;
	/** Size variant or custom size in pixels */
	size?: IconSize;
	/** Theme color or CSS color value */
	color?: ThemeColor | string;
	/** Icon variant - defaults to outlined */
	variant?: IconVariant;
	/** Additional CSS classes */
	className?: string;
	/** Click handler */
	onClick?: () => void;
	/** Accessible label for screen readers */
	'aria-label'?: string;
	/** Custom CSS properties */
	style?: React.CSSProperties;
}

// Variant to CSS class mapping
const variantMap: Record<IconVariant, string> = {
	outlined: 'material-symbols-outlined',
	rounded: 'material-symbols-rounded',
	sharp: 'material-symbols-sharp',
};

export const MaterialIcon: React.FC<MaterialIconProps> = ({
	name,
	size = 'md',
	color,
	variant = 'outlined',
	className = '',
	onClick,
	'aria-label': ariaLabel,
	style = {},
}) => {
	// Use extracted hooks
	const sizeValue = useComponentSize(size);
	const colorValue = useComponentColor(color);

	// Build CSS classes
	const classes = [
		variantMap[variant],
		'material-icon-component',
		onClick ? 'material-icon-clickable' : '',
		className,
	]
		.filter(Boolean)
		.join(' ');

	// Build inline styles
	const inlineStyle: React.CSSProperties = {
		fontSize: sizeValue,
		lineHeight: sizeValue,
		color: colorValue,
		cursor: onClick ? 'pointer' : undefined,
		userSelect: 'none',
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		...style,
	};

	return (
		<span
			className={classes}
			style={inlineStyle}
			onClick={onClick}
			role={onClick ? 'button' : undefined}
			tabIndex={onClick ? 0 : undefined}
			aria-label={ariaLabel || (onClick ? `${name} button` : name)}
		>
			{name}
		</span>
	);
};

export default MaterialIcon;
