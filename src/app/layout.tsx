import '~/styles/main.scss';
import { type Metadata } from 'next';
import { ThemeProvider } from '~/contexts/theme-context';
import { getServerTheme } from '~/lib/server-theme';
import { IconPreloader } from '~/components/Ui';

export const metadata: Metadata = {
	title: 'Lindsay Spencer - Interactive Portfolio',
	description:
		'An interactive portfolio showcasing my software development experience through an AI-powered conversational interface and dynamic visualizations.',
	keywords:
		'portfolio, software engineer, full-stack developer, React, TypeScript, .NET, Azure, interactive resume, data visualization',
	authors: [{ name: 'Lindsay Spencer' }],
	icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

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
				<link
					rel="stylesheet"
					href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
				/>
				<link
					rel="stylesheet"
					href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
				/>
				<link
					rel="stylesheet"
					href="https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
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
