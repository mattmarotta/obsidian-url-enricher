import { describe, it, expect } from "vitest";
import { UrlPreviewWidget } from "../../src/decorators/PreviewWidget";

describe("PreviewWidget", () => {
	describe("Color Mode Class Application", () => {
		it("should apply 'none' color class to inline widget", () => {
			const widget = new UrlPreviewWidget({
				url: "https://example.com",
				title: "Example Title",
				description: "Example description",
				faviconUrl: null,
				isLoading: false,
				previewStyle: "inline",
				siteName: null,
				error: null,
				inlineColorMode: "none",
				cardColorMode: "subtle",
			});

			const dom = widget.toDOM();
			expect(dom.className).toContain("url-preview--none");
			expect(dom.className).toContain("url-preview--inline");
		});

		it("should apply 'subtle' color class to inline widget", () => {
			const widget = new UrlPreviewWidget({
				url: "https://example.com",
				title: "Example Title",
				description: "Example description",
				faviconUrl: null,
				isLoading: false,
				previewStyle: "inline",
				siteName: null,
				error: null,
				inlineColorMode: "subtle",
				cardColorMode: "none",
			});

			const dom = widget.toDOM();
			expect(dom.className).toContain("url-preview--subtle");
			expect(dom.className).toContain("url-preview--inline");
		});

		it("should apply 'none' color class to card widget", () => {
			const widget = new UrlPreviewWidget({
				url: "https://example.com",
				title: "Example Title",
				description: "Example description",
				faviconUrl: null,
				isLoading: false,
				previewStyle: "card",
				siteName: null,
				error: null,
				inlineColorMode: "subtle",
				cardColorMode: "none",
			});

			const dom = widget.toDOM();
			expect(dom.className).toContain("url-preview--none");
			expect(dom.className).toContain("url-preview--card");
		});

		it("should apply 'subtle' color class to card widget", () => {
			const widget = new UrlPreviewWidget({
				url: "https://example.com",
				title: "Example Title",
				description: "Example description",
				faviconUrl: null,
				isLoading: false,
				previewStyle: "card",
				siteName: null,
				error: null,
				inlineColorMode: "none",
				cardColorMode: "subtle",
			});

			const dom = widget.toDOM();
			expect(dom.className).toContain("url-preview--subtle");
			expect(dom.className).toContain("url-preview--card");
		});

		it("should use default 'subtle' color mode when not specified for inline", () => {
			const widget = new UrlPreviewWidget({
				url: "https://example.com",
				title: "Example Title",
				description: "Example description",
				faviconUrl: null,
				isLoading: false,
				previewStyle: "inline",
				siteName: null,
				error: null,
				// No color modes specified - should use defaults
			});

			const dom = widget.toDOM();
			expect(dom.className).toContain("url-preview--subtle");
		});

		it("should use default 'subtle' color mode when not specified for card", () => {
			const widget = new UrlPreviewWidget({
				url: "https://example.com",
				title: "Example Title",
				description: "Example description",
				faviconUrl: null,
				isLoading: false,
				previewStyle: "card",
				siteName: null,
				error: null,
				// No color modes specified - should use defaults
			});

			const dom = widget.toDOM();
			expect(dom.className).toContain("url-preview--subtle");
		});
	});

	describe("Widget Equality with Color Modes", () => {
		it("should consider widgets equal when all properties including color modes match", () => {
			const widget1 = new UrlPreviewWidget({
				url: "https://example.com",
				title: "Title",
				description: "Description",
				faviconUrl: "https://example.com/favicon.ico",
				isLoading: false,
				previewStyle: "inline",
				siteName: "Example",
				error: null,
				inlineColorMode: "none",
				cardColorMode: "subtle",
			});

			const widget2 = new UrlPreviewWidget({
				url: "https://example.com",
				title: "Title",
				description: "Description",
				faviconUrl: "https://example.com/favicon.ico",
				isLoading: false,
				previewStyle: "inline",
				siteName: "Example",
				error: null,
				inlineColorMode: "none",
				cardColorMode: "subtle",
			});

			expect(widget1.eq(widget2)).toBe(true);
		});

		it("should consider widgets different when inline color mode differs", () => {
			const widget1 = new UrlPreviewWidget({
				url: "https://example.com",
				title: "Title",
				description: "Description",
				faviconUrl: null,
				isLoading: false,
				previewStyle: "inline",
				siteName: null,
				error: null,
				inlineColorMode: "none",
				cardColorMode: "subtle",
			});

			const widget2 = new UrlPreviewWidget({
				url: "https://example.com",
				title: "Title",
				description: "Description",
				faviconUrl: null,
				isLoading: false,
				previewStyle: "inline",
				siteName: null,
				error: null,
				inlineColorMode: "subtle", // Different inline color mode
				cardColorMode: "subtle",
			});

			expect(widget1.eq(widget2)).toBe(false);
		});

		it("should consider widgets different when card color mode differs", () => {
			const widget1 = new UrlPreviewWidget({
				url: "https://example.com",
				title: "Title",
				description: "Description",
				faviconUrl: null,
				isLoading: false,
				previewStyle: "card",
				siteName: null,
				error: null,
				inlineColorMode: "subtle",
				cardColorMode: "none",
			});

			const widget2 = new UrlPreviewWidget({
				url: "https://example.com",
				title: "Title",
				description: "Description",
				faviconUrl: null,
				isLoading: false,
				previewStyle: "card",
				siteName: null,
				error: null,
				inlineColorMode: "subtle",
				cardColorMode: "subtle", // Different card color mode
			});

			expect(widget1.eq(widget2)).toBe(false);
		});
	});

	describe("Context label", () => {
		const base = {
			url: "https://www.reddit.com/r/Sub/comments/abc/post/",
			context: "r/Sub",
			title: "Post title",
			description: "Post body",
			faviconUrl: "https://icon.example/r.png",
			isLoading: false,
		} as const;

		it("renders inline as '<context> — <title>'", () => {
			const dom = new UrlPreviewWidget({ ...base, previewStyle: "inline" }).toDOM();
			expect(dom.querySelector(".url-preview__text")?.textContent).toBe("r/Sub — Post title");
			expect(dom.querySelector(".url-preview__title")?.textContent).toBe("r/Sub");
			expect(dom.querySelector(".url-preview__description")?.textContent).toBe("Post title");
		});

		it("renders a card with the context header, post-title div, and description div", () => {
			const dom = new UrlPreviewWidget({ ...base, previewStyle: "card" }).toDOM();
			const header = dom.querySelector(".url-preview__header");
			expect(header?.querySelector(".url-preview__favicon")).not.toBeNull();
			expect(header?.querySelector(".url-preview__title")?.textContent).toBe("r/Sub");
			expect(dom.querySelector("div.url-preview__post-title")?.textContent).toBe("Post title");
			expect(dom.querySelector("div.url-preview__description")?.textContent).toBe("Post body");
		});

		it("renders text exactly as given, without truncating", () => {
			const long = "x".repeat(1000);
			const dom = new UrlPreviewWidget({ ...base, previewStyle: "card", description: long }).toDOM();
			expect(dom.querySelector(".url-preview__description")?.textContent).toBe(long);
		});

		it("treats widgets with different contexts as different", () => {
			const a = new UrlPreviewWidget({ ...base, previewStyle: "inline" });
			const b = new UrlPreviewWidget({ ...base, previewStyle: "inline", context: "r/Other" });
			const c = new UrlPreviewWidget({ ...base, previewStyle: "inline" });
			expect(a.eq(b)).toBe(false);
			expect(a.eq(c)).toBe(true);
		});

		it("treats a missing context the same as null", () => {
			const a = new UrlPreviewWidget({ ...base, previewStyle: "inline", context: undefined });
			const b = new UrlPreviewWidget({ ...base, previewStyle: "inline", context: null });
			expect(a.eq(b)).toBe(true);
		});
	});
});
