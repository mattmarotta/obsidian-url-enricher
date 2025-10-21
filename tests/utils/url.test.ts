import { describe, it, expect } from 'vitest';
import { extractSingleUrl, looksLikeUrl, extractUrlList, type UrlListEntry } from '../../src/utils/url';
import { VALID_URLS, INVALID_URLS, WRAPPED_URLS, MULTIPLE_URL_TEXT } from '../fixtures/url-samples';
import { expectValidUrl, expectUrlListEntry } from '../helpers/assertion-helpers';

describe('URL Utilities', () => {
	describe('extractSingleUrl', () => {
		describe('Valid URLs', () => {
			it('should extract bare HTTP URL', () => {
				const url = extractSingleUrl('http://example.com');
				expect(url).toBe('http://example.com');
			});

			it('should extract bare HTTPS URL', () => {
				const url = extractSingleUrl('https://example.com');
				expect(url).toBe('https://example.com');
			});

			it('should extract URL with path', () => {
				const url = extractSingleUrl('https://example.com/path/to/page');
				expect(url).toBe('https://example.com/path/to/page');
			});

			it('should extract URL with query parameters', () => {
				const url = extractSingleUrl('https://example.com?foo=bar&baz=qux');
				expect(url).toBe('https://example.com?foo=bar&baz=qux');
			});

			it('should extract URL with fragment', () => {
				const url = extractSingleUrl('https://example.com#section');
				expect(url).toBe('https://example.com#section');
			});

			it('should extract URL with port', () => {
				const url = extractSingleUrl('https://example.com:8080');
				expect(url).toBe('https://example.com:8080');
			});

			it('should extract URL with subdomain', () => {
				const url = extractSingleUrl('https://subdomain.example.com');
				expect(url).toBe('https://subdomain.example.com');
			});

			it('should trim whitespace from URL', () => {
				const url = extractSingleUrl('  https://example.com  ');
				expect(url).toBe('https://example.com');
			});
		});

		describe('Wrapped URLs', () => {
			WRAPPED_URLS.forEach(({ input, expected }) => {
				it(`should extract wrapped URL: ${input}`, () => {
					const url = extractSingleUrl(input);
					expect(url).toBe(expected);
				});
			});

			it('should handle wrapped URL with extra spaces', () => {
				const url = extractSingleUrl('<  https://example.com  >');
				expect(url).toBe('https://example.com');
			});
		});

		describe('Invalid Input', () => {
			it('should return null for empty string', () => {
				const url = extractSingleUrl('');
				expect(url).toBe(null);
			});

			it('should return null for whitespace-only string', () => {
				const url = extractSingleUrl('   ');
				expect(url).toBe(null);
			});

			it('should return null for non-URL text', () => {
				const url = extractSingleUrl('not a url');
				expect(url).toBe(null);
			});

			it('should return null for URL with surrounding text', () => {
				const url = extractSingleUrl('Check out https://example.com for more info');
				expect(url).toBe(null);
			});

			it('should return null for incomplete URL', () => {
				const url = extractSingleUrl('http://');
				expect(url).toBe(null);
			});

			it('should return null for domain without protocol', () => {
				const url = extractSingleUrl('example.com');
				expect(url).toBe(null);
			});
		});
	});

	describe('looksLikeUrl', () => {
		describe('Valid URLs', () => {
			VALID_URLS.forEach((url) => {
				it(`should return true for: ${url}`, () => {
					expect(looksLikeUrl(url)).toBe(true);
				});
			});

			it('should return true for URL with trailing whitespace', () => {
				expect(looksLikeUrl('https://example.com   ')).toBe(true);
			});

			it('should return true for URL with leading whitespace', () => {
				expect(looksLikeUrl('   https://example.com')).toBe(true);
			});
		});

		describe('Invalid URLs', () => {
			INVALID_URLS.forEach((input) => {
				it(`should return false for: "${input}"`, () => {
					expect(looksLikeUrl(input)).toBe(false);
				});
			});
		});
	});

	describe('extractUrlList', () => {
		describe('Single URL', () => {
			it('should extract single URL', () => {
				const result = extractUrlList('https://example.com');
				expect(result).toHaveLength(1);
				expect(result![0].url).toBe('https://example.com');
				expectUrlListEntry(result![0]);
			});

			it('should extract URL with whitespace', () => {
				const result = extractUrlList('  https://example.com  ');
				expect(result).toHaveLength(1);
				expect(result![0].url).toBe('https://example.com');
			});
		});

		describe('Multiple URLs', () => {
			it('should extract multiple URLs from text', () => {
				const result = extractUrlList(MULTIPLE_URL_TEXT);
				expect(result).toHaveLength(3);
				expect(result![0].url).toBe('https://first.com');
				expect(result![1].url).toBe('https://second.com');
				expect(result![2].url).toBe('https://third.com');
			});

			it('should extract URLs on same line with whitespace', () => {
				const result = extractUrlList('https://first.com  https://second.com');
				expect(result).toHaveLength(2);
			});
		});

		describe('URL Positions', () => {
			it('should track correct start and end positions', () => {
				const text = 'https://example.com';
				const result = extractUrlList(text);
				expect(result).toHaveLength(1);
				expect(result![0].start).toBe(0);
				expect(result![0].end).toBe(text.length);
			});

			it('should track positions for multiple URLs', () => {
				const text = 'https://first.com\nhttps://second.com';
				const result = extractUrlList(text);
				expect(result).toHaveLength(2);
				expect(result![0].start).toBe(0);
				expect(result![0].end).toBe('https://first.com'.length);
				expect(result![1].start).toBeGreaterThan(result![0].end);
			});
		});

		describe('Markdown Link Exclusion', () => {
			it('should skip URLs in markdown links [text](url)', () => {
				const text = '[text](https://example.com)';
				const result = extractUrlList(text);
				expect(result).toBe(null);
			});

			it('should return null when markdown link present (mixed content)', () => {
				// extractUrlList returns null when non-URL content is present
				// This is correct behavior - markdown links count as non-URL content
				const text = 'https://first.com\n[text](https://skip.com)\nhttps://second.com';
				const result = extractUrlList(text);
				expect(result).toBe(null);
			});

			it('should extract URL when it appears in link text [URL](notes)', () => {
				const text = '[https://example.com](notes)';
				const result = extractUrlList(text);
				expect(result).toHaveLength(1);
				expect(result![0].url).toBe('https://example.com');
				expect(result![0].start).toBe(0);
				expect(result![0].end).toBe(text.length);
			});

			it('should extract URL with markdown link format and whitespace', () => {
				const text = '  [https://example.com](note)  ';
				const result = extractUrlList(text);
				expect(result).toHaveLength(1);
				expect(result![0].url).toBe('https://example.com');
			});

			it('should handle markdown link with URL in text followed by newline', () => {
				const text = '[https://example.com](note)\n';
				const result = extractUrlList(text);
				expect(result).toHaveLength(1);
				expect(result![0].end).toBe(text.length - 1);
			});

			it('should handle multiple markdown links with URLs in text', () => {
				const text = '[https://first.com](n1)\n[https://second.com](n2)';
				const result = extractUrlList(text);
				expect(result).toHaveLength(2);
				expect(result![0].url).toBe('https://first.com');
				expect(result![1].url).toBe('https://second.com');
			});
		});

		describe('Wrapped URLs', () => {
			it('should extract URL wrapped in angle brackets', () => {
				const result = extractUrlList('<https://example.com>');
				expect(result).toHaveLength(1);
				expect(result![0].url).toBe('https://example.com');
			});

			it('should include angle brackets in position', () => {
				const text = '<https://example.com>';
				const result = extractUrlList(text);
				expect(result![0].start).toBe(0);
				expect(result![0].end).toBe(text.length);
			});
		});

		describe('Invalid Cases', () => {
			it('should return null for text with non-URL content', () => {
				const result = extractUrlList('Some text https://example.com more text');
				expect(result).toBe(null);
			});

			it('should return null for mixed content', () => {
				const result = extractUrlList('Not just URLs: https://example.com and stuff');
				expect(result).toBe(null);
			});

			it('should return empty array for non-string input', () => {
				const result = extractUrlList(null as any);
				expect(result).toEqual([]);
			});

			it('should return empty array for undefined', () => {
				const result = extractUrlList(undefined as any);
				expect(result).toEqual([]);
			});

			it('should return null for trailing non-whitespace', () => {
				const result = extractUrlList('https://example.com text');
				expect(result).toBe(null);
			});

			it('should return null for leading non-whitespace', () => {
				const result = extractUrlList('text https://example.com');
				expect(result).toBe(null);
			});
		});

		describe('Edge Cases', () => {
			it('should handle empty string', () => {
				const result = extractUrlList('');
				expect(result).toEqual([]);
			});

			it('should handle whitespace-only string', () => {
				const result = extractUrlList('   \n  \t  ');
				expect(result).toEqual([]);
			});

			it('should handle URLs with various separators', () => {
				const text = 'https://first.com\n\nhttps://second.com\t\thttps://third.com';
				const result = extractUrlList(text);
				expect(result).toHaveLength(3);
			});
		});
	});
});
