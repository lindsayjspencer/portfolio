'use client';

import { useEffect } from 'react';

export function CanonicalLink() {
	useEffect(() => {
		const update = () => {
			try {
				const { origin, pathname } = window.location;
				const href = `${origin}${pathname}`; // strip query/hash
				let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
				if (!link) {
					link = document.createElement('link');
					link.setAttribute('rel', 'canonical');
					document.head.appendChild(link);
				}
				if (link.href !== href) link.href = href;
			} catch {
				// noop
			}
		};

		update();
		const onPop = () => update();
		window.addEventListener('popstate', onPop);
		return () => window.removeEventListener('popstate', onPop);
	}, []);

	return null;
}
