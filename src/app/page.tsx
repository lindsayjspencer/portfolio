import { redirect } from 'next/navigation';
import { createDefaultLandingDirective } from '~/lib/ai/directiveTools';
import { decodeUrlState, toStoreDirectiveFromUrlState, validateUrlState } from '~/utils/urlState';
import './page.scss';
import { HomePageClient } from './HomePageClient';

type HomePageProps = {
	searchParams?: {
		state?: string | string[];
	};
};

function getSingleValue(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

export default function HomePage({ searchParams }: HomePageProps) {
	const encodedState = getSingleValue(searchParams?.state);

	if (!encodedState) {
		return <HomePageClient initialDirective={createDefaultLandingDirective()} />;
	}

	const rawState = decodeUrlState(encodedState);
	const validatedState = validateUrlState(rawState);

	if (!validatedState) {
		redirect('/');
	}

	return <HomePageClient initialDirective={toStoreDirectiveFromUrlState(validatedState)} />;
}
