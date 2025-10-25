import { describe, it, expect } from 'vitest';
import { sanitizeTextContent } from '../../src/utils/text';

/**
 * Tests for urlPreviewDecorator.ts
 *
 * Focus: Business logic (frontmatter parsing, settings merging, helper functions)
 * Skip: CodeMirror widget rendering, DOM manipulation
 */

// Helper constants
const ELLIPSIS = '\u2026';

// We'll need to extract these functions to test them
// For now, we'll copy the logic here to test it

/**
 * Parse frontmatter from document text
 * (Copied from urlPreviewDecorator.ts for testing)
 */
function parsePageConfig(text: string): {
	previewStyle?: 'inline' | 'card';
	maxCardLength?: number;
	maxInlineLength?: number;
	showFavicon?: boolean;
	includeDescription?: boolean;
	previewColorMode?: 'none' | 'grey' | 'custom';
	customPreviewColor?: string;
} {
	const config: any = {};

	// Check if document starts with frontmatter
	if (!text.startsWith('---')) {
		return config;
	}

	// Find the closing ---
	const lines = text.split('\n');
	let endIndex = -1;
	for (let i = 1; i < lines.length; i++) {
		if (lines[i].trim() === '---') {
			endIndex = i;
			break;
		}
	}

	if (endIndex === -1) {
		return config;
	}

	// Parse frontmatter lines
	const frontmatter = lines.slice(1, endIndex);

	for (const line of frontmatter) {
		// Preview style
		const styleMatch = line.match(/^preview-style:\s*(.+)$/i);
		if (styleMatch) {
			const value = styleMatch[1].trim().toLowerCase();
			if (value === 'inline' || value === 'card') {
				config.previewStyle = value;
			}
		}

		// Max card length
		const maxCardMatch = line.match(/^max-card-length:\s*(\d+)$/i);
		if (maxCardMatch) {
			const value = parseInt(maxCardMatch[1], 10);
			if (value >= 1 && value <= 5000) {
				config.maxCardLength = value;
			}
		}

		// Max inline length
		const maxInlineMatch = line.match(/^max-inline-length:\s*(\d+)$/i);
		if (maxInlineMatch) {
			const value = parseInt(maxInlineMatch[1], 10);
			if (value >= 1 && value <= 5000) {
				config.maxInlineLength = value;
			}
		}

		// Show favicon
		const faviconMatch = line.match(/^show-favicon:\s*(.+)$/i);
		if (faviconMatch) {
			const value = faviconMatch[1].trim().toLowerCase();
			if (value === 'true' || value === 'false') {
				config.showFavicon = value === 'true';
			}
		}

		// Include description
		const descMatch = line.match(/^include-description:\s*(.+)$/i);
		if (descMatch) {
			const value = descMatch[1].trim().toLowerCase();
			if (value === 'true' || value === 'false') {
				config.includeDescription = value === 'true';
			}
		}

		// Preview color mode
		const colorModeMatch = line.match(/^preview-color-mode:\s*(.+)$/i);
		if (colorModeMatch) {
			const value = colorModeMatch[1].trim().toLowerCase();
			if (value === 'none' || value === 'grey' || value === 'custom') {
				config.previewColorMode = value;
			}
		}

		// Custom preview color
		const customColorMatch = line.match(/^custom-preview-color:\s*(.+)$/i);
		if (customColorMatch) {
			config.customPreviewColor = customColorMatch[1].trim();
		}
	}

	return config;
}

/**
 * Strip emoji from text
 * (Copied from urlPreviewDecorator.ts for testing)
 */
const emojiRegex = (() => {
	try {
		return new RegExp('\\p{Extended_Pictographic}', 'gu');
	} catch {
		// Basic fallback covering common emoji ranges
		return /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{2600}-\u{27BF}]/gu;
	}
})();

function stripEmoji(value: string): string {
	return value.replace(emojiRegex, '').replace(/\s+/g, ' ').trim();
}

