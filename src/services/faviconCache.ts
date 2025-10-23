import { FAVICON_CACHE_EXPIRATION_MS, FAVICON_CACHE_SAVE_DEBOUNCE_MS, FAVICON_CACHE_KEY } from "../constants";

interface FaviconCacheEntry {
	url: string;
	timestamp: number;
}

interface FaviconCacheData {
	[origin: string]: FaviconCacheEntry;
}

/**
 * Plugin data structure (from Obsidian's Plugin.loadData/saveData)
 */
interface PluginData {
	[key: string]: unknown;
}

export class FaviconCache {
	private memoryCache = new Map<string, string | null>();
	private diskCache: FaviconCacheData = {};
	private readonly CACHE_KEY = FAVICON_CACHE_KEY;
	private readonly EXPIRATION_MS = FAVICON_CACHE_EXPIRATION_MS;
	private dirty = false;
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor(
		private loadData: () => Promise<PluginData>,
		private saveData: (data: PluginData) => Promise<void>
	) {}

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

	has(origin: string): boolean {
		return this.get(origin) !== undefined;
	}

	clear(): void {
		this.memoryCache.clear();
		this.diskCache = {};
		this.markDirty();
	}

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

	private markDirty(): void {
		this.dirty = true;
		this.scheduleSave();
	}

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
