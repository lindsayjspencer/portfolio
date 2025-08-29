export const SCRAPER_CONFIG = {
	// Content size limits to prevent excessive LLM costs
	MAX_CONTENT_LENGTH: 50000, // ~50k characters (roughly 12k-15k tokens)
	MAX_CONTENT_LENGTH_PDF: 10000, // Stricter limit for PDFs
	TRUNCATION_WARNING: '\n\n[Content truncated to prevent excessive token usage...]',

	// Supported content types
	SUPPORTED_CONTENT_TYPES: ['text/html', 'text/plain', 'application/xml', 'application/xhtml+xml', 'text/xml'],

	// Maximum HTML size before processing (3x content limit to account for markup)
	MAX_HTML_SIZE: 1500000,

	// File extensions to block
	BLOCKED_EXTENSIONS: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'],
} as const;
