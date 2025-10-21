import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FaviconCache } from '../../src/services/faviconCache';

describe('FaviconCache', () => {
	let cache: FaviconCache;
	let mockLoadData: ReturnType<typeof vi.fn>;
	let mockSaveData: ReturnType<typeof vi.fn>;
	let mockData: any;

	beforeEach(() => {
		mockData = {};
		mockLoadData = vi.fn(async () => mockData);
		mockSaveData = vi.fn(async (data: any) => {
			mockData = data;
		});
		cache = new FaviconCache(mockLoadData, mockSaveData);
		vi.useFakeTimers();
	});

	describe('Constructor and Load', () => {
		it('should initialize with empty caches', () => {
			const stats = cache.getStats();
			expect(stats.entries).toBe(0);
			expect(stats.oldestTimestamp).toBeNull();
		});

		it('should load existing cache data', async () => {
			const now = Date.now();
			mockData = {
				'favicon-cache': {
					'https://example.com': {
						url: 'https://example.com/favicon.ico',
						timestamp: now,
					},
					'https://test.com': {
						url: 'https://test.com/icon.png',
						timestamp: now - 1000,
					},
				},
			};

			await cache.load();

			expect(cache.get('https://example.com')).toBe('https://example.com/favicon.ico');
			expect(cache.get('https://test.com')).toBe('https://test.com/icon.png');
			expect(cache.getStats().entries).toBe(2);
		});

		it('should clean expired entries on load', async () => {
			const now = Date.now();
			const thirtyOneDaysAgo = now - (31 * 24 * 60 * 60 * 1000);

			mockData = {
				'favicon-cache': {
					'https://fresh.com': {
						url: 'https://fresh.com/favicon.ico',
						timestamp: now,
					},
					'https://expired.com': {
						url: 'https://expired.com/favicon.ico',
						timestamp: thirtyOneDaysAgo,
					},
				},
			};

			await cache.load();

			expect(cache.get('https://fresh.com')).toBe('https://fresh.com/favicon.ico');
			expect(cache.get('https://expired.com')).toBeUndefined();
			expect(cache.getStats().entries).toBe(1);
		});

		it('should handle load errors gracefully', async () => {
			mockLoadData = vi.fn(async () => {
				throw new Error('Load failed');
			});
			cache = new FaviconCache(mockLoadData, mockSaveData);

			// Should not throw
			await expect(cache.load()).resolves.toBeUndefined();

			// Should have empty cache
			expect(cache.getStats().entries).toBe(0);
		});

		it('should handle missing cache key in data', async () => {
			mockData = { someOtherKey: 'value' };

			await cache.load();

			expect(cache.getStats().entries).toBe(0);
		});
	});

	describe('Get Method', () => {
		it('should return undefined for non-existent entries', () => {
			expect(cache.get('https://notfound.com')).toBeUndefined();
		});

		it('should get from memory cache', () => {
			cache.set('https://example.com', 'https://example.com/favicon.ico');
			const result = cache.get('https://example.com');

			expect(result).toBe('https://example.com/favicon.ico');
		});

		it('should get from disk cache and populate memory', async () => {
			const now = Date.now();
			mockData = {
				'favicon-cache': {
					'https://example.com': {
						url: 'https://example.com/favicon.ico',
						timestamp: now,
					},
				},
			};

			await cache.load();

			// First get populates memory from disk
			const result1 = cache.get('https://example.com');
			expect(result1).toBe('https://example.com/favicon.ico');

			// Second get uses memory cache
			const result2 = cache.get('https://example.com');
			expect(result2).toBe('https://example.com/favicon.ico');
		});

		it('should return null for cached null values', () => {
			cache.set('https://example.com', null);
			expect(cache.get('https://example.com')).toBeNull();
		});

		it('should remove and return undefined for expired entries', async () => {
			const now = Date.now();
			const thirtyOneDaysAgo = now - (31 * 24 * 60 * 60 * 1000);

			mockData = {
				'favicon-cache': {
					'https://expired.com': {
						url: 'https://expired.com/favicon.ico',
						timestamp: thirtyOneDaysAgo,
					},
				},
			};

			await cache.load();

			// Get should detect expiration and remove entry
			const result = cache.get('https://expired.com');
			expect(result).toBeUndefined();

			// Entry should be removed from cache
			expect(cache.getStats().entries).toBe(0);
		});
	});

	describe('Set Method', () => {
		it('should set favicon URL in both memory and disk cache', () => {
			cache.set('https://example.com', 'https://example.com/favicon.ico');

			expect(cache.get('https://example.com')).toBe('https://example.com/favicon.ico');
			expect(cache.getStats().entries).toBe(1);
		});

		it('should update existing entries', () => {
			cache.set('https://example.com', 'https://example.com/old.ico');
			cache.set('https://example.com', 'https://example.com/new.ico');

			expect(cache.get('https://example.com')).toBe('https://example.com/new.ico');
			expect(cache.getStats().entries).toBe(1);
		});

		it('should set null values in memory but not disk', () => {
			cache.set('https://example.com', null);

			// Should be in memory
			expect(cache.get('https://example.com')).toBeNull();

			// Should not be in disk cache
			expect(cache.getStats().entries).toBe(0);
		});

		it('should remove disk entry when setting null for existing entry', () => {
			cache.set('https://example.com', 'https://example.com/favicon.ico');
			expect(cache.getStats().entries).toBe(1);

			cache.set('https://example.com', null);

			// Memory should have null
			expect(cache.get('https://example.com')).toBeNull();

			// Disk should not have entry
			expect(cache.getStats().entries).toBe(0);
		});

		it('should set current timestamp on new entries', () => {
			const now = Date.now();
			vi.setSystemTime(now);

			cache.set('https://example.com', 'https://example.com/favicon.ico');

			const stats = cache.getStats();
			expect(stats.oldestTimestamp).toBe(now);
		});
	});

	describe('Has Method', () => {
		it('should return true for existing entries', () => {
			cache.set('https://example.com', 'https://example.com/favicon.ico');
			expect(cache.has('https://example.com')).toBe(true);
		});

		it('should return true for null entries in memory', () => {
			cache.set('https://example.com', null);
			expect(cache.has('https://example.com')).toBe(true);
		});

		it('should return false for non-existent entries', () => {
			expect(cache.has('https://notfound.com')).toBe(false);
		});

		it('should return false for expired entries', async () => {
			const now = Date.now();
			const thirtyOneDaysAgo = now - (31 * 24 * 60 * 60 * 1000);

			mockData = {
				'favicon-cache': {
					'https://expired.com': {
						url: 'https://expired.com/favicon.ico',
						timestamp: thirtyOneDaysAgo,
					},
				},
			};

			await cache.load();

			expect(cache.has('https://expired.com')).toBe(false);
		});
	});

	describe('Clear Method', () => {
		it('should clear both memory and disk caches', async () => {
			const now = Date.now();
			mockData = {
				'favicon-cache': {
					'https://example.com': {
						url: 'https://example.com/favicon.ico',
						timestamp: now,
					},
				},
			};

			await cache.load();
			cache.set('https://test.com', 'https://test.com/favicon.ico');

			expect(cache.getStats().entries).toBe(2);

			cache.clear();

			expect(cache.get('https://example.com')).toBeUndefined();
			expect(cache.get('https://test.com')).toBeUndefined();
			expect(cache.getStats().entries).toBe(0);
		});

		it('should mark cache as dirty after clear', async () => {
			cache.set('https://example.com', 'https://example.com/favicon.ico');
			cache.clear();

			// Advance time to trigger save
			await vi.advanceTimersByTimeAsync(1000);

			expect(mockSaveData).toHaveBeenCalled();
		});
	});

	describe('Persistence', () => {
		it('should debounce saves to disk', async () => {
			cache.set('https://example1.com', 'https://example1.com/favicon.ico');
			expect(mockSaveData).not.toHaveBeenCalled();

			// Advance time but not enough to trigger save
			await vi.advanceTimersByTimeAsync(500);
			expect(mockSaveData).not.toHaveBeenCalled();

			cache.set('https://example2.com', 'https://example2.com/favicon.ico');

			// Advance time to trigger save (1 second after last change)
			await vi.advanceTimersByTimeAsync(1000);

			expect(mockSaveData).toHaveBeenCalledTimes(1);
		});

		it('should save after 1 second of inactivity', async () => {
			cache.set('https://example.com', 'https://example.com/favicon.ico');

			await vi.advanceTimersByTimeAsync(1000);

			expect(mockSaveData).toHaveBeenCalledTimes(1);
			expect(mockData['favicon-cache']).toBeDefined();
			expect(mockData['favicon-cache']['https://example.com']).toBeDefined();
		});

		it('should merge with existing data on save', async () => {
			mockData = {
				existingKey: 'existingValue',
				'favicon-cache': {
					'https://old.com': {
						url: 'https://old.com/favicon.ico',
						timestamp: Date.now(),
					},
				},
			};

			await cache.load();

			cache.set('https://new.com', 'https://new.com/favicon.ico');
			await vi.advanceTimersByTimeAsync(1000);

			expect(mockData.existingKey).toBe('existingValue');
			expect(mockData['favicon-cache']['https://new.com']).toBeDefined();
		});

		it('should handle save errors gracefully', async () => {
			mockSaveData = vi.fn(async () => {
				throw new Error('Save failed');
			});
			cache = new FaviconCache(mockLoadData, mockSaveData);

			cache.set('https://example.com', 'https://example.com/favicon.ico');

			// Should not throw - just verify advancing timers completes without error
			await vi.advanceTimersByTimeAsync(1000);

			// Verify saveData was called despite the error
			expect(mockSaveData).toHaveBeenCalled();
		});

		it('should not save if not dirty', async () => {
			await cache.flush();
			expect(mockSaveData).not.toHaveBeenCalled();
		});

		it('should clear dirty flag after successful save', async () => {
			cache.set('https://example.com', 'https://example.com/favicon.ico');
			await vi.advanceTimersByTimeAsync(1000);

			expect(mockSaveData).toHaveBeenCalledTimes(1);

			// Calling flush again should not save
			await cache.flush();
			expect(mockSaveData).toHaveBeenCalledTimes(1);
		});
	});

	describe('Manual Flush', () => {
		it('should immediately save when flush is called', async () => {
			cache.set('https://example.com', 'https://example.com/favicon.ico');

			await cache.flush();

			expect(mockSaveData).toHaveBeenCalledTimes(1);
			expect(mockData['favicon-cache']['https://example.com']).toBeDefined();
		});

		it('should not save if cache is not dirty', async () => {
			await cache.flush();
			expect(mockSaveData).not.toHaveBeenCalled();
		});
	});

	describe('Statistics', () => {
		it('should return correct entry count', () => {
			cache.set('https://example1.com', 'https://example1.com/favicon.ico');
			cache.set('https://example2.com', 'https://example2.com/favicon.ico');

			const stats = cache.getStats();
			expect(stats.entries).toBe(2);
		});

		it('should return null for oldest timestamp when empty', () => {
			const stats = cache.getStats();
			expect(stats.oldestTimestamp).toBeNull();
		});

		it('should return correct oldest timestamp', () => {
			const now = Date.now();
			vi.setSystemTime(now);

			cache.set('https://example1.com', 'https://example1.com/favicon.ico');

			vi.setSystemTime(now + 5000);
			cache.set('https://example2.com', 'https://example2.com/favicon.ico');

			vi.setSystemTime(now + 10000);
			cache.set('https://example3.com', 'https://example3.com/favicon.ico');

			const stats = cache.getStats();
			expect(stats.entries).toBe(3);
			expect(stats.oldestTimestamp).toBe(now);
		});

		it('should not count null entries in disk cache', () => {
			cache.set('https://example1.com', 'https://example1.com/favicon.ico');
			cache.set('https://example2.com', null);

			const stats = cache.getStats();
			expect(stats.entries).toBe(1);
		});

		it('should update stats after clear', () => {
			cache.set('https://example1.com', 'https://example1.com/favicon.ico');
			cache.set('https://example2.com', 'https://example2.com/favicon.ico');

			cache.clear();

			const stats = cache.getStats();
			expect(stats.entries).toBe(0);
			expect(stats.oldestTimestamp).toBeNull();
		});
	});

	describe('Expiration', () => {
		it('should expire entries after 30 days', async () => {
			const now = Date.now();
			vi.setSystemTime(now);

			cache.set('https://example.com', 'https://example.com/favicon.ico');

			// Advance time by 29 days - should NOT expire
			vi.setSystemTime(now + (29 * 24 * 60 * 60 * 1000));
			expect(cache.get('https://example.com')).toBe('https://example.com/favicon.ico');

			// Advance time by 31 days - should expire
			vi.setSystemTime(now + (31 * 24 * 60 * 60 * 1000));

			// Need to reload to test expiration on load
			await cache.flush();
			const newCache = new FaviconCache(mockLoadData, mockSaveData);
			await newCache.load();

			expect(newCache.get('https://example.com')).toBeUndefined();
		});

		it('should clean multiple expired entries on load', async () => {
			const now = Date.now();
			const oldTime = now - (31 * 24 * 60 * 60 * 1000);

			mockData = {
				'favicon-cache': {
					'https://fresh1.com': {
						url: 'https://fresh1.com/favicon.ico',
						timestamp: now,
					},
					'https://expired1.com': {
						url: 'https://expired1.com/favicon.ico',
						timestamp: oldTime,
					},
					'https://fresh2.com': {
						url: 'https://fresh2.com/favicon.ico',
						timestamp: now - 1000,
					},
					'https://expired2.com': {
						url: 'https://expired2.com/favicon.ico',
						timestamp: oldTime - 1000,
					},
				},
			};

			await cache.load();

			expect(cache.get('https://fresh1.com')).toBeTruthy();
			expect(cache.get('https://fresh2.com')).toBeTruthy();
			expect(cache.get('https://expired1.com')).toBeUndefined();
			expect(cache.get('https://expired2.com')).toBeUndefined();
			expect(cache.getStats().entries).toBe(2);
		});
	});

	describe('Edge Cases', () => {
		it('should handle multiple gets without side effects', () => {
			cache.set('https://example.com', 'https://example.com/favicon.ico');

			const result1 = cache.get('https://example.com');
			const result2 = cache.get('https://example.com');
			const result3 = cache.get('https://example.com');

			expect(result1).toBe(result2);
			expect(result2).toBe(result3);
		});

		it('should handle rapid consecutive sets', async () => {
			for (let i = 0; i < 10; i++) {
				cache.set(`https://example${i}.com`, `https://example${i}.com/favicon.ico`);
			}

			expect(cache.getStats().entries).toBe(10);

			// Should only save once due to debouncing
			await vi.advanceTimersByTimeAsync(1000);
			expect(mockSaveData).toHaveBeenCalledTimes(1);
		});

		it('should handle empty string URLs', () => {
			cache.set('', 'https://example.com/favicon.ico');
			expect(cache.get('')).toBe('https://example.com/favicon.ico');
		});

		it('should handle special characters in origins', () => {
			const origin = 'https://例え.jp'; // Japanese domain
			cache.set(origin, `${origin}/favicon.ico`);
			expect(cache.get(origin)).toBe(`${origin}/favicon.ico`);
		});

		it('should maintain separate entries for different protocols', () => {
			cache.set('http://example.com', 'http://example.com/favicon.ico');
			cache.set('https://example.com', 'https://example.com/favicon.ico');

			expect(cache.get('http://example.com')).toBe('http://example.com/favicon.ico');
			expect(cache.get('https://example.com')).toBe('https://example.com/favicon.ico');
			expect(cache.getStats().entries).toBe(2);
		});
	});
});
