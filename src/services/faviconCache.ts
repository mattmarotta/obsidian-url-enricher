interface FaviconCacheEntry {
	url: string;
	timestamp: number;
}

interface FaviconCacheData {
	[origin: string]: FaviconCacheEntry;
}

export class FaviconCache {
	private memoryCache = new Map<string, string | null>();
	private diskCache: FaviconCacheData = {};
	private readonly CACHE_KEY = "favicon-cache";
	private readonly EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
	private dirty = false;
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor(
		private loadData: () => Promise<any>,
		private saveData: (data: any) => Promise<void>
	) {}

	async load(): Promise<void> {
		try {
			const data = await this.loadData();
			if (data && data[this.CACHE_KEY]) {
				this.diskCache = data[this.CACHE_KEY];
				this.cleanExpired();
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
		}, 1000); // Save after 1 second of inactivity
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
