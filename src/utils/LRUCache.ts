/**
 * LRUCache - Least Recently Used cache with size limits
 *
 * This cache automatically evicts the least recently used items when
 * the cache reaches its maximum size. This prevents unbounded memory growth
 * while keeping frequently accessed items in memory.
 *
 * @module utils/LRUCache
 */

/**
 * Cache statistics for monitoring and debugging
 */
export interface CacheStats {
	size: number;
	maxSize: number;
	hits: number;
	misses: number;
	evictions: number;
	hitRate: number;
}

/**
 * LRU cache implementation with size limits and statistics
 */
export class LRUCache<K, V> {
	private cache = new Map<K, V>();
	private maxSize: number;

	// Statistics
	private hits = 0;
	private misses = 0;
	private evictions = 0;

	/**
	 * Create a new LRU cache
	 * @param maxSize - Maximum number of items to store (default: 1000)
	 */
	constructor(maxSize = 1000) {
		this.maxSize = Math.max(1, maxSize);
	}

	/**
	 * Get a value from the cache
	 * @param key - Key to look up
	 * @returns Value if found, undefined otherwise
	 */
	get(key: K): V | undefined {
		const value = this.cache.get(key);

		if (value === undefined) {
			this.misses++;
			return undefined;
		}

		// Move to end (most recently used)
		this.cache.delete(key);
		this.cache.set(key, value);
		this.hits++;

		return value;
	}

	/**
	 * Set a value in the cache
	 * @param key - Key to store
	 * @param value - Value to store
	 */
	set(key: K, value: V): void {
		// If key exists, delete it first to update position
		if (this.cache.has(key)) {
			this.cache.delete(key);
		} else if (this.cache.size >= this.maxSize) {
			this.evictOldest();
		}

		this.cache.set(key, value);
	}

	/**
	 * Evict the least recently used (first) item from the cache, if any
	 */
	private evictOldest(): void {
		for (const key of this.cache.keys()) {
			this.cache.delete(key);
			this.evictions++;
			return;
		}
	}

	/**
	 * Check if a key exists in the cache
	 * @param key - Key to check
	 * @returns true if key exists, false otherwise
	 */
	has(key: K): boolean {
		return this.cache.has(key);
	}

	/**
	 * Clear all items from the cache
	 */
	clear(): void {
		this.cache.clear();
		this.hits = 0;
		this.misses = 0;
		this.evictions = 0;
	}

	/**
	 * Get the current number of items in the cache
	 */
	get size(): number {
		return this.cache.size;
	}

	/**
	 * Get cache statistics
	 * @returns Object with cache statistics
	 */
	getStats(): CacheStats {
		const total = this.hits + this.misses;
		const hitRate = total > 0 ? this.hits / total : 0;

		return {
			size: this.cache.size,
			maxSize: this.maxSize,
			hits: this.hits,
			misses: this.misses,
			evictions: this.evictions,
			hitRate: Math.round(hitRate * 10000) / 100 // 2 decimal places as percentage
		};
	}
}
