import { decodeHtmlEntities, sanitizeTextContent } from "../utils/text";

/**
 * Parsed metadata from HTML
 */
export interface ParsedMetadata {
	title?: string | null;
	description?: string | null;
	favicon?: string | null;
	siteName?: string | null;
}

/**
 * HtmlParser - Parses HTML to extract metadata (Open Graph, Twitter Cards, etc.)
 */
export class HtmlParser {
	/**
	 * Parse HTML metadata using DOMParser or regex fallback
	 */
	parseHtmlMetadata(url: string, html: string): ParsedMetadata {
		let parsed: ParsedMetadata | null = null;

		if (typeof DOMParser !== "undefined") {
			try {
				parsed = this.parseWithDomParser(html, url);
			} catch (error) {
				console.warn("[inline-link-preview] DOMParser failed", error);
			}
		}

		if (!parsed) {
			parsed = this.parseWithRegex(html, url);
		}

		return parsed;
	}

	/**
	 * Parse HTML using browser's DOMParser
	 */
	private parseWithDomParser(html: string, baseUrl: string): ParsedMetadata {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, "text/html");

		const titleCandidates = [
			doc.querySelector<HTMLMetaElement>("meta[property='og:title']")?.content,
			doc.querySelector<HTMLMetaElement>("meta[name='twitter:title']")?.content,
			doc.querySelector<HTMLMetaElement>("meta[name='title']")?.content,
			doc.title,
			doc.querySelector("title")?.textContent,
		];

		const descriptionCandidates = [
			doc.querySelector<HTMLMetaElement>("meta[property='og:description']")?.content,
			doc.querySelector<HTMLMetaElement>("meta[name='twitter:description']")?.content,
			doc.querySelector<HTMLMetaElement>("meta[name='description']")?.content,
		];

		const siteNameCandidates = [
			doc.querySelector<HTMLMetaElement>("meta[property='og:site_name']")?.content,
			doc.querySelector<HTMLMetaElement>("meta[name='application-name']")?.content,
		];

		const jsonLd = this.extractJsonLdMetadata(doc);
		if (jsonLd.title) {
			titleCandidates.push(jsonLd.title);
		}

		if (jsonLd.description) {
			descriptionCandidates.push(jsonLd.description);
		}

		const faviconCandidates = Array.from(
			doc.querySelectorAll<HTMLLinkElement>("link[rel*='icon'], link[rel='apple-touch-icon']"),
			(link) => link.href || link.getAttribute("href"),
		);

		return {
			title: this.pickFirstNonEmpty(titleCandidates),
			description: this.pickFirstNonEmpty(descriptionCandidates),
			favicon: this.resolveFaviconCandidate(faviconCandidates, baseUrl),
			siteName: this.pickFirstNonEmpty(siteNameCandidates),
		};
	}

	/**
	 * Parse HTML using regex (fallback when DOMParser is not available)
	 */
	private parseWithRegex(html: string, baseUrl: string): ParsedMetadata {
		const result: ParsedMetadata = {};

		const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
		if (titleMatch) {
			result.title = decodeHtmlEntities(titleMatch[1]);
		}

		const metaRegex =
			/<meta\s+[^>]*?(?:name|property)=["'](?:og:description|twitter:description|description)["'][^>]*content=["']([^"']+)["'][^>]*>/i;
		const metaMatch = html.match(metaRegex);
		if (metaMatch) {
			result.description = decodeHtmlEntities(metaMatch[1]);
		}

		const siteNameRegex =
			/<meta\s+[^>]*?(?:name|property)=["'](?:og:site_name|application-name)["'][^>]*content=["']([^"']+)["'][^>]*>/i;
		const siteNameMatch = html.match(siteNameRegex);
		if (siteNameMatch) {
			result.siteName = decodeHtmlEntities(siteNameMatch[1]);
		}

		const faviconRegex =
			/<link\s+[^>]*?rel=["'][^"']*icon[^"']*["'][^>]*?href=["']([^"']+)["'][^>]*>/i;
		const faviconMatch = html.match(faviconRegex);
		if (faviconMatch) {
			result.favicon = this.resolveFaviconCandidate([faviconMatch[1]], baseUrl);
		}

		return result;
	}

	/**
	 * Extract metadata from JSON-LD structured data
	 */
	private extractJsonLdMetadata(doc: Document): { title?: string; description?: string } {
		const scripts = Array.from(doc.querySelectorAll<HTMLScriptElement>("script[type='application/ld+json']"));
		for (const script of scripts) {
			const text = script.textContent;
			if (!text) {
				continue;
			}

			try {
				const json = JSON.parse(text);
				const found = this.searchJsonLd(json);
				if (found && (found.title || found.description)) {
					return found;
				}
			} catch {
				continue;
			}
		}

		return {};
	}

	/**
	 * Recursively search JSON-LD data for title and description
	 */
	private searchJsonLd(value: unknown): { title?: string; description?: string } | null {
		if (!value || typeof value !== "object") {
			return null;
		}

		if (Array.isArray(value)) {
			for (const item of value) {
				const result = this.searchJsonLd(item);
				if (result) {
					return result;
				}
			}
			return null;
		}

		const record = value as Record<string, unknown>;
		const title = this.extractString(record, ["name", "headline", "title"]);
		const description = this.extractString(record, ["description", "summary"]);
		if (title || description) {
			return { title: title ?? undefined, description: description ?? undefined };
		}

		for (const key of Object.keys(record)) {
			const result = this.searchJsonLd(record[key]);
			if (result) {
				return result;
			}
		}

		return null;
	}

	/**
	 * Extract first non-empty string value from object using key list
	 */
	private extractString(value: Record<string, unknown>, keys: string[]): string | null {
		for (const key of keys) {
			const candidate = value[key];
			if (typeof candidate === "string" && candidate.trim()) {
				return candidate.trim();
			}
		}
		return null;
	}

	/**
	 * Pick the first non-empty value from a list of candidates
	 */
	private pickFirstNonEmpty(values: Array<string | null | undefined>): string | null {
		for (const value of values) {
			if (value && this.sanitizeText(value)) {
				return value;
			}
		}

		return null;
	}

	/**
	 * Sanitize text content
	 */
	private sanitizeText(value: string | null | undefined): string | null {
		if (!value) {
			return null;
		}

		const sanitized = sanitizeTextContent(value);
		return sanitized.length ? sanitized : null;
	}

	/**
	 * Resolve favicon URL relative to base URL
	 */
	private resolveFaviconCandidate(candidates: Array<string | null | undefined>, baseUrl: string): string | null {
		for (const candidate of candidates) {
			if (!candidate) {
				continue;
			}
			const sanitized = this.sanitizeFavicon(candidate, baseUrl);
			if (sanitized) {
				return sanitized;
			}
		}
		// Fallback to native /favicon.ico before using Google's service
		return this.buildNativeFaviconUrl(baseUrl);
	}

	/**
	 * Sanitize and resolve favicon URL
	 */
	private sanitizeFavicon(candidate: string | null | undefined, baseUrl: string): string | null {
		if (!candidate) {
			return null;
		}

		try {
			const resolved = new URL(candidate, baseUrl).href;
			return resolved;
		} catch {
			return null;
		}
	}

	/**
	 * Build native favicon URL (/favicon.ico)
	 */
	private buildNativeFaviconUrl(url: string): string | null {
		try {
			const parsed = new URL(url);
			return `${parsed.origin}/favicon.ico`;
		} catch {
			return null;
		}
	}
}
