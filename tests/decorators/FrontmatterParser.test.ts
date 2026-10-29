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

		describe("YAML value forms", () => {
			it("should accept a double-quoted preview-style", () => {
				expect(parsePageConfig('---\npreview-style: "card"\n---\n')).toEqual({ previewStyle: "card" });
			});

			it("should accept a single-quoted preview-style", () => {
				expect(parsePageConfig("---\npreview-style: 'card'\n---\n")).toEqual({ previewStyle: "card" });
			});

			it("should accept quoted values for every key", () => {
				const text = [
					"---",
					'preview-style: "Inline"',
					"max-card-length: '400'",
					'max-inline-length: "120"',
					'show-favicon: "false"',
					"include-description: 'TRUE'",
					'inline-color-mode: "none"',
					"card-color-mode: 'subtle'",
					"---",
				].join("\n");
				expect(parsePageConfig(text)).toEqual({
					previewStyle: "inline",
					maxCardLength: 400,
					maxInlineLength: 120,
					showFavicon: false,
					includeDescription: true,
					inlineColorMode: "none",
					cardColorMode: "subtle",
				});
			});

			it("should accept native YAML booleans and numbers", () => {
				const text = "---\nshow-favicon: false\ninclude-description: True\nmax-card-length: 250\nmax-inline-length: 90\n---";
				expect(parsePageConfig(text)).toEqual({
					showFavicon: false,
					includeDescription: true,
					maxCardLength: 250,
					maxInlineLength: 90,
				});
			});

			it("should accept numeric strings for lengths", () => {
				const config = parsePageConfig('---\nmax-card-length: "500"\nmax-inline-length: " 75 "\n---');
				expect(config.maxCardLength).toBe(500);
				expect(config.maxInlineLength).toBe(75);
			});

			it("should ignore non-integer and non-numeric lengths", () => {
				const config = parsePageConfig('---\nmax-card-length: 12.5\nmax-inline-length: "lots"\n---');
				expect(config).toEqual({});
			});

			it("should ignore out-of-range lengths", () => {
				const config = parsePageConfig("---\nmax-card-length: 0\nmax-inline-length: 999999\n---");
				expect(config).toEqual({});
			});

			it("should ignore non-boolean values for boolean keys", () => {
				const config = parsePageConfig("---\nshow-favicon: yes\ninclude-description: 1\n---");
				expect(config).toEqual({});
			});

			it("should match mixed-case keys", () => {
				const config = parsePageConfig("---\nPREVIEW-STYLE: card\nMax-Card-Length: 320\nShow-Favicon: false\n---");
				expect(config).toEqual({ previewStyle: "card", maxCardLength: 320, showFavicon: false });
			});

			it("should allow trailing comments on values", () => {
				expect(parsePageConfig("---\npreview-style: card # cards for this note\n---")).toEqual({ previewStyle: "card" });
			});

			it("should return {} for invalid YAML without throwing", () => {
				const text = '---\npreview-style: "card\nmax-card-length: [1, 2\n---\n';
				expect(() => parsePageConfig(text)).not.toThrow();
				expect(parsePageConfig(text)).toEqual({});
			});

			it("should return {} for a half-typed key", () => {
				expect(parsePageConfig("---\npreview-style: card\nmax-card-\n---")).toEqual({});
			});

			it("should return {} for unclosed frontmatter", () => {
				expect(parsePageConfig("---\npreview-style: card\n\n# Heading")).toEqual({});
			});

			it("should return {} when frontmatter is not on line 1", () => {
				expect(parsePageConfig("# Title\n\n---\npreview-style: card\n---\n")).toEqual({});
			});

			it("should return {} when frontmatter is a list or scalar rather than a mapping", () => {
				expect(parsePageConfig("---\n- preview-style\n- card\n---")).toEqual({});
				expect(parsePageConfig("---\ncard\n---")).toEqual({});
			});

			it("should ignore unknown keys", () => {
				const text = "---\ntags: [reading]\naliases: Foo\npreview-style: card\nfoo: bar\n---";
				expect(parsePageConfig(text)).toEqual({ previewStyle: "card" });
			});
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

		it("should return false when frontmatter only has non-URL Enricher properties", () => {
			expect(hasFrontmatter("---\ntags: [a, b]\n---\n")).toBe(false);
		});

		it("should return true for a quoted URL Enricher property", () => {
			expect(hasFrontmatter('---\ntags: [a]\npreview-style: "inline"\n---\n')).toBe(true);
		});

		it("should return false for invalid YAML", () => {
			expect(hasFrontmatter('---\npreview-style: "card\n---\n')).toBe(false);
		});
	});
});
