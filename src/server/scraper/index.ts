import * as cheerio from 'cheerio';
import { setTimeout } from 'node:timers/promises';
import robotsParser from 'robots-parser';
import TurndownService from 'turndown';
import { cacheWithRedis } from '~/server/redis/redis';
import { SCRAPER_CONFIG } from './config';

export const DEFAULT_MAX_RETRIES = 3;
const MIN_DELAY_MS = 500; // 0.5 seconds
const MAX_DELAY_MS = 8000; // 8 seconds

export interface CrawlSuccessResponse {
	success: true;
	data: string;
}

export interface CrawlErrorResponse {
	success: false;
	error: string;
}

export type CrawlResponse = CrawlSuccessResponse | CrawlErrorResponse;

export interface BulkCrawlSuccessResponse {
	success: true;
	results: {
		url: string;
		result: CrawlSuccessResponse;
	}[];
}

export interface BulkCrawlFailureResponse {
	success: false;
	results: {
		url: string;
		result: CrawlResponse;
	}[];
	error: string;
}

export type BulkCrawlResponse = BulkCrawlSuccessResponse | BulkCrawlFailureResponse;

export interface CrawlOptions {
	maxRetries?: number;
}

export interface BulkCrawlOptions extends CrawlOptions {
	urls: string[];
}

const turndownService = new TurndownService({
	headingStyle: 'atx',
	codeBlockStyle: 'fenced',
	emDelimiter: '*',
});

const truncateContent = (content: string, maxLength: number): string => {
	if (content.length <= maxLength) {
		return content;
	}

	// Try to truncate at a natural break point (paragraph, sentence, etc.)
	const truncateAt = maxLength - SCRAPER_CONFIG.TRUNCATION_WARNING.length;

	// Look for paragraph breaks first
	const lastParagraph = content.lastIndexOf('\n\n', truncateAt);
	if (lastParagraph > truncateAt * 0.8) {
		// If we found a paragraph break in the last 20%
		return content.substring(0, lastParagraph) + SCRAPER_CONFIG.TRUNCATION_WARNING;
	}

	// Look for sentence breaks
	const lastSentence = content.lastIndexOf('. ', truncateAt);
	if (lastSentence > truncateAt * 0.8) {
		return content.substring(0, lastSentence + 1) + SCRAPER_CONFIG.TRUNCATION_WARNING;
	}

	// Look for any line break
	const lastLine = content.lastIndexOf('\n', truncateAt);
	if (lastLine > truncateAt * 0.8) {
		return content.substring(0, lastLine) + SCRAPER_CONFIG.TRUNCATION_WARNING;
	}

	// Last resort: hard truncate at word boundary
	const lastSpace = content.lastIndexOf(' ', truncateAt);
	const cutPoint = lastSpace > truncateAt * 0.9 ? lastSpace : truncateAt;

	return content.substring(0, cutPoint) + SCRAPER_CONFIG.TRUNCATION_WARNING;
};

const isPdfUrl = (url: string): boolean => {
	const urlLower = url.toLowerCase();
	return SCRAPER_CONFIG.BLOCKED_EXTENSIONS.some((ext) => urlLower.includes(ext)) || urlLower.includes('filetype:pdf');
};

const getContentTypeFromResponse = (response: Response): string => {
	return response.headers.get('content-type')?.toLowerCase() || '';
};

const isContentTypeSupported = (contentType: string): boolean => {
	return SCRAPER_CONFIG.SUPPORTED_CONTENT_TYPES.some((type) => contentType.includes(type));
};

const extractArticleText = (html: string): string => {
	const $ = cheerio.load(html);
	$('script, style, nav, header, footer, iframe, noscript').remove();

	const articleSelectors = ['article', '[role="main"]', '.post-content', '.article-content', 'main', '.content'];

	let content = '';

	for (const selector of articleSelectors) {
		const element = $(selector);
		if (element.length) {
			content = turndownService.turndown(element.html() || '');
			break;
		}
	}

	if (!content) {
		content = turndownService.turndown($('body').html() || '');
	}

	return content.trim();
};

