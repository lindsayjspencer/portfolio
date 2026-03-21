import { Inter, Lato } from 'next/font/google';

export const inter = Inter({
	subsets: ['latin'],
	weight: ['400', '500', '600', '700', '800'],
	display: 'swap',
	variable: '--font-inter',
});

export const lato = Lato({
	subsets: ['latin'],
	weight: ['400'],
	style: ['normal'],
	display: 'swap',
	variable: '--font-lato',
});
