import type { MetadataHandler, MetadataHandlerContext } from "./metadataHandler";

export class GoogleSearchMetadataHandler implements MetadataHandler {
	matches({ url }: MetadataHandlerContext): boolean {
		if (!url) {
			return false;
		}

		if (url.pathname !== "/search") {
			return false;
		}

		const segments = url.hostname.toLowerCase().split(".");
		return segments.includes("google");
	}

	async enrich({ url, metadata }: MetadataHandlerContext): Promise<void> {
		const query = this.extractQuery(url);
		if (!query) {
			return;
		}

		if (this.hasSpecificTitle(metadata.title)) {
			return;
		}

		metadata.title = `Google Search — ${query}`;
	}

	private extractQuery(url: URL): string | null {
		const query = url.searchParams.get("q") ?? url.searchParams.get("query");
		if (!query) {
			return null;
		}

		const cleaned = query.replace(/\s+/g, " ").trim();
		return cleaned.length ? cleaned : null;
	}

	private hasSpecificTitle(title: string | null | undefined): boolean {
		if (!title) {
			return false;
		}

		const normalized = title.replace(/\s+/g, " ").trim().toLowerCase();
		return !!normalized && normalized !== "google" && normalized !== "google search";
	}
}