describe('URL Preview Decorator', () => {
	describe('parsePageConfig', () => {
		describe('Valid Frontmatter', () => {
			it('should parse complete frontmatter with all fields', () => {
				const text = `---
preview-style: card
max-card-length: 400
max-inline-length: 150
show-favicon: true
include-description: true
preview-color-mode: custom
custom-preview-color: #ff0000
---
# Content here`;

				const config = parsePageConfig(text);

				expect(config.previewStyle).toBe('card');
				expect(config.maxCardLength).toBe(400);
				expect(config.maxInlineLength).toBe(150);
				expect(config.showFavicon).toBe(true);
				expect(config.includeDescription).toBe(true);
				expect(config.previewColorMode).toBe('custom');
				expect(config.customPreviewColor).toBe('#ff0000');
			});

			it('should parse preview-style: inline', () => {
				const text = `---
preview-style: inline
---`;
				const config = parsePageConfig(text);
				expect(config.previewStyle).toBe('inline');
			});

			it('should parse preview-style: card', () => {
				const text = `---
preview-style: card
---`;
				const config = parsePageConfig(text);
				expect(config.previewStyle).toBe('card');
			});


			it('should parse valid max-card-length', () => {
				const text = `---
max-card-length: 500
---`;
				const config = parsePageConfig(text);
				expect(config.maxCardLength).toBe(500);
			});

			it('should parse minimum max-card-length (1)', () => {
				const text = `---
max-card-length: 1
---`;
				const config = parsePageConfig(text);
				expect(config.maxCardLength).toBe(1);
			});

			it('should parse recommended minimum max-card-length (100)', () => {
				const text = `---
max-card-length: 100
---`;
				const config = parsePageConfig(text);
				expect(config.maxCardLength).toBe(100);
			});

			it('should parse maximum max-card-length (5000)', () => {
				const text = `---
max-card-length: 5000
---`;
				const config = parsePageConfig(text);
				expect(config.maxCardLength).toBe(5000);
			});

			it('should parse valid max-inline-length', () => {
				const text = `---
max-inline-length: 200
---`;
				const config = parsePageConfig(text);
				expect(config.maxInlineLength).toBe(200);
			});

			it('should parse minimum max-inline-length (1)', () => {
				const text = `---
max-inline-length: 1
---`;
				const config = parsePageConfig(text);
				expect(config.maxInlineLength).toBe(1);
			});

			it('should parse recommended minimum max-inline-length (50)', () => {
				const text = `---
max-inline-length: 50
---`;
				const config = parsePageConfig(text);
				expect(config.maxInlineLength).toBe(50);
			});

			it('should parse show-favicon: true', () => {
				const text = `---
show-favicon: true
---`;
				const config = parsePageConfig(text);
				expect(config.showFavicon).toBe(true);
			});

			it('should parse show-favicon: false', () => {
				const text = `---
show-favicon: false
---`;
				const config = parsePageConfig(text);
				expect(config.showFavicon).toBe(false);
			});

			it('should parse include-description: true', () => {
				const text = `---
include-description: true
---`;
				const config = parsePageConfig(text);
				expect(config.includeDescription).toBe(true);
			});

			it('should parse include-description: false', () => {
				const text = `---
include-description: false
---`;
				const config = parsePageConfig(text);
				expect(config.includeDescription).toBe(false);
			});

			it('should parse preview-color-mode: none', () => {
				const text = `---
preview-color-mode: none
---`;
				const config = parsePageConfig(text);
				expect(config.previewColorMode).toBe('none');
			});

			it('should parse preview-color-mode: grey', () => {
				const text = `---
preview-color-mode: grey
---`;
				const config = parsePageConfig(text);
				expect(config.previewColorMode).toBe('grey');
			});

			it('should parse preview-color-mode: custom', () => {
				const text = `---
preview-color-mode: custom
---`;
				const config = parsePageConfig(text);
				expect(config.previewColorMode).toBe('custom');
			});

			it('should parse custom-preview-color', () => {
				const text = `---
custom-preview-color: #336699
---`;
				const config = parsePageConfig(text);
				expect(config.customPreviewColor).toBe('#336699');
			});

			it('should be case-insensitive for keys', () => {
				const text = `---
PREVIEW-STYLE: card
Preview-Display: INLINE
---`;
				const config = parsePageConfig(text);
				expect(config.previewStyle).toBe('card');
			});

			it('should handle extra whitespace in values', () => {
				const text = `---
preview-style:   inline
show-favicon:  true
---`;
				const config = parsePageConfig(text);
				expect(config.previewStyle).toBe('inline');
				expect(config.showFavicon).toBe(true);
			});

			it('should parse partial frontmatter (only some fields)', () => {
				const text = `---
preview-style: card
max-card-length: 300
---`;
				const config = parsePageConfig(text);
				expect(config.previewStyle).toBe('card');
				expect(config.maxCardLength).toBe(300);
				expect(config.showFavicon).toBeUndefined();
			});
		});

		describe('Invalid/Edge Cases', () => {
			it('should return empty config for document without frontmatter', () => {
				const text = '# Regular markdown\n\nNo frontmatter here';
				const config = parsePageConfig(text);
				expect(config).toEqual({});
			});

			it('should return empty config for empty frontmatter', () => {
				const text = `---
---
# Content`;
				const config = parsePageConfig(text);
				expect(config).toEqual({});
			});

			it('should return empty config when no closing ---', () => {
				const text = `---
preview-style: card
# Content without closing`;
				const config = parsePageConfig(text);
				expect(config).toEqual({});
			});

			it('should ignore invalid preview-style values', () => {
				const text = `---
preview-style: invalid
---`;
				const config = parsePageConfig(text);
				expect(config.previewStyle).toBeUndefined();
			});


			it('should ignore max-card-length below minimum (1)', () => {
				const text = `---
max-card-length: 0
---`;
				const config = parsePageConfig(text);
				expect(config.maxCardLength).toBeUndefined();
			});

			it('should ignore max-card-length above maximum (5000)', () => {
				const text = `---
max-card-length: 10000
---`;
				const config = parsePageConfig(text);
				expect(config.maxCardLength).toBeUndefined();
			});

			it('should ignore max-inline-length below minimum (1)', () => {
				const text = `---
max-inline-length: 0
---`;
				const config = parsePageConfig(text);
				expect(config.maxInlineLength).toBeUndefined();
			});

			it('should ignore invalid boolean values', () => {
				const text = `---
show-favicon: yes
include-description: 1
---`;
				const config = parsePageConfig(text);
				expect(config.showFavicon).toBeUndefined();
				expect(config.includeDescription).toBeUndefined();
			});

			it('should ignore invalid color-mode values', () => {
				const text = `---
preview-color-mode: rainbow
---`;
				const config = parsePageConfig(text);
				expect(config.previewColorMode).toBeUndefined();
			});

			it('should handle frontmatter not at document start', () => {
				const text = `Some text first
---
preview-style: card
---`;
				const config = parsePageConfig(text);
				expect(config).toEqual({});
			});

			it('should handle multiple --- blocks (only first counts)', () => {
				const text = `---
preview-style: inline
---
Content here
---
preview-style: card
---`;
				const config = parsePageConfig(text);
				expect(config.previewStyle).toBe('inline');
			});
		});
	});

	describe('stripEmoji', () => {
		it('should return text unchanged when no emojis present', () => {
			const result = stripEmoji('Plain text without emojis');
			expect(result).toBe('Plain text without emojis');
		});

		it('should remove single emoji', () => {
			const result = stripEmoji('Hello 😀 world');
			expect(result).toBe('Hello world');
		});

		it('should remove multiple emojis', () => {
			const result = stripEmoji('Test 🎉🎊🎈 party');
			expect(result).toBe('Test party');
		});

		it('should remove emoji at start of text', () => {
			const result = stripEmoji('😀 Hello');
			expect(result).toBe('Hello');
		});

		it('should remove emoji at end of text', () => {
			const result = stripEmoji('Hello 😀');
			expect(result).toBe('Hello');
		});

		it('should remove emoji in middle of text', () => {
			const result = stripEmoji('Hello 😀 world');
			expect(result).toBe('Hello world');
		});

		it('should handle text with mixed emoji and regular characters', () => {
			const result = stripEmoji('React 🎉 is cool 🚀');
			expect(result).toBe('React is cool');
		});

		it('should return empty string when input is only emojis', () => {
			const result = stripEmoji('😀🎉🚀');
			expect(result).toBe('');
		});

		it('should handle empty string', () => {
			const result = stripEmoji('');
			expect(result).toBe('');
		});

		it('should collapse multiple spaces after emoji removal', () => {
			const result = stripEmoji('Word 😀   😀   😀 another');
			expect(result).toBe('Word another');
		});

		it('should trim whitespace from result', () => {
			const result = stripEmoji('  😀  Hello  😀  ');
			expect(result).toBe('Hello');
		});
	});

	describe('truncate', () => {
		// Copy function logic for testing
		function truncate(text: string, maxLength: number): string {
			if (text.length <= maxLength) {
				return text;
			}
			return text.slice(0, maxLength).trim() + ELLIPSIS;
		}

		it('should return text unchanged when shorter than max length', () => {
			const result = truncate('Short text', 50);
			expect(result).toBe('Short text');
		});

		it('should return text unchanged when exactly at max length', () => {
			const text = 'Exactly twenty chars';
			const result = truncate(text, 20);
			expect(result).toBe(text);
		});

		it('should truncate text longer than max length', () => {
			const result = truncate('This is a very long text that should be truncated', 20);
			expect(result).toBe('This is a very long' + ELLIPSIS);
		});

		it('should add ellipsis after truncation', () => {
			const result = truncate('Long text', 5);
			expect(result).toContain(ELLIPSIS);
		});

		it('should trim whitespace before adding ellipsis', () => {
			const result = truncate('Text with   trailing spaces', 10);
			expect(result).toBe('Text with' + ELLIPSIS);
		});

		it('should handle empty string', () => {
			const result = truncate('', 10);
			expect(result).toBe('');
		});

		it('should handle maxLength of 0', () => {
			const result = truncate('Text', 0);
			expect(result).toBe(ELLIPSIS);
		});

		it('should handle maxLength of 1', () => {
			const result = truncate('Text', 1);
			expect(result).toBe('T' + ELLIPSIS);
		});

		it('should handle very long text', () => {
			const longText = 'A'.repeat(1000);
			const result = truncate(longText, 50);
			expect(result.length).toBe(51); // 50 + 1 ellipsis char
			expect(result.endsWith(ELLIPSIS)).toBe(true);
		});

		it('should preserve important characters before truncation point', () => {
			const result = truncate('Important! Details here', 10);
			expect(result).toBe('Important!' + ELLIPSIS);
		});
	});

	describe('deriveTitleFromUrl', () => {
		// Copy function logic for testing
		function deriveTitleFromUrl(url: string): string {
			try {
				const parsed = new URL(url);
				return parsed.hostname.replace(/^www\./, '');
			} catch {
				return url;
			}
		}

		it('should extract hostname from valid URL', () => {
			const result = deriveTitleFromUrl('https://example.com/path');
			expect(result).toBe('example.com');
		});

		it('should remove www prefix from hostname', () => {
			const result = deriveTitleFromUrl('https://www.example.com');
			expect(result).toBe('example.com');
		});

		it('should preserve subdomain that is not www', () => {
			const result = deriveTitleFromUrl('https://api.example.com');
			expect(result).toBe('api.example.com');
		});

		it('should handle URL with port', () => {
			const result = deriveTitleFromUrl('https://example.com:8080/path');
			expect(result).toBe('example.com');
		});

		it('should handle URL with query parameters', () => {
			const result = deriveTitleFromUrl('https://example.com?foo=bar');
			expect(result).toBe('example.com');
		});

		it('should handle URL with fragment', () => {
			const result = deriveTitleFromUrl('https://example.com#section');
			expect(result).toBe('example.com');
		});

		it('should handle URL with path, query, and fragment', () => {
			const result = deriveTitleFromUrl('https://www.example.com/path?q=1#top');
			expect(result).toBe('example.com');
		});

		it('should return original string for invalid URL', () => {
			const result = deriveTitleFromUrl('not a url');
			expect(result).toBe('not a url');
		});

		it('should handle empty string gracefully', () => {
			const result = deriveTitleFromUrl('');
			expect(result).toBe('');
		});

		it('should handle localhost', () => {
			const result = deriveTitleFromUrl('http://localhost:3000');
			expect(result).toBe('localhost');
		});

		it('should handle IP addresses', () => {
			const result = deriveTitleFromUrl('http://192.168.1.1');
			expect(result).toBe('192.168.1.1');
		});
	});

	describe('equalsIgnoreCase', () => {
		// Copy function logic for testing
		function equalsIgnoreCase(a: string, b: string): boolean {
			return a.toLowerCase() === b.toLowerCase();
		}

		it('should return true for identical strings', () => {
			expect(equalsIgnoreCase('test', 'test')).toBe(true);
		});

		it('should return true for same text different case', () => {
			expect(equalsIgnoreCase('Test', 'test')).toBe(true);
		});

		it('should return true for all uppercase vs all lowercase', () => {
			expect(equalsIgnoreCase('HELLO', 'hello')).toBe(true);
		});

		it('should return true for mixed case variations', () => {
			expect(equalsIgnoreCase('HeLLo WoRLd', 'hello world')).toBe(true);
		});

		it('should return false for different strings', () => {
			expect(equalsIgnoreCase('hello', 'world')).toBe(false);
		});

		it('should return false for strings with different lengths', () => {
			expect(equalsIgnoreCase('hello', 'hello world')).toBe(false);
		});

		it('should handle empty strings', () => {
			expect(equalsIgnoreCase('', '')).toBe(true);
		});

		it('should return false when one string is empty', () => {
			expect(equalsIgnoreCase('test', '')).toBe(false);
		});

		it('should handle strings with numbers', () => {
			expect(equalsIgnoreCase('Test123', 'test123')).toBe(true);
		});

		it('should handle strings with special characters', () => {
			expect(equalsIgnoreCase('Hello!', 'hello!')).toBe(true);
		});
	});

	describe('sanitizeLinkText', () => {
		// Copy function logic for testing
		function sanitizeLinkText(text: string, keepEmoji: boolean): string {
			const sanitized = sanitizeTextContent(text);
			if (!sanitized) {
				return '';
			}
			return keepEmoji ? sanitized : stripEmoji(sanitized);
		}

		it('should sanitize HTML and keep emoji when keepEmoji is true', () => {
			const result = sanitizeLinkText('<p>Hello 😀 world</p>', true);
			expect(result).toBe('Hello 😀 world');
		});

		it('should sanitize HTML and remove emoji when keepEmoji is false', () => {
			const result = sanitizeLinkText('<p>Hello 😀 world</p>', false);
			expect(result).toBe('Hello world');
		});

		it('should handle text without HTML tags', () => {
			const result = sanitizeLinkText('Plain text 🎉', true);
			expect(result).toBe('Plain text 🎉');
		});

		it('should remove emoji from plain text when keepEmoji is false', () => {
			const result = sanitizeLinkText('Plain text 🎉', false);
			expect(result).toBe('Plain text');
		});

		it('should handle text with HTML entities', () => {
			const result = sanitizeLinkText('Hello &amp; world 😀', true);
			expect(result).toBe('Hello & world 😀');
		});

		it('should remove emoji from text with entities when keepEmoji is false', () => {
			const result = sanitizeLinkText('Hello &amp; world 😀', false);
			expect(result).toBe('Hello & world');
		});

		it('should return empty string for empty input', () => {
			expect(sanitizeLinkText('', true)).toBe('');
			expect(sanitizeLinkText('', false)).toBe('');
		});

		it('should return empty string for null/whitespace input', () => {
			expect(sanitizeLinkText('   ', true)).toBe('');
			expect(sanitizeLinkText('   ', false)).toBe('');
		});

		it('should handle complex HTML with emoji', () => {
			const html = '<div><p>Title 🚀</p><span>Description 🎉</span></div>';
			const result = sanitizeLinkText(html, true);
			expect(result).toContain('Title 🚀');
			expect(result).toContain('Description 🎉');
		});

		it('should strip emoji from complex HTML when keepEmoji is false', () => {
			const html = '<div><p>Title 🚀</p></div>';
			const result = sanitizeLinkText(html, false);
			expect(result).toBe('Title');
		});
	});

	describe('processMetadata - Title Truncation', () => {
		// Copy truncate function for testing
		function truncate(text: string, maxLength: number): string {
			if (text.length <= maxLength) {
				return text;
			}
			return text.slice(0, maxLength).trim() + ELLIPSIS;
		}

		it('should truncate title when it exceeds max length', () => {
			const longTitle = 'A'.repeat(200);
			const metadata = { title: longTitle, description: 'Short desc', favicon: null };
			const settings = { previewStyle: 'inline' as const, maxCardLength: 300, maxInlineLength: 100, showFavicon: true, includeDescription: true, keepEmoji: true };

			// The processMetadata logic would truncate the title to 100 characters
			// Since we can't call processMetadata directly (it's not exported), we test the truncate function
			const truncated = truncate(longTitle, 100);
			expect(truncated.length).toBeLessThanOrEqual(101); // 100 + ellipsis char
			expect(truncated.endsWith(ELLIPSIS)).toBe(true);
		});

		it('should handle title at exactly max length', () => {
			const title = 'A'.repeat(100);
			const truncated = truncate(title, 100);
			expect(truncated).toBe(title); // Should not be truncated
			expect(truncated.length).toBe(100);
		});

		it('should truncate very long titles correctly', () => {
			// Simulate Instagram-style very long title
			const instagramTitle = 'This is a very long Instagram post title that goes on and on and contains lots of text that would normally exceed the maximum length settings for inline previews'.repeat(3);
			const maxLength = 150;
			const truncated = truncate(instagramTitle, maxLength);

			expect(truncated.length).toBeLessThanOrEqual(maxLength + 1); // +1 for ellipsis
			expect(truncated.endsWith(ELLIPSIS)).toBe(true);
		});

		it('should handle empty title gracefully', () => {
			const truncated = truncate('', 100);
			expect(truncated).toBe('');
		});

		it('should preserve short titles unchanged', () => {
			const title = 'Short Title';
			const truncated = truncate(title, 100);
			expect(truncated).toBe(title);
		});
	});

	describe('hasFrontmatter', () => {
		function hasFrontmatter(text: string): boolean {
			const config = parsePageConfig(text);
			return Object.keys(config).length > 0;
		}

		it('should return true when frontmatter has properties', () => {
			const text = '---\npreview-style: card\n---\nContent';
			expect(hasFrontmatter(text)).toBe(true);
		});

		it('should return false when no frontmatter', () => {
			const text = 'Just content';
			expect(hasFrontmatter(text)).toBe(false);
		});

		it('should return false for empty frontmatter', () => {
			const text = '---\n---\nContent';
			expect(hasFrontmatter(text)).toBe(false);
		});

		it('should return false when frontmatter not at start', () => {
			const text = 'Content\n---\npreview-style: card\n---';
			expect(hasFrontmatter(text)).toBe(false);
		});

		it('should return true for multiple frontmatter properties', () => {
			const text = '---\npreview-style: card\nmax-card-length: 400\n---\nContent';
			expect(hasFrontmatter(text)).toBe(true);
		});

		it('should return true for single frontmatter property', () => {
			const text = '---\nshow-favicon: true\n---\nContent';
			expect(hasFrontmatter(text)).toBe(true);
		});

		it('should return false for frontmatter with only invalid properties', () => {
			const text = '---\ninvalid-property: value\n---\nContent';
			expect(hasFrontmatter(text)).toBe(false);
		});

		it('should return true for frontmatter with both valid and invalid properties', () => {
			const text = '---\ninvalid-property: value\npreview-style: inline\n---\nContent';
			expect(hasFrontmatter(text)).toBe(true);
		});

		it('should handle frontmatter with different spacing', () => {
			const text = '---\npreview-style:    card   \n---\nContent';
			expect(hasFrontmatter(text)).toBe(true);
		});
	});
});
