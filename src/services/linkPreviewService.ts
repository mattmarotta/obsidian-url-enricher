/**
 * LinkPreviewService - Core service for fetching and enriching link metadata
 *
 * This service orchestrates the entire metadata fetching pipeline:
 * - Fetches HTML from URLs with timeout support
 * - Parses HTML metadata (Open Graph, Twitter Cards, JSON-LD)
 * - Resolves and validates favicons
 * - Applies domain-specific metadata handlers (Wikipedia, Reddit, Twitter, etc.)
 * - Caches results for performance
 * - Detects soft 404s and handles errors gracefully
 *
 * @module services/linkPreviewService
 */

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
import { LRUCache } from "../utils/LRUCache";
import { METADATA_CACHE_MAX_SIZE, MAX_CONCURRENT_REQUESTS } from "../constants";

export type { LinkMetadata } from "./types";

/**
 * Configuration options for the LinkPreviewService
 */
export interface LinkPreviewServiceOptions {
	/** Maximum time to wait for HTTP requests in milliseconds */
	requestTimeoutMs: number;
}

/**
 * Main service for fetching and enriching link metadata
 */
export class LinkPreviewService {
	private cache: LRUCache<string, LinkMetadata>;
	private settings: InlineLinkPreviewSettings;
	private readonly metadataHandlers: MetadataHandler[];
	private pendingRequests = new Map<string, Promise<LinkMetadata>>();
	private activeRequestCount = 0;

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

		// Initialize LRU cache for metadata
		this.cache = new LRUCache<string, LinkMetadata>(METADATA_CACHE_MAX_SIZE);

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

	/**
	 * Set the persistent favicon cache
	 * @param cache - FaviconCache instance for storing favicons across sessions
	 */
	setPersistentFaviconCache(cache: FaviconCache): void {
		this.faviconResolver.setPersistentCache(cache);
	}

	/**
	 * Update plugin settings
	 * @param settings - New settings to apply
	 */
	updateSettings(settings: InlineLinkPreviewSettings): void {
		this.settings = settings;
	}

	/**
	 * Update service options (e.g., request timeout)
	 * Note: Changing timeout will clear the cache
	 * @param options - Partial options to update
	 */
	updateOptions(options: Partial<LinkPreviewServiceOptions>): void {
		const needsCacheReset = options.requestTimeoutMs !== undefined;
		this.fetcher.updateOptions(options);
		if (needsCacheReset) {
			this.clearCache();
		}
	}

	/**
	 * Register a custom metadata handler for domain-specific enrichment
	 * @param handler - MetadataHandler to register
	 */
	registerMetadataHandler(handler: MetadataHandler): void {
		this.metadataHandlers.push(handler);
	}

	/**
	 * Clear all cached metadata and favicon validation results
	 */
	clearCache(): void {
		this.cache.clear();
		this.faviconResolver.clearValidationCache();
	}

	/**
	 * Check if metadata is cached for a given URL
	 * @param url - URL to check
	 * @returns true if metadata is cached, false otherwise
	 */
	hasCachedMetadata(url: string): boolean {
		return this.cache.has(url);
	}

	/**
	 * Get cached metadata for a URL (if available)
	 * @param url - URL to get cached metadata for
	 * @returns Cached metadata or undefined if not cached
	 */
	getCachedMetadata(url: string): LinkMetadata | undefined {
		return this.cache.get(url);
	}

	/**
	 * Get cache statistics for monitoring and debugging
	 * @returns Cache statistics including hit rate and size
	 */
	getCacheStats() {
		return this.cache.getStats();
	}

	/**
	 * Get metadata for a URL, fetching from cache or network
	 * This is the main public API for getting link metadata
	 *
	 * Implements concurrency limiting and request deduplication:
	 * - Multiple requests for the same URL share a single fetch
	 * - Maximum concurrent requests limited to prevent overload
	 *
	 * @param rawUrl - URL to fetch metadata for
	 * @returns Promise resolving to link metadata
	 */
	async getMetadata(rawUrl: string): Promise<LinkMetadata> {
		const normalizedUrl = this.normalizeUrl(rawUrl);

		// Check cache first
		const cached = this.cache.get(normalizedUrl);
		if (cached) {
			return cached;
		}

		// Check if already fetching this URL (request deduplication)
		const pending = this.pendingRequests.get(normalizedUrl);
		if (pending) {
			return pending;
		}

		// Wait if too many concurrent requests
		while (this.activeRequestCount >= MAX_CONCURRENT_REQUESTS) {
			await new Promise(resolve => setTimeout(resolve, 50));
		}

		// Create new request promise
		const requestPromise = this.fetchMetadataWithTracking(normalizedUrl);
		this.pendingRequests.set(normalizedUrl, requestPromise);

		try {
			const metadata = await requestPromise;
			this.cache.set(normalizedUrl, metadata);
			return metadata;
		} finally {
			this.pendingRequests.delete(normalizedUrl);
		}
	}

	/**
	 * Fetch metadata with request tracking for concurrency limiting
	 */
	private async fetchMetadataWithTracking(url: string): Promise<LinkMetadata> {
		this.activeRequestCount++;
		try {
			return await this.fetchMetadata(url);
		} finally {
			this.activeRequestCount--;
		}
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
					"[url-enricher] Failed to fetch metadata for URL",
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
					"[url-enricher] Metadata handler failed",
					handler.constructor?.name ?? "UnknownHandler",
					error instanceof Error ? error.message : error,
				);
			}
		}
	}
}
