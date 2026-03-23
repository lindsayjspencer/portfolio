export function buildOpenAIPromptCacheOptions(promptCacheKey: string) {
	return {
		openai: {
			promptCacheKey,
			promptCacheRetention: 'in_memory' as const,
		},
	};
}
