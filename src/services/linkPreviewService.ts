import { requestUrl, RequestUrlResponse } from "obsidian";

export interface LinkMetadata {
	title: string;
	description: string | null;
	favicon: string | null;
}

export interface LinkPreviewServiceOptions {
	requestTimeoutMs: number;
	useLinkPreviewApi: boolean;
	linkPreviewApiKey: string | null;
}

interface ParsedMetadata {
    title?: string | null;
    description?: string | null;
    favicon?: string | null;
}

export class LinkPreviewService {
	private cache = new Map<string, LinkMetadata>();
	private options: LinkPreviewServiceOptions;
	private rateLimitResetAt = 0;
	private rateLimitListener: ((resetAt: number | null) => void) | null = null;
	private faviconCache = new Map<string, string | null>();
	private faviconValidationCache = new Map<string, string | null>();

	constructor(options: LinkPreviewServiceOptions) {
		this.options = { ...options };
	}

	updateOptions(options: Partial<LinkPreviewServiceOptions>): void {
		const previous = { ...this.options };
		this.options = { ...this.options, ...options };

		if (
			previous.requestTimeoutMs !== this.options.requestTimeoutMs ||
			previous.useLinkPreviewApi !== this.options.useLinkPreviewApi ||
			previous.linkPreviewApiKey !== this.options.linkPreviewApiKey
		) {
			this.clearCache();
			this.rateLimitResetAt = 0;
			this.notifyRateLimit(null);
		}
	}

	clearCache(): void {
		this.cache.clear();
		this.faviconCache.clear();
		this.faviconValidationCache.clear();
	}

	setRateLimitListener(listener: ((resetAt: number | null) => void) | null): void {
		this.rateLimitListener = listener;
		const currentReset = this.getRateLimitResetAt();
		if (!listener) {
			return;
		}
		listener(currentReset);
	}

	getRateLimitResetAt(): number | null {
		return this.rateLimitResetAt > Date.now() ? this.rateLimitResetAt : null;
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
		let metadata: LinkMetadata | null = null;
		const extraFavicons: string[] = [];
		if (this.options.useLinkPreviewApi && this.options.linkPreviewApiKey) {
			const apiResult = await this.fetchFromLinkPreviewApi(url);
			if (apiResult) {
				metadata = apiResult.metadata;
				extraFavicons.push(...apiResult.extraFavicons);
			}
		}
		if (!metadata) {
			if (!this.options.useLinkPreviewApi || !this.options.linkPreviewApiKey) {
				this.rateLimitResetAt = 0;
				this.notifyRateLimit(null);
			}

			try {
				const response = await this.requestWithTimeout(url);
				if (response.status >= 400) {
					throw new Error(`HTTP ${response.status}`);
				}

				const contentType = this.getHeader(response, "content-type") ?? "";
				if (!contentType.toLowerCase().includes("html")) {
					metadata = this.buildFallbackMetadata(url);
				} else {
					const finalUrl = this.getHeader(response, "x-final-url") ?? url;
					metadata = this.parseHtmlMetadata(finalUrl, response.text);
				}

				if (this.rateLimitResetAt !== 0 && Date.now() >= this.rateLimitResetAt) {
					this.rateLimitResetAt = 0;
					this.notifyRateLimit(null);
				}
			} catch (error) {
				console.warn(
					"[inline-link-preview] Failed to fetch metadata for URL",
					url,
					error instanceof Error ? error.message : error,
				);
				metadata = this.buildFallbackMetadata(url);
			}
		}

		return this.finalizeMetadata(url, metadata ?? this.buildFallbackMetadata(url), extraFavicons);
	}

