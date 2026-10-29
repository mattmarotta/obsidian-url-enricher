export interface LinkMetadata {
	context?: string | null; // Short label that leads the preview, e.g. "r/ObsidianMD"
	title: string;
	description: string | null;
	favicon: string | null;
	siteName?: string | null; // Site name from og:site_name or application-name meta tag
	error?: string | null; // Error message if metadata fetch failed
}
