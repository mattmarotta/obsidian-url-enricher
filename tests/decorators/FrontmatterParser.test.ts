import { describe, it, expect } from "vitest";
import { parsePageConfig, hasFrontmatter } from "../../src/decorators/FrontmatterParser";

describe("FrontmatterParser", () => {
	describe("parsePageConfig", () => {
		it("should return empty config for document without frontmatter", () => {
			const text = "# Heading\n\nSome content";
			const config = parsePageConfig(text);
			expect(config).toEqual({});
		});

		it("should return empty config when frontmatter doesn't start on line 1", () => {
			const text = "\n---\npreview-style: card\n---";
			const config = parsePageConfig(text);
			expect(config).toEqual({});
		});

		it("should parse preview-style field", () => {
			const text = "---\npreview-style: card\n---\n# Heading";
			const config = parsePageConfig(text);
			expect(config.previewStyle).toBe("card");
		});

		it("should parse max-card-length field", () => {
			const text = "---\nmax-card-length: 500\n---\n# Heading";
			const config = parsePageConfig(text);
			expect(config.maxCardLength).toBe(500);
		});

		it("should parse max-inline-length field", () => {
			const text = "---\nmax-inline-length: 150\n---\n# Heading";
			const config = parsePageConfig(text);
			expect(config.maxInlineLength).toBe(150);
		});

		it("should parse show-favicon field", () => {
			const text = "---\nshow-favicon: true\n---\n# Heading";
			const config = parsePageConfig(text);
			expect(config.showFavicon).toBe(true);
		});

		it("should parse include-description field", () => {
			const text = "---\ninclude-description: false\n---\n# Heading";
			const config = parsePageConfig(text);
			expect(config.includeDescription).toBe(false);
		});

		it("should parse inline-color-mode field with 'none' value", () => {
			const text = "---\ninline-color-mode: none\n---\n# Heading";
			const config = parsePageConfig(text);
			expect(config.inlineColorMode).toBe("none");
		});

		it("should parse inline-color-mode field with 'subtle' value", () => {
			const text = "---\ninline-color-mode: subtle\n---\n# Heading";
			const config = parsePageConfig(text);
			expect(config.inlineColorMode).toBe("subtle");
		});

		it("should parse card-color-mode field with 'none' value", () => {
			const text = "---\ncard-color-mode: none\n---\n# Heading";
			const config = parsePageConfig(text);
			expect(config.cardColorMode).toBe("none");
		});

		it("should parse card-color-mode field with 'subtle' value", () => {
			const text = "---\ncard-color-mode: subtle\n---\n# Heading";
			const config = parsePageConfig(text);
			expect(config.cardColorMode).toBe("subtle");
		});

		it("should ignore invalid inline-color-mode values", () => {
			const text = "---\ninline-color-mode: invalid\n---\n# Heading";
			const config = parsePageConfig(text);
			expect(config.inlineColorMode).toBeUndefined();
		});

		it("should ignore invalid card-color-mode values", () => {
			const text = "---\ncard-color-mode: custom\n---\n# Heading";
			const config = parsePageConfig(text);
			expect(config.cardColorMode).toBeUndefined();
		});

		it("should parse multiple frontmatter fields including color modes", () => {
			const text = `---
preview-style: card
max-card-length: 400
max-inline-length: 200
show-favicon: true
include-description: true
inline-color-mode: none
card-color-mode: subtle
---
# Heading`;
			const config = parsePageConfig(text);
			expect(config).toEqual({
				previewStyle: "card",
				maxCardLength: 400,
				maxInlineLength: 200,
				showFavicon: true,
				includeDescription: true,
				inlineColorMode: "none",
				cardColorMode: "subtle"
			});
		});

		it("should handle case-insensitive field names", () => {
			const text = "---\nInline-Color-Mode: subtle\nCard-Color-Mode: none\n---";
			const config = parsePageConfig(text);
			expect(config.inlineColorMode).toBe("subtle");
			expect(config.cardColorMode).toBe("none");
		});

		it("should handle case-insensitive field values", () => {
			const text = "---\ninline-color-mode: NONE\ncard-color-mode: SUBTLE\n---";
			const config = parsePageConfig(text);
			expect(config.inlineColorMode).toBe("none");
			expect(config.cardColorMode).toBe("subtle");
		});
	});

	describe("hasFrontmatter", () => {
		it("should return false for document without frontmatter", () => {
			const text = "# Heading\n\nSome content";
			expect(hasFrontmatter(text)).toBe(false);
		});

		it("should return true for document with any valid frontmatter field", () => {
			const text = "---\npreview-style: card\n---\n# Heading";
			expect(hasFrontmatter(text)).toBe(true);
		});

		it("should return true for document with color mode frontmatter", () => {
			const text = "---\ninline-color-mode: subtle\n---\n# Heading";
			expect(hasFrontmatter(text)).toBe(true);
		});

		it("should return false for document with empty frontmatter", () => {
			const text = "---\n---\n# Heading";
			expect(hasFrontmatter(text)).toBe(false);
		});

		it("should return false for document with invalid frontmatter fields only", () => {
			const text = "---\ninvalid-field: value\n---\n# Heading";
			expect(hasFrontmatter(text)).toBe(false);
		});
	});
});
