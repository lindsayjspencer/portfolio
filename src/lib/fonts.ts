import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';

export const bodyFont = Plus_Jakarta_Sans({
	subsets: ['latin'],
	weight: ['400', '500', '600', '700', '800'],
	display: 'swap',
	variable: '--font-body',
});

export const displayFont = Fraunces({
	subsets: ['latin'],
	weight: ['600', '700'],
	display: 'swap',
	variable: '--font-display',
});
