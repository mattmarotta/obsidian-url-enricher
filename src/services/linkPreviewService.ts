import { RequestUrlParam } from "obsidian";
import type { LinkMetadata } from "./types";
import {
	createDefaultMetadataHandlers,
	type MetadataHandler,
	type MetadataHandlerContext,
} from "./metadataHandlers";
import { sanitizeTextContent } from "../utils/text";
import { FaviconCache } from "./faviconCache";
import type { InlineLinkPreviewSettings } from "../settings";
import { MetadataFetcher, type FetcherOptions } from "./MetadataFetcher";
import { HtmlParser } from "./HtmlParser";
import { FaviconResolver } from "./FaviconResolver";
import { MetadataValidator } from "./MetadataValidator";

export type { LinkMetadata } from "./types";

export interface LinkPreviewServiceOptions {
	requestTimeoutMs: number;
}

/**
 * LinkPreviewService - Main service for fetching and enriching link metadata
 */
export class LinkPreviewService {
	private cache = new Map<string, LinkMetadata>();
	private settings: InlineLinkPreviewSettings;
	private readonly metadataHandlers: MetadataHandler[];

	// Extracted modules
	private fetcher: MetadataFetcher;
	private htmlParser: HtmlParser;
	private faviconResolver: FaviconResolver;
	private validator: MetadataValidator;

	constructor(
		options: LinkPreviewServiceOptions,
		settings: InlineLinkPreviewSettings,
		metadataHandlers: MetadataHandler[] = createDefaultMetadataHandlers()
	) {
		this.settings = settings;
		this.metadataHandlers = metadataHandlers;

		// Initialize modules
		this.fetcher = new MetadataFetcher(options);
		this.htmlParser = new HtmlParser();
		this.faviconResolver = new FaviconResolver(
			(request) => this.fetcher.performRequest(request),
			(response, header) => this.fetcher.getHeader(response, header),
			() => this.fetcher.buildRequestHeaders()
		);
		this.validator = new MetadataValidator();
	}

	setPersistentFaviconCache(cache: FaviconCache): void {
		this.faviconResolver.setPersistentCache(cache);
	}

	updateSettings(settings: InlineLinkPreviewSettings): void {
		this.settings = settings;
	}

	updateOptions(options: Partial<LinkPreviewServiceOptions>): void {
		const needsCacheReset = options.requestTimeoutMs !== undefined;
		this.fetcher.updateOptions(options);
		if (needsCacheReset) {
			this.clearCache();
		}
	}

	registerMetadataHandler(handler: MetadataHandler): void {
		this.metadataHandlers.push(handler);
	}

	clearCache(): void {
		this.cache.clear();
		this.faviconResolver.clearValidationCache();
	}

	/**
	 * Check if metadata is cached for a given URL
	 */
	hasCachedMetadata(url: string): boolean {
		return this.cache.has(url);
	}

	/**
	 * Get cached metadata for a URL (if available)
	 */
	getCachedMetadata(url: string): LinkMetadata | undefined {
		return this.cache.get(url);
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
			const response = await this.fetcher.fetchUrl(url);

			// HTTP errors (403, 404, 500, etc.) - only flag if setting is enabled
			if (response.status >= 400) {
				const httpError = `HTTP ${response.status}`;
				if (this.settings.showHttpErrorWarnings) {
					throw new Error(httpError);
				}
				// Setting is off - don't treat as error, use fallback metadata
				console.log(`[inline-link-preview] ${httpError} for ${url}, but HTTP error warnings are disabled`);
			}

			const contentType = this.fetcher.getHeader(response, "content-type") ?? "";
			const finalUrl = this.fetcher.getHeader(response, "x-final-url") ?? url;

			// Parse HTML metadata or use fallback
			let parsedMetadata;
			if (!contentType.toLowerCase().includes("html")) {
				// Non-HTML content - use fallback immediately
				return await this.finalizeMetadata(url, this.buildFallbackMetadata(url));
			} else {
				// Parse HTML metadata
				parsedMetadata = this.htmlParser.parseHtmlMetadata(finalUrl, response.text);

				// Check for "soft 404s" - pages that return 200 but show error content
				// Only check if the setting is enabled
				if (this.settings.showHttpErrorWarnings &&
					this.validator.isSoft404(response.text, parsedMetadata, url)) {
					throw new Error("Soft 404");
				}

				// Convert ParsedMetadata to LinkMetadata
				const linkMetadata: LinkMetadata = {
					title: parsedMetadata.title || this.ensureTitle(null, url),
					description: parsedMetadata.description || null,
					favicon: parsedMetadata.favicon || null,
					siteName: parsedMetadata.siteName || null
				};

				return await this.finalizeMetadata(url, linkMetadata);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			// Determine error type
			const isHttpError = errorMessage.startsWith("HTTP ") ||
				errorMessage.includes("status 4") ||
				errorMessage.includes("status 5") ||
				errorMessage === "Soft 404";
			const isNetworkError = !isHttpError;

			// Always show network errors, only show HTTP errors if setting is enabled
			if (isNetworkError || this.settings.showHttpErrorWarnings) {
				console.warn(
					"[inline-link-preview] Failed to fetch metadata for URL",
					url,
					errorMessage,
				);
				// Return metadata with error flag
				const fallbackMetadata = this.buildFallbackMetadata(url);
				return {
					...await this.finalizeMetadata(url, fallbackMetadata),
					error: isNetworkError ? `network:${errorMessage}` : `http:${errorMessage}`
				};
			}

			// HTTP error but warnings disabled - return normal fallback
			console.log(`[inline-link-preview] HTTP error for ${url}, but warnings are disabled`);
			return await this.finalizeMetadata(url, this.buildFallbackMetadata(url));
		}
	}

	private parseUrl(rawUrl: string): URL | null {
		try {
			return new URL(rawUrl);
		} catch {
			return null;
		}
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
			favicon: this.faviconResolver.deriveFaviconFromUrl(url),
		};
	}

	private async finalizeMetadata(pageUrl: string, metadata: LinkMetadata): Promise<LinkMetadata> {
		const finalized: LinkMetadata = { ...metadata };

		await this.applyMetadataHandlers(pageUrl, finalized);

		finalized.title = this.ensureTitle(finalized.title, pageUrl);
		finalized.description = this.sanitizeText(finalized.description);

		finalized.favicon = await this.faviconResolver.resolveFavicon(pageUrl);
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
			request: (request: RequestUrlParam) => this.fetcher.performRequest(request),
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
}
