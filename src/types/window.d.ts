/**
 * Window interface augmentation for URL Enricher developer API
 */

interface URLEnricherAPI {
	getCacheStats: () => {
		metadata: { size: number; maxSize: number };
		favicon: { entries: number; oldestTimestamp: number | null };
	};
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