const checkRobotsTxt = async (url: string): Promise<boolean> => {
	try {
		const parsedUrl = new URL(url);
		const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
		const response = await fetch(robotsUrl);

		if (!response.ok) {
			// If no robots.txt exists, assume crawling is allowed
			return true;
		}

		const robotsTxt = await response.text();
		const robots = robotsParser(robotsUrl, robotsTxt);

		// Use a common crawler user agent
		return robots.isAllowed(url, 'LinkedInBot') ?? true;
	} catch (error) {
		// If there's an error checking robots.txt, assume crawling is allowed
		return true;
	}
};

export const bulkCrawlWebsites = async (options: BulkCrawlOptions): Promise<BulkCrawlResponse> => {
	const { urls, maxRetries = DEFAULT_MAX_RETRIES } = options;

	const results = await Promise.all(
		urls.map(async (url) => ({
			url,
			result: await crawlWebsite({ url, maxRetries }),
		})),
	);

	const allSuccessful = results.every((r) => r.result.success);

	if (!allSuccessful) {
		const errors = results
			.filter((r) => !r.result.success)
			.map((r) => `${r.url}: ${(r.result as CrawlErrorResponse).error}`)
			.join('\n');

		return {
			results,
			success: false,
			error: `Failed to crawl some websites:\n${errors}`,
		};
	}

	return {
		results,
		success: true,
	} as BulkCrawlResponse;
};

export const crawlWebsite = cacheWithRedis(
	'crawlWebsite',
	async (options: CrawlOptions & { url: string }): Promise<CrawlResponse> => {
		const { url, maxRetries = DEFAULT_MAX_RETRIES } = options;

		// Check robots.txt before attempting to crawl
		const isAllowed = await checkRobotsTxt(url);
		if (!isAllowed) {
			return {
				success: false,
				error: `Crawling not allowed by robots.txt for: ${url}`,
			};
		}

		let attempts = 0;

		while (attempts < maxRetries) {
			try {
				// Check if URL suggests it's a blocked file type
				if (isPdfUrl(url)) {
					return {
						success: false,
						error: `Blocked file type detected to prevent excessive token usage: ${url}`,
					};
				}

				const response = await fetch(url);

				if (response.ok) {
					// Check content type for unsupported files
					const contentType = getContentTypeFromResponse(response);
					if (contentType.includes('application/pdf')) {
						return {
							success: false,
							error: `PDF files are not supported for scraping to prevent excessive token usage: ${url}`,
						};
					}

					// Check if content type is supported
					if (contentType && !isContentTypeSupported(contentType)) {
						return {
							success: false,
							error: `Unsupported content type: ${contentType} for ${url}`,
						};
					}

					const html = await response.text();

					// Early size check - if HTML itself is too large, don't even process it
					if (html.length > SCRAPER_CONFIG.MAX_HTML_SIZE) {
						return {
							success: false,
							error: `Content too large (${html.length} characters) - skipping to prevent excessive token usage: ${url}`,
						};
					}

					const articleText = extractArticleText(html);

					// Determine max length based on content type
					const maxLength = contentType.includes('application/pdf')
						? SCRAPER_CONFIG.MAX_CONTENT_LENGTH_PDF
						: SCRAPER_CONFIG.MAX_CONTENT_LENGTH;

					const truncatedText = truncateContent(articleText, maxLength);

					return {
						success: true,
						data: truncatedText,
					};
				}

				attempts++;
				if (attempts === maxRetries) {
					return {
						success: false,
						error: `Failed to fetch website after ${maxRetries} attempts: ${response.status} ${response.statusText}`,
					};
				}

				// Exponential backoff: 0.5s, 1s, 2s, 4s, 8s max
				const delay = Math.min(MIN_DELAY_MS * Math.pow(2, attempts), MAX_DELAY_MS);
				await setTimeout(delay);
			} catch (error) {
				attempts++;
				if (attempts === maxRetries) {
					return {
						success: false,
						error: `Network error after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
					};
				}
				const delay = Math.min(MIN_DELAY_MS * Math.pow(2, attempts), MAX_DELAY_MS);
				await setTimeout(delay);
			}
		}

		return {
			success: false,
			error: 'Maximum retry attempts reached',
		};
	},
);
