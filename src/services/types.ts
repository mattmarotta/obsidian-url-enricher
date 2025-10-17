export interface LinkMetadata {
	title: string;
	description: string | null;
	favicon: string | null;
	error?: string | null; // Error message if metadata fetch failed
}
