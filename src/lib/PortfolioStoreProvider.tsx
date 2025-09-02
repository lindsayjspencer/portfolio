'use client';

import React, { useRef } from 'react';
import { createPortfolioStore, PortfolioStoreContext } from './PortfolioStore';
import type { Directive } from './ai/directiveTools';

type Props = {
	initialDirective: Directive;
	children: React.ReactNode;
};

export function PortfolioStoreProvider({ initialDirective, children }: Props) {
	const storeRef = useRef(createPortfolioStore(initialDirective));
	return <PortfolioStoreContext.Provider value={storeRef.current}>{children}</PortfolioStoreContext.Provider>;
}
