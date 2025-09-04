import '~/styles/main.scss';
import { type Metadata } from 'next';
import { headers } from 'next/headers';
import { ThemeProvider } from '~/contexts/theme-context';
import { getServerTheme } from '~/lib/server-theme';
import { IconPreloader } from '~/components/Ui';
import Script from 'next/script';

const baseMetadata: Metadata = {
	title: 'Lindsay Spencer - Interactive Portfolio',
	description:
		'An interactive portfolio showcasing my software development experience through an AI-powered conversational interface and dynamic visualizations.',
	keywords:
		'portfolio, software engineer, full-stack developer, React, TypeScript, .NET, Azure, interactive resume, data visualization',
	authors: [{ name: 'Lindsay Spencer' }],
	icons: {
		other: [
			{ rel: 'icon', url: '/favicon-light.svg', media: '(prefers-color-scheme: light)' },
			{ rel: 'icon', url: '/favicon-dark.svg', media: '(prefers-color-scheme: dark)' },
		],
	},
};

export async function generateMetadata(): Promise<Metadata> {
	// Build a canonical URL on the server, stripping query/hash (root path only for this app)
	const h = headers();
	const proto = h.get('x-forwarded-proto') ?? 'https';
	const host = h.get('x-forwarded-host') ?? h.get('host') ?? undefined;
	const canonical = host ? `${proto}://${host}/` : undefined;

	return {
		...baseMetadata,
		alternates: canonical ? { canonical } : undefined,
	} satisfies Metadata;
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	const serverTheme = await getServerTheme();

	return (
		<html lang="en">
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				<link
					href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=block"
					rel="stylesheet"
				/>
				{/* Subset Material Symbols to only the icons we actually use to reduce payload */}
				<link
					rel="stylesheet"
					href={
						'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200' +
						'&icon.names=' +
						[
							// DOM icons rendered via <MaterialIcon variant="outlined" />
							'arrow_upward',
							'auto_awesome',
							'bookmark',
							'chevron_right',
							'close',
							'description',
							'file_download',
							'diversity_3',
							'fit_page',
							'group',
							'info',
							'insights',
							'lightbulb',
							'more_horiz',
							'public',
							'search',
							'speed',
							// Contact icons for resume
							'mail',
							'code',
							'language',
							'link',
						].join(',') +
						'&display=block'
					}
				/>
				<link
					rel="stylesheet"
					href={
						'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200' +
						'&icon.names=' +
						[
							// Canvas-drawn icons via DrawingUtils (rounded family)
							'anchor',
							'auto_awesome',
							'auto_stories',
							'bolt',
							'calendar_today',
							'extension',
							'favorite',
							'person',
							'rocket_launch',
							'sell',
							'star',
							'work',
						].join(',') +
						'&display=block'
					}
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body>
				<ThemeProvider serverTheme={serverTheme}>
					<IconPreloader>{children}</IconPreloader>
				</ThemeProvider>
			</body>
		</html>
	);
}
