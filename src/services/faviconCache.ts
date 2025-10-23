/**
 * FaviconCache - Persistent cache for favicon URLs
 *
 * This class provides a two-tier caching system for favicons:
 * - Memory cache for fast access during runtime
 * - Disk cache for persistence across sessions (30-day expiration)
 *
 * Features:
 * - Automatic expiration of old entries (30 days)
 * - Debounced disk writes (1 second) to minimize I/O
 * - Validation of cached data structure
 *
 * @module services/faviconCache
 */

import { FAVICON_CACHE_EXPIRATION_MS, FAVICON_CACHE_SAVE_DEBOUNCE_MS, FAVICON_CACHE_KEY } from "../constants";

/**
 * Single favicon cache entry
 */
interface FaviconCacheEntry {
	url: string;
	timestamp: number;
}

/**
 * Disk cache structure: origin -> favicon entry
 */
interface FaviconCacheData {
	[origin: string]: FaviconCacheEntry;
}

/**
 * Plugin data structure (from Obsidian's Plugin.loadData/saveData)
 */
interface PluginData {
	[key: string]: unknown;
}

/**
 * Persistent cache for storing favicon URLs
 */
export class FaviconCache {
	private memoryCache = new Map<string, string | null>();
	private diskCache: FaviconCacheData = {};
	private readonly CACHE_KEY = FAVICON_CACHE_KEY;
	private readonly EXPIRATION_MS = FAVICON_CACHE_EXPIRATION_MS;
	private dirty = false;
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Create a new FaviconCache
	 * @param loadData - Function to load plugin data from disk
	 * @param saveData - Function to save plugin data to disk
	 */
	constructor(
		private loadData: () => Promise<PluginData>,
		private saveData: (data: PluginData) => Promise<void>
	) {}

	/**
	 * Type guard to validate cache data structure
	 * @param value - Value to validate
	 * @returns true if value is valid FaviconCacheData
	 */
	private isValidCacheData(value: unknown): value is FaviconCacheData {
		if (!value || typeof value !== 'object') {
			return false;
		}
		// Basic validation - all values should be objects with url and timestamp
		return Object.values(value as Record<string, unknown>).every(
			entry =>
				entry &&
				typeof entry === 'object' &&
				'url' in entry &&
				'timestamp' in entry &&
				typeof (entry as FaviconCacheEntry).url === 'string' &&
				typeof (entry as FaviconCacheEntry).timestamp === 'number'
		);
	}

	/**
	 * Load favicon cache from disk
	 * Automatically cleans expired entries on load
	 */
	async load(): Promise<void> {
		try {
			const data = await this.loadData();
			if (data && data[this.CACHE_KEY]) {
				const cacheData = data[this.CACHE_KEY];
				if (this.isValidCacheData(cacheData)) {
					this.diskCache = cacheData;
					this.cleanExpired();
				}
			}
		} catch (error) {
			console.warn("[inline-link-preview] Failed to load favicon cache", error);
			this.diskCache = {};
		}
	}

	/**
	 * Get favicon URL for an origin
	 * @param origin - Origin (e.g., "https://example.com")
	 * @returns Favicon URL, null if explicitly set to null, or undefined if not cached
	 */
	get(origin: string): string | null | undefined {
		// Check memory cache first (fastest)
		if (this.memoryCache.has(origin)) {
			return this.memoryCache.get(origin);
		}

		// Check disk cache
		const entry = this.diskCache[origin];
		if (entry) {
			// Check if expired
			if (Date.now() - entry.timestamp < this.EXPIRATION_MS) {
				// Populate memory cache
				this.memoryCache.set(origin, entry.url);
				return entry.url;
			} else {
				// Expired, remove it
				delete this.diskCache[origin];
				this.markDirty();
			}
		}

		return undefined;
	}

	/**
	 * Set favicon URL for an origin
	 * @param origin - Origin (e.g., "https://example.com")
	 * @param faviconUrl - Favicon URL or null to indicate no favicon
	 */
	set(origin: string, faviconUrl: string | null): void {
		// Update memory cache
		this.memoryCache.set(origin, faviconUrl);

		// Update disk cache
		if (faviconUrl) {
			this.diskCache[origin] = {
				url: faviconUrl,
				timestamp: Date.now(),
			};
			this.markDirty();
		} else {
			// Don't persist null values to disk
			if (this.diskCache[origin]) {
				delete this.diskCache[origin];
				this.markDirty();
			}
		}
	}

	/**
	 * Check if an origin has a cached favicon
	 * @param origin - Origin to check
	 * @returns true if favicon is cached (even if null), false if not cached
	 */
	has(origin: string): boolean {
		return this.get(origin) !== undefined;
	}

	/**
	 * Clear all cached favicons (both memory and disk)
	 */
	clear(): void {
		this.memoryCache.clear();
		this.diskCache = {};
		this.markDirty();
	}

	/**
	 * Remove expired entries from disk cache
	 */
	private cleanExpired(): void {
		const now = Date.now();
		let cleaned = false;

		for (const [origin, entry] of Object.entries(this.diskCache)) {
			if (now - entry.timestamp >= this.EXPIRATION_MS) {
				delete this.diskCache[origin];
				cleaned = true;
			}
		}

		if (cleaned) {
			this.markDirty();
		}
	}

	/**
	 * Mark cache as dirty and schedule a save
	 */
	private markDirty(): void {
		this.dirty = true;
		this.scheduleSave();
	}

	/**
	 * Schedule a debounced save to disk
	 * Multiple calls within the debounce period will only trigger one save
	 */
	private scheduleSave(): void {
		// Debounce saves to avoid writing to disk too frequently
		if (this.saveTimeout !== null) {
			clearTimeout(this.saveTimeout);
		}

		this.saveTimeout = setTimeout(() => {
			this.flush();
			this.saveTimeout = null;
		}, FAVICON_CACHE_SAVE_DEBOUNCE_MS);
	}

	/**
	 * Immediately flush all pending changes to disk
	 * Called on plugin unload to ensure no data loss
	 */
	async flush(): Promise<void> {
		if (!this.dirty) {
			return;
		}

		try {
			const data = await this.loadData();
			data[this.CACHE_KEY] = this.diskCache;
			await this.saveData(data);
			this.dirty = false;
		} catch (error) {
			console.warn("[inline-link-preview] Failed to save favicon cache", error);
		}
	}

	/**
	 * Get cache statistics for debugging
	 * @returns Object with entry count and oldest entry timestamp
	 */
	getStats(): { entries: number; oldestTimestamp: number | null } {
		const entries = Object.keys(this.diskCache).length;
		let oldestTimestamp: number | null = null;

		for (const entry of Object.values(this.diskCache)) {
			if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
				oldestTimestamp = entry.timestamp;
			}
		}

		return { entries, oldestTimestamp };
	}
}
