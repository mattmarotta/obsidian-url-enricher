import { describe, it, expect } from 'vitest';
import { findMarkdownLinkRange } from '../../src/utils/markdown';

describe('Markdown Utilities', () => {
	describe('findMarkdownLinkRange', () => {
		describe('Valid Markdown Links', () => {
			it('should find markdown link with URL in link text', () => {
				const content = '[https://example.com](notes)';
				const urlStart = 1; // Start of URL in link text
				const urlEnd = 20; // End of URL in link text

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toEqual({ start: 0, end: 28 });
			});

			it('should find markdown link with whitespace after ]', () => {
				const content = '[https://example.com]  (notes)';
				const urlStart = 1;
				const urlEnd = 20;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toEqual({ start: 0, end: 30 });
			});

			it('should find markdown link in middle of text', () => {
				const content = 'See [https://example.com](notes) for details';
				const urlStart = 5;
				const urlEnd = 24;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toEqual({ start: 4, end: 32 });
			});

			it('should handle nested parentheses in URL text', () => {
				const content = '[https://example.com/page(1)](notes)';
				const urlStart = 1;
				const urlEnd = 28;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toEqual({ start: 0, end: 36 });
			});

			it('should handle multiple nested parentheses in URL text', () => {
				const content = '[https://example.com/page(foo(bar))](notes)';
				const urlStart = 1;
				const urlEnd = 35;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toEqual({ start: 0, end: 43 });
			});

			it('should find link with complex URL in text', () => {
				const content = '[https://example.com/path?query=value&other=123#fragment](notes)';
				const urlStart = 1;
				const urlEnd = 56;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toEqual({ start: 0, end: 64 });
			});
		});

		describe('Invalid Cases', () => {
			it('should return null when urlStart is 0', () => {
				const content = 'https://example.com';
				const result = findMarkdownLinkRange(content, 0, 19);

				expect(result).toBeNull();
			});

			it('should return null when urlStart is negative', () => {
				const content = 'text';
				const result = findMarkdownLinkRange(content, -1, 5);

				expect(result).toBeNull();
			});

			it('should return null when no opening bracket', () => {
				const content = 'https://example.com)(notes)';
				const urlStart = 1;
				const urlEnd = 19;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toBeNull();
			});

			it('should return null when opening bracket is after URL start', () => {
				const content = 'https://[example.com](test)';
				const urlStart = 1;
				const urlEnd = 20;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toBeNull();
			});

			it('should return null for image syntax (![...])', () => {
				const content = '![https://example.com/image.png](alt)';
				const urlStart = 2;
				const urlEnd = 31;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toBeNull();
			});

			it('should return null when no closing bracket', () => {
				const content = '[https://example.com(notes)';
				const urlStart = 1;
				const urlEnd = 20;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toBeNull();
			});

			it('should return null when closing bracket is before URL end', () => {
			const content = 'text https://example.com more';
			const urlStart = 5;
			const urlEnd = 24;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toBeNull();
			});

			it('should return null when no opening parenthesis', () => {
				const content = '[https://example.com]notes';
				const urlStart = 1;
				const urlEnd = 20;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toBeNull();
			});

			it('should return null when newline before closing parenthesis', () => {
				const content = '[https://example.com](\nnotes)';
				const urlStart = 1;
				const urlEnd = 20;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toBeNull();
			});

			it('should return null when no closing parenthesis', () => {
				const content = '[https://example.com](notes';
				const urlStart = 1;
				const urlEnd = 20;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toBeNull();
			});

			it('should return null when unbalanced nested parentheses', () => {
				const content = '[https://example.com/page(unclosed](notes';
				const urlStart = 1;
				const urlEnd = 34;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toBeNull();
			});
		});

		describe('Edge Cases', () => {
			it('should handle URL as entire link text', () => {
				const content = '[https://example.com](notes)';
				const urlStart = 1;
				const urlEnd = 20;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toEqual({ start: 0, end: 28 });
			});

			it('should handle link at start of content', () => {
				const content = '[https://example.com](notes)';
				const urlStart = 1;
				const urlEnd = 20;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toEqual({ start: 0, end: 28 });
			});

			it('should handle link at end of content', () => {
				const content = 'text [https://example.com](notes)';
				const urlStart = 6;
				const urlEnd = 25;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toEqual({ start: 5, end: 33 });
			});

			it('should handle multiple spaces after ]', () => {
				const content = '[https://example.com]     (notes)';
				const urlStart = 1;
				const urlEnd = 20;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toEqual({ start: 0, end: 33 });
			});

			it('should handle markdown link followed by other content', () => {
				const content = '[https://example.com](notes) and more text';
				const urlStart = 1;
				const urlEnd = 20;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toEqual({ start: 0, end: 28 });
			});

			it('should handle consecutive markdown links', () => {
				const content = '[https://first.com](n1) [https://second.com](n2)';

				// First link
				const result1 = findMarkdownLinkRange(content, 1, 18);
				expect(result1).toEqual({ start: 0, end: 23 });

				// Second link
				const result2 = findMarkdownLinkRange(content, 25, 43);
				expect(result2).toEqual({ start: 24, end: 48 });
			});

			it('should handle URL with special characters in link text', () => {
				const content = '[https://example.com/path?q=a&b=c](notes)';
				const urlStart = 1;
				const urlEnd = 33;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toEqual({ start: 0, end: 41 });
			});
		});

		describe('Real-world Examples', () => {
			it('should handle Wikipedia URL in link text', () => {
				const content = 'See [https://en.wikipedia.org/wiki/TypeScript](wiki) for more.';
				const urlStart = 5;
				const urlEnd = 45;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toEqual({ start: 4, end: 52 });
			});

			it('should handle GitHub URL with path in link text', () => {
				const content = 'Check out [https://github.com/user/repo/issues/123](gh)';
				const urlStart = 11;
				const urlEnd = 50;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toEqual({ start: 10, end: 55 });
			});

			it('should handle URL with query parameters in link text', () => {
				const content = '[https://google.com/search?q=test&lang=en](search)';
				const urlStart = 1;
				const urlEnd = 41;

				const result = findMarkdownLinkRange(content, urlStart, urlEnd);

				expect(result).toEqual({ start: 0, end: 50 });
			});
		});
	});
});