	private notifyRateLimit(resetAt: number | null): void {
		if (!this.rateLimitListener) {
			return;
		}

		if (!resetAt || resetAt <= Date.now()) {
			this.rateLimitListener(null);
			return;
		}

		this.rateLimitListener(resetAt);
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

	private async fetchFromLinkPreviewApi(url: string): Promise<{ metadata: LinkMetadata; extraFavicons: string[] } | null> {
		if (Date.now() < this.rateLimitResetAt) {
			this.notifyRateLimit(this.rateLimitResetAt);
			return null;
		}

		const endpoint = "https://api.linkpreview.net";
		const params = new URLSearchParams({
			key: this.options.linkPreviewApiKey ?? "",
			q: url,
		});

		try {
			const response = await fetch(`${endpoint}/?${params.toString()}`);
			if (!response.ok) {
				if (response.status === 429) {
					const retryAfter = this.parseRetryAfter(response.headers.get("Retry-After"));
					const waitMs = retryAfter ?? 60 * 60 * 1000;
					this.rateLimitResetAt = Date.now() + waitMs;
					console.warn(
						"[inline-link-preview] LinkPreview.net rate limit reached. Suppressing API calls for",
						Math.round(waitMs / 1000),
						"seconds.",
					);
					this.notifyRateLimit(this.rateLimitResetAt);
					return null;
				}

				if (response.status === 403 || response.status === 401) {
					console.warn("[inline-link-preview] LinkPreview.net rejected the request. Check your API key and quota.");
					this.rateLimitResetAt = 0;
					this.notifyRateLimit(null);
					return null;
				}

				if (response.status >= 500) {
					console.warn(
						"[inline-link-preview] LinkPreview.net server error",
						response.status,
					);
					this.rateLimitResetAt = 0;
					this.notifyRateLimit(null);
					return null;
				}

				console.warn(
					"[inline-link-preview] LinkPreview.net request failed with status",
					response.status,
				);
				this.rateLimitResetAt = 0;
				this.notifyRateLimit(null);
				return null;
			}

			const payload: { title?: string; description?: string; image?: string; url?: string; error?: string } =
				await response.json();

			if (payload.error) {
				console.warn("[inline-link-preview] LinkPreview.net responded with an error:", payload.error);
				if (/limit/i.test(payload.error ?? "")) {
					this.rateLimitResetAt = Date.now() + 60 * 60 * 1000;
					this.notifyRateLimit(this.rateLimitResetAt);
					return null;
				}
				this.rateLimitResetAt = 0;
				this.notifyRateLimit(null);
				return null;
			}

			const title = payload.title ?? "";
			const description = payload.description ?? null;
			const faviconCandidate = this.sanitizeFavicon(payload.image ?? null, payload.url ?? url);
			const favicon = this.deriveFaviconFromUrl(payload.url ?? url);

			if (!title && !description) {
				this.rateLimitResetAt = 0;
				this.notifyRateLimit(null);
				return null;
			}

			this.rateLimitResetAt = 0;
			this.notifyRateLimit(null);

			return {
				metadata: {
					title: title || url,
					description,
					favicon,
				},
				extraFavicons: faviconCandidate ? [faviconCandidate] : [],
			};
		} catch (error) {
			console.warn("[inline-link-preview] LinkPreview.net request failed", error);
			this.rateLimitResetAt = 0;
			this.notifyRateLimit(null);
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
			result.title = this.decodeEntities(titleMatch[1]);
		}

		const metaRegex =
			/<meta\s+[^>]*?(?:name|property)=["'](?:og:description|twitter:description|description)["'][^>]*content=["']([^"']+)["'][^>]*>/i;
		const metaMatch = html.match(metaRegex);
		if (metaMatch) {
			result.description = this.decodeEntities(metaMatch[1]);
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

		const normalized = value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
		return normalized.length ? normalized : null;
	}

	private buildFallbackMetadata(url: string): LinkMetadata {
		return {
			title: this.ensureTitle(null, url),
			description: null,
			favicon: this.deriveFaviconFromUrl(url),
		};
	}

	private decodeEntities(value: string): string {
		if (typeof document === "undefined") {
			return value;
		}

		const textarea = document.createElement("textarea");
		textarea.innerHTML = value;
		return textarea.value;
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
		return this.deriveFaviconFromUrl(baseUrl);
	}

	private parseRetryAfter(header: string | null): number | null {
		if (!header) {
			return null;
		}

		const seconds = Number(header);
		if (Number.isFinite(seconds)) {
			return Math.max(0, seconds) * 1000;
		}

		const date = Date.parse(header);
		if (!Number.isNaN(date)) {
			return Math.max(0, date - Date.now());
		}

		return null;
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
			const pageUrl = new URL(url);
			return new URL("/favicon.ico", pageUrl).href;
		} catch {
			return null;
		}
	}

	private async finalizeMetadata(pageUrl: string, metadata: LinkMetadata, extraFavicons: string[] = []): Promise<LinkMetadata> {
		const finalized: LinkMetadata = { ...metadata };

		if (this.isRedditUrl(pageUrl) && this.isGenericRedditTitle(finalized.title)) {
			const redditData = await this.fetchRedditMetadata(pageUrl);
			if (redditData) {
				if (redditData.title) {
					finalized.title = redditData.title;
				}
				if (redditData.description) {
					finalized.description = redditData.description;
				}
			}
		}

		finalized.favicon = await this.resolveFavicon(pageUrl, finalized.favicon, extraFavicons);
		return finalized;
	}

	private async resolveFavicon(pageUrl: string, initial: string | null, extraCandidates: string[] = []): Promise<string | null> {
		try {
			const origin = new URL(pageUrl).origin;
			if (initial) {
				const verifiedInitial = await this.validateFavicon(initial);
				if (verifiedInitial) {
					this.faviconCache.set(origin, verifiedInitial);
					return verifiedInitial;
				}
			}

			if (this.faviconCache.has(origin)) {
				return this.faviconCache.get(origin) ?? null;
			}

			const candidates = [...extraCandidates, ...this.buildFallbackFaviconCandidates(pageUrl)];
			for (const candidate of candidates) {
				const verified = await this.validateFavicon(candidate);
				if (verified) {
					this.faviconCache.set(origin, verified);
					return verified;
				}
			}

			this.faviconCache.set(origin, null);
			return null;
		} catch {
			return initial;
		}
	}

	private buildFallbackFaviconCandidates(pageUrl: string): string[] {
		try {
			const base = new URL(pageUrl);
			const suffixes = [
				"/favicon.ico",
				"/favicon.png",
				"/favicon.svg",
				"/favicon-32x32.png",
				"/favicon-16x16.png",
				"/apple-touch-icon.png",
				"/apple-touch-icon-precomposed.png",
			];
			return suffixes.map((suffix) => new URL(suffix, base).href);
		} catch {
			return [];
		}
	}

	private async validateFavicon(candidate: string | null): Promise<string | null> {
		if (!candidate) {
			return null;
		}

		if (this.faviconValidationCache.has(candidate)) {
			return this.faviconValidationCache.get(candidate) ?? null;
		}

		const headers = this.buildRequestHeaders();
		try {
			const response = await requestUrl({ url: candidate, method: "HEAD", headers });
			if (response.status >= 200 && response.status < 400) {
				const type = this.getHeader(response, "content-type");
				if (!type || type.toLowerCase().includes("image")) {
					this.faviconValidationCache.set(candidate, candidate);
					return candidate;
				}
			}
		} catch {
			try {
				const resp = await requestUrl({ url: candidate, headers });
				const type = this.getHeader(resp, "content-type");
				if (!type || type.toLowerCase().includes("image")) {
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

	private isRedditUrl(url: string): boolean {
		try {
			const parsed = new URL(url);
			return /(^|\.)reddit\.com$/i.test(parsed.hostname);
		} catch {
			return false;
		}
	}

	private isGenericRedditTitle(title: string): boolean {
		const normalized = title.trim().toLowerCase();
		return (
			normalized === "reddit.com" ||
			normalized === "reddit" ||
			normalized.includes("the heart of the internet")
		);
	}

	private async fetchRedditMetadata(url: string): Promise<{ title?: string; description?: string } | null> {
		try {
			const parsed = new URL(url);
			if (!/\/comments\//.test(parsed.pathname)) {
				return null;
			}

			const jsonUrl = new URL(parsed.pathname.replace(/\/?$/, "/") + ".json", `${parsed.protocol}//${parsed.host}`);
			if (parsed.search) {
				jsonUrl.search = parsed.search;
			}

			const response = await requestUrl({ url: jsonUrl.href, method: "GET", headers: this.buildRequestHeaders() });
			if (response.status >= 400) {
				return null;
			}

			const payload = JSON.parse(response.text) as Array<{ data?: { children?: Array<{ data?: any }> } }>;
			const post = payload?.[0]?.data?.children?.[0]?.data;
			if (!post) {
				return null;
			}

			const title = typeof post.title === "string" ? post.title.trim() : undefined;
			const descriptionSource = typeof post.selftext === "string" ? post.selftext : typeof post.public_description === "string" ? post.public_description : "";
			const description = descriptionSource
				.replace(/\s+/g, " ")
				.trim();

			return {
				title,
				description: description ? description : undefined,
			};
		} catch (error) {
			console.warn("[inline-link-preview] Failed to fetch Reddit metadata", error);
			return null;
		}
	}
}
