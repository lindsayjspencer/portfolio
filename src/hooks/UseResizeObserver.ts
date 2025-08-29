import { useEffect, useState } from 'react';

export default function useResizeObserver<T extends Element>(element?: T): DOMRect | undefined {
	const [rect, setRect] = useState<DOMRect>();

	useEffect(() => {
		if (!element) return;

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (entry.contentBoxSize) {
					if (element) {
						setRect(element.getBoundingClientRect());
					}
				}
			}
		});

		resizeObserver.observe(element);

		return () => {
			resizeObserver.disconnect();
		};
	}, [element]);

	return rect;
}

export function useResizeObserverRef<T extends Element>(ref: React.RefObject<T>): DOMRect | undefined {
	return useResizeObserver(ref.current ?? undefined);
}
