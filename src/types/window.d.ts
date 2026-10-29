/**
 * Window interface augmentation for URL Enricher developer API
 */

import type { CacheStats } from "../utils/LRUCache";

interface URLEnricherAPI {
	getCacheStats: () => CacheStats;
	clearAllCaches: () => void;
	refreshDecorations: () => void;
	help: () => string;
}

declare global {
	interface Window {
		urlEnricher?: URLEnricherAPI;
		inlineLinkPreview?: URLEnricherAPI;
	}
}

export {};
