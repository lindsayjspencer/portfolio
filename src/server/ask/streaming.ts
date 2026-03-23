type TextStreamEvent = { type: 'text'; delta: string };

const WORD_CHUNK_PATTERN = /\S+\s*|\s+/g;

function splitIntoWordChunks(text: string): string[] {
	return text.match(WORD_CHUNK_PATTERN) ?? [];
}

function wait(delayMs: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, delayMs);
	});
}

export async function emitSyntheticWordStream({
	text,
	emit,
	delayMs = 20,
}: {
	text: string;
	emit: (event: TextStreamEvent) => void;
	delayMs?: number;
}): Promise<void> {
	const chunks = splitIntoWordChunks(text);

	for (const [index, chunk] of chunks.entries()) {
		emit({ type: 'text', delta: chunk });

		if (delayMs > 0 && index < chunks.length - 1) {
			await wait(delayMs);
		}
	}
}
