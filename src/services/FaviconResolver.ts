import type { RequestUrlParam, RequestUrlResponse } from "obsidian";
import type { FaviconCache } from "./faviconCache";

/**
 * FaviconResolver - Resolves and validates favicon URLs
 */
export class FaviconResolver {
	private validationCache = new Map<string, string | null>();
	private persistentCache: FaviconCache | null = null;

	constructor(
		private performRequest: (request: RequestUrlParam) => Promise<RequestUrlResponse>,
		private getHeader: (response: RequestUrlResponse, header: string) => string | undefined,
		private buildRequestHeaders: () => Record<string, string>
	) {}

	setPersistentCache(cache: FaviconCache): void {
		this.persistentCache = cache;
	}

	clearValidationCache(): void {
		this.validationCache.clear();
	}

	/**
	 * Resolve the best favicon URL for a page
	 */
	async resolveFavicon(pageUrl: string): Promise<string | null> {
		try {
			const parsed = new URL(pageUrl);
			const origin = parsed.origin;

			// Check persistent cache first
			if (this.persistentCache) {
				const cached = this.persistentCache.get(origin);
				if (cached !== undefined) {
					return cached;
				}
			}

			// Use Google's favicon service as primary source for reliability
			// It has better coverage and avoids generic/default icons
			const googleFavicon = this.buildGoogleFaviconUrl(parsed);
			if (googleFavicon) {
				if (this.persistentCache) {
					this.persistentCache.set(origin, googleFavicon);
				}
				return googleFavicon;
			}

			// Fallback to native favicon only if Google's service isn't available
			const nativeFavicon = this.buildNativeFaviconUrl(pageUrl);
			const verified = await this.validateFavicon(nativeFavicon);

			if (verified) {
				if (this.persistentCache) {
					this.persistentCache.set(origin, verified);
				}
				return verified;
			}

			if (this.persistentCache) {
				this.persistentCache.set(origin, null);
			}
			return null;
		} catch {
			return null;
		}
	}

	/**
	 * Build Google's favicon service URL
	 * Requests 128px for high quality display on retina displays
	 */
	private buildGoogleFaviconUrl(pageUrl: URL): string | null {
		const host = pageUrl.hostname;
		if (!host) {
			return null;
		}

		// Request 128px for high quality display in cards and on retina displays
		const params = new URLSearchParams({
			domain: host,
			sz: "128"
		});
		return `https://www.google.com/s2/favicons?${params.toString()}`;
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

	/**
	 * Validate that a favicon URL actually returns an image
	 */
	private async validateFavicon(candidate: string | null): Promise<string | null> {
		if (!candidate) {
			return null;
		}

		if (candidate.startsWith("data:")) {
			this.validationCache.set(candidate, candidate);
			return candidate;
		}

		if (this.validationCache.has(candidate)) {
			return this.validationCache.get(candidate) ?? null;
		}

		const headers = {
			...this.buildRequestHeaders(),
			Accept: "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5",
		};

		try {
			const response = await this.performRequest({ url: candidate, method: "HEAD", headers });
			if (response.status >= 200 && response.status < 400) {
				const type = this.getHeader(response, "content-type");
				// Only accept if we have a valid image content-type
				if (type && type.toLowerCase().includes("image")) {
					this.validationCache.set(candidate, candidate);
					return candidate;
				}
			}
		} catch {
			try {
				const resp = await this.performRequest({ url: candidate, headers });
				const type = this.getHeader(resp, "content-type");
				// Only accept if we have a valid image content-type
				if (type && type.toLowerCase().includes("image")) {
					this.validationCache.set(candidate, candidate);
					return candidate;
				}
			} catch {
				// ignore and continue
			}
		}

		this.validationCache.set(candidate, null);
		return null;
	}

	/**
	 * Derive favicon URL from page URL
	 */
	deriveFaviconFromUrl(url: string): string | null {
		try {
			return this.buildNativeFaviconUrl(url);
		} catch {
			return null;
		}
	}
}
