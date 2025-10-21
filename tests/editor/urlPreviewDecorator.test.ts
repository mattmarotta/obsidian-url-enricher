import { describe, it, expect } from 'vitest';

/**
 * Tests for urlPreviewDecorator.ts
 *
 * Focus: Business logic (frontmatter parsing, settings merging, helper functions)
 * Skip: CodeMirror widget rendering, DOM manipulation
 */

// We'll need to extract these functions to test them
// For now, we'll copy the logic here to test it

/**
 * Parse frontmatter from document text
 * (Copied from urlPreviewDecorator.ts for testing)
 */
function parsePageConfig(text: string): {
	previewStyle?: 'bubble' | 'card';
	displayMode?: 'inline' | 'block';
	maxCardLength?: number;
	maxBubbleLength?: number;
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
			if (value === 'bubble' || value === 'card') {
				config.previewStyle = value;
			}
		}

		// Display mode
		const displayMatch = line.match(/^preview-display:\s*(.+)$/i);
		if (displayMatch) {
			const value = displayMatch[1].trim().toLowerCase();
			if (value === 'inline' || value === 'block') {
				config.displayMode = value;
			}
		}

		// Max card length
		const maxCardMatch = line.match(/^max-card-length:\s*(\d+)$/i);
		if (maxCardMatch) {
			const value = parseInt(maxCardMatch[1], 10);
			if (value >= 100 && value <= 5000) {
				config.maxCardLength = value;
			}
		}

		// Max bubble length
		const maxBubbleMatch = line.match(/^max-bubble-length:\s*(\d+)$/i);
		if (maxBubbleMatch) {
			const value = parseInt(maxBubbleMatch[1], 10);
			if (value >= 50 && value <= 5000) {
				config.maxBubbleLength = value;
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
preview-display: block
max-card-length: 400
max-bubble-length: 150
show-favicon: true
include-description: true
preview-color-mode: custom
custom-preview-color: #ff0000
---
# Content here`;

				const config = parsePageConfig(text);

				expect(config.previewStyle).toBe('card');
				expect(config.displayMode).toBe('block');
				expect(config.maxCardLength).toBe(400);
				expect(config.maxBubbleLength).toBe(150);
				expect(config.showFavicon).toBe(true);
				expect(config.includeDescription).toBe(true);
				expect(config.previewColorMode).toBe('custom');
				expect(config.customPreviewColor).toBe('#ff0000');
			});

			it('should parse preview-style: bubble', () => {
				const text = `---
preview-style: bubble
---`;
				const config = parsePageConfig(text);
				expect(config.previewStyle).toBe('bubble');
			});

			it('should parse preview-style: card', () => {
				const text = `---
preview-style: card
---`;
				const config = parsePageConfig(text);
				expect(config.previewStyle).toBe('card');
			});

			it('should parse preview-display: inline', () => {
				const text = `---
preview-display: inline
---`;
				const config = parsePageConfig(text);
				expect(config.displayMode).toBe('inline');
			});

			it('should parse preview-display: block', () => {
				const text = `---
preview-display: block
---`;
				const config = parsePageConfig(text);
				expect(config.displayMode).toBe('block');
			});

			it('should parse valid max-card-length', () => {
				const text = `---
max-card-length: 500
---`;
				const config = parsePageConfig(text);
				expect(config.maxCardLength).toBe(500);
			});

			it('should parse minimum max-card-length (100)', () => {
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

			it('should parse valid max-bubble-length', () => {
				const text = `---
max-bubble-length: 200
---`;
				const config = parsePageConfig(text);
				expect(config.maxBubbleLength).toBe(200);
			});

			it('should parse minimum max-bubble-length (50)', () => {
				const text = `---
max-bubble-length: 50
---`;
				const config = parsePageConfig(text);
				expect(config.maxBubbleLength).toBe(50);
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
				expect(config.displayMode).toBe('inline');
			});

			it('should handle extra whitespace in values', () => {
				const text = `---
preview-style:   bubble
show-favicon:  true
---`;
				const config = parsePageConfig(text);
				expect(config.previewStyle).toBe('bubble');
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
				expect(config.displayMode).toBeUndefined();
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

			it('should ignore invalid display-mode values', () => {
				const text = `---
preview-display: sideways
---`;
				const config = parsePageConfig(text);
				expect(config.displayMode).toBeUndefined();
			});

			it('should ignore max-card-length below minimum (100)', () => {
				const text = `---
max-card-length: 50
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

			it('should ignore max-bubble-length below minimum (50)', () => {
				const text = `---
max-bubble-length: 25
---`;
				const config = parsePageConfig(text);
				expect(config.maxBubbleLength).toBeUndefined();
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
preview-style: bubble
---
Content here
---
preview-style: card
---`;
				const config = parsePageConfig(text);
				expect(config.previewStyle).toBe('bubble');
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
});
