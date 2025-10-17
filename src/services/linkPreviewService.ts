import { requestUrl, RequestUrlParam, RequestUrlResponse } from "obsidian";
import type { LinkMetadata } from "./types";
import {
	createDefaultMetadataHandlers,
	type MetadataHandler,
	type MetadataHandlerContext,
} from "./metadataHandlers";
import { decodeHtmlEntities, sanitizeTextContent } from "../utils/text";
import { FaviconCache } from "./faviconCache";
import type { InlineLinkPreviewSettings } from "../settings";

export type { LinkMetadata } from "./types";

export interface LinkPreviewServiceOptions {
	requestTimeoutMs: number;
}

interface ParsedMetadata {
	title?: string | null;
	description?: string | null;
	favicon?: string | null;
}

export class LinkPreviewService {
	private cache = new Map<string, LinkMetadata>();
	private options: LinkPreviewServiceOptions;
	private settings: InlineLinkPreviewSettings;
	private readonly metadataHandlers: MetadataHandler[];
	private persistentFaviconCache: FaviconCache | null = null;
	private faviconValidationCache = new Map<string, string | null>();

	constructor(options: LinkPreviewServiceOptions, settings: InlineLinkPreviewSettings, metadataHandlers: MetadataHandler[] = createDefaultMetadataHandlers()) {
		this.options = { ...options };
		this.settings = settings;
		this.metadataHandlers = metadataHandlers;
	}

	setPersistentFaviconCache(cache: FaviconCache): void {
		this.persistentFaviconCache = cache;
	}

	updateSettings(settings: InlineLinkPreviewSettings): void {
		this.settings = settings;
	}

	updateOptions(options: Partial<LinkPreviewServiceOptions>): void {
		const previous = { ...this.options };
		this.options = { ...this.options, ...options };

		if (previous.requestTimeoutMs !== this.options.requestTimeoutMs) {
			this.clearCache();
		}
	}

	registerMetadataHandler(handler: MetadataHandler): void {
		this.metadataHandlers.push(handler);
	}

	clearCache(): void {
		this.cache.clear();
		if (this.persistentFaviconCache) {
			this.persistentFaviconCache.clear();
		}
		this.faviconValidationCache.clear();
	}

	async getMetadata(rawUrl: string): Promise<LinkMetadata> {
		const normalizedUrl = this.normalizeUrl(rawUrl);
		const cached = this.cache.get(normalizedUrl);
		if (cached) {
			return cached;
		}

		const metadata = await this.fetchMetadata(normalizedUrl);
		this.cache.set(normalizedUrl, metadata);
		return metadata;
	}

	private normalizeUrl(url: string): string {
		return url.trim();
	}

	private async fetchMetadata(url: string): Promise<LinkMetadata> {
		try {
			const response = await this.requestWithTimeout(url);
			if (response.status >= 400) {
				throw new Error(`HTTP ${response.status}`);
			}

			const contentType = this.getHeader(response, "content-type") ?? "";
			const metadata =
				!contentType.toLowerCase().includes("html")
					? this.buildFallbackMetadata(url)
					: this.parseHtmlMetadata(this.getHeader(response, "x-final-url") ?? url, response.text);

			// Check for "soft 404s" - pages that return 200 but show error content
			if (contentType.toLowerCase().includes("html") && this.isSoft404(response.text, metadata, url)) {
				throw new Error("Page not found");
			}

			return this.finalizeMetadata(url, metadata);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.warn(
				"[inline-link-preview] Failed to fetch metadata for URL",
				url,
				errorMessage,
			);
			// Return metadata with error flag
			const fallbackMetadata = this.buildFallbackMetadata(url);
			return {
				...this.finalizeMetadata(url, fallbackMetadata),
				error: errorMessage
			};
		}
	}

	private async requestWithTimeout(url: string): Promise<RequestUrlResponse> {
		const headers = this.buildRequestHeaders();
		const requestPromise = requestUrl({ url, headers });
		if (this.options.requestTimeoutMs <= 0) {
			return await requestPromise;
		}

		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		try {
			const timeoutPromise = new Promise<never>((_, reject) => {
				timeoutId = setTimeout(() => {
					reject(new Error("Request timed out"));
				}, this.options.requestTimeoutMs);
			});

			const response = (await Promise.race([requestPromise, timeoutPromise])) as RequestUrlResponse;
			return response;
		} finally {
			if (timeoutId !== null) {
				clearTimeout(timeoutId);
			}
		}
	}

	private async requestWithTimeoutParam(request: RequestUrlParam): Promise<RequestUrlResponse> {
		const requestPromise = requestUrl(request);
		if (this.options.requestTimeoutMs <= 0) {
			return await requestPromise;
		}

		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		try {
			const timeoutPromise = new Promise<never>((_, reject) => {
				timeoutId = setTimeout(() => {
					reject(new Error("Request timed out"));
				}, this.options.requestTimeoutMs);
			});

			const response = (await Promise.race([requestPromise, timeoutPromise])) as RequestUrlResponse;
			return response;
		} finally {
			if (timeoutId !== null) {
				clearTimeout(timeoutId);
			}
		}
	}

