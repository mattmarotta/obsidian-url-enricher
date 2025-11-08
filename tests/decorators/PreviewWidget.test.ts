import { describe, it, expect } from "vitest";
import { UrlPreviewWidget } from "../../src/decorators/PreviewWidget";

describe("PreviewWidget", () => {
	describe("Color Mode Class Application", () => {
		it("should apply 'none' color class to inline widget", () => {
			const widget = new UrlPreviewWidget(
				"https://example.com",
				"Example Title",
				"Example description",
				null,
				false,
				"inline",
				150,
				null,
				null,
				"none",  // inlineColorMode
				"subtle" // cardColorMode
			);

			const dom = widget.toDOM();
			expect(dom.className).toContain("url-preview--none");
			expect(dom.className).toContain("url-preview--inline");
		});

		it("should apply 'subtle' color class to inline widget", () => {
			const widget = new UrlPreviewWidget(
				"https://example.com",
				"Example Title",
				"Example description",
				null,
				false,
				"inline",
				150,
				null,
				null,
				"subtle", // inlineColorMode
				"none"    // cardColorMode
			);

			const dom = widget.toDOM();
			expect(dom.className).toContain("url-preview--subtle");
			expect(dom.className).toContain("url-preview--inline");
		});

		it("should apply 'none' color class to card widget", () => {
			const widget = new UrlPreviewWidget(
				"https://example.com",
				"Example Title",
				"Example description",
				null,
				false,
				"card",
				300,
				null,
				null,
				"subtle", // inlineColorMode
				"none"    // cardColorMode
			);

			const dom = widget.toDOM();
			expect(dom.className).toContain("url-preview--none");
			expect(dom.className).toContain("url-preview--card");
		});

		it("should apply 'subtle' color class to card widget", () => {
			const widget = new UrlPreviewWidget(
				"https://example.com",
				"Example Title",
				"Example description",
				null,
				false,
				"card",
				300,
				null,
				null,
				"none",   // inlineColorMode
				"subtle"  // cardColorMode
			);

			const dom = widget.toDOM();
			expect(dom.className).toContain("url-preview--subtle");
			expect(dom.className).toContain("url-preview--card");
		});

		it("should use default 'subtle' color mode when not specified for inline", () => {
			const widget = new UrlPreviewWidget(
				"https://example.com",
				"Example Title",
				"Example description",
				null,
				false,
				"inline",
				150,
				null,
				null
				// No color modes specified - should use defaults
			);

			const dom = widget.toDOM();
			expect(dom.className).toContain("url-preview--subtle");
		});

		it("should use default 'subtle' color mode when not specified for card", () => {
			const widget = new UrlPreviewWidget(
				"https://example.com",
				"Example Title",
				"Example description",
				null,
				false,
				"card",
				300,
				null,
				null
				// No color modes specified - should use defaults
			);

			const dom = widget.toDOM();
			expect(dom.className).toContain("url-preview--subtle");
		});
	});

	describe("Widget Equality with Color Modes", () => {
		it("should consider widgets equal when all properties including color modes match", () => {
			const widget1 = new UrlPreviewWidget(
				"https://example.com",
				"Title",
				"Description",
				"https://example.com/favicon.ico",
				false,
				"inline",
				150,
				"Example",
				null,
				"none",
				"subtle"
			);

			const widget2 = new UrlPreviewWidget(
				"https://example.com",
				"Title",
				"Description",
				"https://example.com/favicon.ico",
				false,
				"inline",
				150,
				"Example",
				null,
				"none",
				"subtle"
			);

			expect(widget1.eq(widget2)).toBe(true);
		});

		it("should consider widgets different when inline color mode differs", () => {
			const widget1 = new UrlPreviewWidget(
				"https://example.com",
				"Title",
				"Description",
				null,
				false,
				"inline",
				150,
				null,
				null,
				"none",
				"subtle"
			);

			const widget2 = new UrlPreviewWidget(
				"https://example.com",
				"Title",
				"Description",
				null,
				false,
				"inline",
				150,
				null,
				null,
				"subtle", // Different inline color mode
				"subtle"
			);

			expect(widget1.eq(widget2)).toBe(false);
		});

		it("should consider widgets different when card color mode differs", () => {
			const widget1 = new UrlPreviewWidget(
				"https://example.com",
				"Title",
				"Description",
				null,
				false,
				"card",
				300,
				null,
				null,
				"subtle",
				"none"
			);

			const widget2 = new UrlPreviewWidget(
				"https://example.com",
				"Title",
				"Description",
				null,
				false,
				"card",
				300,
				null,
				null,
				"subtle",
				"subtle" // Different card color mode
			);

			expect(widget1.eq(widget2)).toBe(false);
		});
	});
});
