'use client';

import React from 'react';
import { useComponentSize, type ComponentSize } from '~/hooks/UseComponentSize';
import { useComponentColor, type ThemeColor } from '~/hooks/UseComponentColor';
import './Spinner.scss';

export interface SpinnerProps {
	/** Size variant or custom size in pixels */
	size?: ComponentSize;
	/** Theme color or CSS color value */
	color?: ThemeColor | string;
	/** Additional CSS classes */
	className?: string;
	/** Custom CSS properties */
	style?: React.CSSProperties;
	/** Accessible label for screen readers */
	'aria-label'?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
	size = 'md',
	color = 'primary-500',
	className = '',
	style = {},
	'aria-label': ariaLabel = 'Loading',
}) => {
	// Use extracted hooks for consistent sizing and coloring
	const sizeValue = useComponentSize(size);
	const colorValue = useComponentColor(color);

	// Build CSS classes
	const classes = ['spinner', className].filter(Boolean).join(' ');

	// Build inline styles
	const inlineStyle: React.CSSProperties = {
		width: `calc(${sizeValue} - 4px)`,
		height: `calc(${sizeValue} - 4px)`,
		borderColor: `${colorValue}20`, // 20 = ~12% opacity for light border
		borderTopColor: colorValue,
		...style,
	};

	return (
		<div
			className={classes}
			style={inlineStyle}
			role="progressbar"
			aria-label={ariaLabel}
			aria-valuetext="Loading"
		/>
	);
};

export default Spinner;