	private getHeader(response: RequestUrlResponse, header: string): string | undefined {
		const headers = response.headers ?? {};
		const direct = headers[header];
		if (direct) {
			return direct;
		}
		const lower = header.toLowerCase();
		for (const [key, value] of Object.entries(headers)) {
			if (key.toLowerCase() === lower) {
				return value;
			}
		}
		return undefined;
	}

	/**
	 * Detects "soft 404s" - pages that return 200 OK but show error content
	 * Common patterns:
	 * - Reddit: "page not found", "this community doesn't exist"
	 * - YouTube: "video unavailable", "this video isn't available"
	 * - Generic: "404", "not found", "page not found", etc.
	 */
	private isSoft404(html: string, metadata: ParsedMetadata, url: string): boolean {
		const lowerHtml = html.toLowerCase();
		const title = (metadata.title || "").toLowerCase();
		const description = (metadata.description || "").toLowerCase();
		
		// Reddit-specific patterns
		if (url.includes("reddit.com")) {
			if (title.includes("page not found") || 
				title.includes("this community doesn't exist") ||
				description.includes("page not found") ||
				lowerHtml.includes("sorry, nobody on reddit goes by that name")) {
				return true;
			}
		}
		
		// YouTube-specific patterns
		if (url.includes("youtube.com") || url.includes("youtu.be")) {
			if (title.includes("video unavailable") ||
				description.includes("video isn't available") ||
				description.includes("video has been removed") ||
				lowerHtml.includes("this video isn't available")) {
				return true;
			}
		}
		
		// Generic patterns - only check title to avoid false positives
		// Must be very specific to avoid catching legitimate pages
		const titleErrorPatterns = [
			"404",
			"not found",
			"page not found",
			"404 error"
		];
		
		// Only flag as error if title EXACTLY matches or STARTS WITH these patterns
		for (const pattern of titleErrorPatterns) {
			if (title === pattern || 
				title.startsWith(pattern + " ") || 
				title.startsWith(pattern + "|") ||
				title.startsWith(pattern + "-") ||
				title.startsWith(pattern + ":")) {
				return true;
			}
		}
		
		return false;
	}

	private async performRequest(request: RequestUrlParam): Promise<RequestUrlResponse> {
		const headers = {
			...this.buildRequestHeaders(),
			...(request.headers ?? {}),
		};

		return await requestUrl({ ...request, headers });
	}

	private parseUrl(rawUrl: string): URL | null {
		try {
			return new URL(rawUrl);
		} catch {
			return null;
		}
	}

	private buildRequestHeaders(): Record<string, string> {
		return {
			Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			"Accept-Language": "en-US,en;q=0.9",
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
		};
	}

