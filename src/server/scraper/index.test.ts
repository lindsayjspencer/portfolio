import { describe, it, expect, vi, beforeEach } from 'vitest';
import { crawlWebsite, type CrawlErrorResponse } from './index';
import { SCRAPER_CONFIG } from './config';

// Mock the redis cache
vi.mock('~/server/redis/redis', () => ({
	cacheWithRedis: vi.fn((key: string, fn: Function) => fn),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Content Size Limiting', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should reject PDF URLs', async () => {
		const result = await crawlWebsite({
			url: 'https://example.com/document.pdf',
			maxRetries: 1,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('Blocked file type detected');
		}
	});

	it('should reject other blocked file extensions', async () => {
		const testUrls = [
			'https://example.com/document.docx',
			'https://example.com/presentation.pptx',
			'https://example.com/spreadsheet.xlsx',
		];

		for (const url of testUrls) {
			const result = await crawlWebsite({ url, maxRetries: 1 });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('Blocked file type detected');
			}
		}
	});

	it('should reject PDF content type', async () => {
		const mockResponse = {
			ok: true,
			headers: {
				get: vi.fn().mockReturnValue('application/pdf'),
			},
			text: vi.fn().mockResolvedValue('mock pdf content'),
		};

		(global.fetch as any).mockResolvedValue(mockResponse);

		const result = await crawlWebsite({
			url: 'https://example.com/hidden-pdf',
			maxRetries: 1,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('PDF files are not supported');
		}
	});

	it('should reject unsupported content types', async () => {
		const mockResponse = {
			ok: true,
			headers: {
				get: vi.fn().mockReturnValue('application/octet-stream'),
			},
			text: vi.fn().mockResolvedValue('binary content'),
		};

		(global.fetch as any).mockResolvedValue(mockResponse);

		const result = await crawlWebsite({
			url: 'https://example.com/binary-file',
			maxRetries: 1,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('Unsupported content type');
		}
	});

	it('should reject content that is too large', async () => {
		const largeContent = 'x'.repeat(SCRAPER_CONFIG.MAX_HTML_SIZE + 1000);

		const mockResponse = {
			ok: true,
			headers: {
				get: vi.fn().mockReturnValue('text/html'),
			},
			text: vi.fn().mockResolvedValue(largeContent),
		};

		(global.fetch as any).mockResolvedValue(mockResponse);

		const result = await crawlWebsite({
			url: 'https://example.com/huge-page',
			maxRetries: 1,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('Content too large');
		}
	});

	it('should truncate content that exceeds limits', async () => {
		// Create content longer than the limit
		const longContent = `
      <html>
        <body>
          <article>
            ${'This is a long paragraph. '.repeat(3000)}
          </article>
        </body>
      </html>
    `;

		const mockResponse = {
			ok: true,
			headers: {
				get: vi.fn().mockReturnValue('text/html'),
			},
			text: vi.fn().mockResolvedValue(longContent),
		};

		(global.fetch as any).mockResolvedValue(mockResponse);

		const result = await crawlWebsite({
			url: 'https://example.com/long-content',
			maxRetries: 1,
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.length).toBeLessThanOrEqual(SCRAPER_CONFIG.MAX_CONTENT_LENGTH);
			expect(result.data).toContain(SCRAPER_CONFIG.TRUNCATION_WARNING);
		}
	});

	it('should handle normal content without truncation', async () => {
		const normalContent = `
      <html>
        <body>
          <article>
            <h1>Test Article</h1>
            <p>This is a normal sized article with reasonable content.</p>
          </article>
        </body>
      </html>
    `;

		const mockResponse = {
			ok: true,
			headers: {
				get: vi.fn().mockReturnValue('text/html'),
			},
			text: vi.fn().mockResolvedValue(normalContent),
		};

		(global.fetch as any).mockResolvedValue(mockResponse);

		const result = await crawlWebsite({
			url: 'https://example.com/normal-page',
			maxRetries: 1,
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).not.toContain(SCRAPER_CONFIG.TRUNCATION_WARNING);
		}
	});

	it('should allow supported content types', async () => {
		const supportedTypes = ['text/html', 'text/plain', 'application/xml', 'application/xhtml+xml'];

		for (const contentType of supportedTypes) {
			const mockResponse = {
				ok: true,
				headers: {
					get: vi.fn().mockReturnValue(contentType),
				},
				text: vi.fn().mockResolvedValue('<html><body>Test content</body></html>'),
			};

			(global.fetch as any).mockResolvedValue(mockResponse);

			const result = await crawlWebsite({
				url: `https://example.com/test-${contentType.replace('/', '-')}`,
				maxRetries: 1,
			});

			expect(result.success).toBe(true);
		}
	});
});