	private parseHtmlMetadata(url: string, html: string): LinkMetadata {
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

		const title = this.ensureTitle(parsed?.title, url);
		const description = this.sanitizeText(parsed?.description);
		const favicon = parsed?.favicon ?? this.deriveFaviconFromUrl(url);
		return { title, description, favicon };
	}

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
		};
	}

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

		const faviconRegex =
			/<link\s+[^>]*?rel=["'][^"']*icon[^"']*["'][^>]*?href=["']([^"']+)["'][^>]*>/i;
		const faviconMatch = html.match(faviconRegex);
		if (faviconMatch) {
			result.favicon = this.resolveFaviconCandidate([faviconMatch[1]], baseUrl);
		}

		return result;
	}

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

	private extractString(value: Record<string, unknown>, keys: string[]): string | null {
		for (const key of keys) {
			const candidate = value[key];
			if (typeof candidate === "string" && candidate.trim()) {
				return candidate.trim();
			}
		}
		return null;
	}

	private pickFirstNonEmpty(values: Array<string | null | undefined>): string | null {
		for (const value of values) {
			if (value && this.sanitizeText(value)) {
				return value;
			}
		}

		return null;
	}

	private ensureTitle(title: string | null | undefined, url: string): string {
		const sanitized = this.sanitizeText(title);
		if (sanitized) {
			return sanitized;
		}

		try {
			const urlObj = new URL(url);
			return urlObj.hostname.replace(/^www\./i, "") || urlObj.href;
		} catch {
			return url;
		}
	}

	private sanitizeText(value: string | null | undefined): string | null {
		if (!value) {
			return null;
		}

		const sanitized = sanitizeTextContent(value);
		return sanitized.length ? sanitized : null;
	}

	private buildFallbackMetadata(url: string): LinkMetadata {
		return {
			title: this.ensureTitle(null, url),
			description: null,
			favicon: this.deriveFaviconFromUrl(url),
		};
	}

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

	private isLikelyFaviconUrl(candidate: string): boolean {
		const lower = candidate.toLowerCase();
		if (lower.startsWith("data:")) {
			return true;
		}

		if (/\.(ico|png|svg|gif|webp)$/i.test(lower)) {
			return true;
		}

		if (/\.(jpg|jpeg)$/i.test(lower)) {
			return /\b(icon|favicon|logo)\b/.test(lower);
		}

		return /\b(icon|favicon|logo)\b/.test(lower);
	}

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

	private deriveFaviconFromUrl(url: string): string | null {
		try {
			return this.buildNativeFaviconUrl(url);
		} catch {
			return null;
		}
	}

	private buildNativeFaviconUrl(url: string): string | null {
		try {
			const parsed = new URL(url);
			return `${parsed.origin}/favicon.ico`;
		} catch {
			return null;
		}
	}

	private async finalizeMetadata(pageUrl: string, metadata: LinkMetadata): Promise<LinkMetadata> {
		const finalized: LinkMetadata = { ...metadata };

		await this.applyMetadataHandlers(pageUrl, finalized);

		finalized.title = this.ensureTitle(finalized.title, pageUrl);
		finalized.description = this.sanitizeText(finalized.description);

		finalized.favicon = await this.resolveFavicon(pageUrl);
		return finalized;
	}

	private async applyMetadataHandlers(pageUrl: string, metadata: LinkMetadata): Promise<void> {
		const parsedUrl = this.parseUrl(pageUrl);
		if (!parsedUrl) {
			return;
		}

		const context: MetadataHandlerContext = {
			originalUrl: pageUrl,
			url: parsedUrl,
			metadata,
			request: (request: RequestUrlParam) => this.performRequest(request),
			sanitizeText: (value: string | null | undefined) => this.sanitizeText(value),
			settings: this.settings,
		};

		for (const handler of this.metadataHandlers) {
			try {
				if (await handler.matches(context)) {
					await handler.enrich(context);
				}
			} catch (error) {
				console.warn(
					"[inline-link-preview] Metadata handler failed",
					handler.constructor?.name ?? "UnknownHandler",
					error instanceof Error ? error.message : error,
				);
			}
		}
	}

	private async resolveFavicon(pageUrl: string): Promise<string | null> {
		try {
			const parsed = new URL(pageUrl);
			const origin = parsed.origin;

			// Check persistent cache first
			if (this.persistentFaviconCache) {
				const cached = this.persistentFaviconCache.get(origin);
				if (cached !== undefined) {
					return cached;
				}
			}

			// Use Google's favicon service as primary source for reliability
			// It has better coverage and avoids generic/default icons
			const googleFavicon = this.buildGoogleFaviconUrl(parsed);
			if (googleFavicon) {
				if (this.persistentFaviconCache) {
					this.persistentFaviconCache.set(origin, googleFavicon);
				}
				return googleFavicon;
			}

			// Fallback to native favicon only if Google's service isn't available
			const nativeFavicon = this.buildNativeFaviconUrl(pageUrl);
			const verified = await this.validateFavicon(nativeFavicon);
			
			if (verified) {
				if (this.persistentFaviconCache) {
					this.persistentFaviconCache.set(origin, verified);
				}
				return verified;
			}

			if (this.persistentFaviconCache) {
				this.persistentFaviconCache.set(origin, null);
			}
			return null;
		} catch {
			return null;
		}
	}

	private buildGoogleFaviconUrl(pageUrl: URL): string | null {
		const host = pageUrl.hostname;
		if (!host) {
			return null;
		}

		// Request 128px for high quality display in cards and on retina displays
		// Google's service provides crisp icons at this size
		const params = new URLSearchParams({ 
			domain: host,
			sz: "128"
		});
		return `https://www.google.com/s2/favicons?${params.toString()}`;
	}

	private async validateFavicon(candidate: string | null): Promise<string | null> {
		if (!candidate) {
			return null;
		}

		if (candidate.startsWith("data:")) {
			this.faviconValidationCache.set(candidate, candidate);
			return candidate;
		}

		if (this.faviconValidationCache.has(candidate)) {
			return this.faviconValidationCache.get(candidate) ?? null;
		}

		const headers = {
			...this.buildRequestHeaders(),
			Accept: "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5",
		};
		try {
			const response = await this.requestWithTimeoutParam({ url: candidate, method: "HEAD", headers });
			if (response.status >= 200 && response.status < 400) {
				const type = this.getHeader(response, "content-type");
				// Only accept if we have a valid image content-type
				if (type && type.toLowerCase().includes("image")) {
					this.faviconValidationCache.set(candidate, candidate);
					return candidate;
				}
			}
		} catch {
			try {
				const resp = await this.requestWithTimeoutParam({ url: candidate, headers });
				const type = this.getHeader(resp, "content-type");
				// Only accept if we have a valid image content-type
				if (type && type.toLowerCase().includes("image")) {
					this.faviconValidationCache.set(candidate, candidate);
					return candidate;
				}
			} catch {
				// ignore and continue
			}
		}

		this.faviconValidationCache.set(candidate, null);
		return null;
	}

}
