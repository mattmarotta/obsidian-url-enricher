import type { MetadataHandler, MetadataHandlerContext } from "./metadataHandler";

interface WikipediaExtractResponse {
	query?: {
		pages?: {
			[pageId: string]: {
				extract?: string;
				description?: string;
			};
		};
	};
}

export class WikipediaMetadataHandler implements MetadataHandler {
	matches({ url }: MetadataHandlerContext): boolean {
		return /\.wikipedia\.org$/i.test(url.hostname);
	}

	async enrich(context: MetadataHandlerContext): Promise<void> {
		const { url, metadata, request } = context;

		// Set site name to "Wikipedia" instead of language code
		metadata.siteName = "Wikipedia";

		// Only fetch if we don't have a description
		if (metadata.description) {
			return;
		}

		// Extract article title from URL
		const pathMatch = url.pathname.match(/\/wiki\/([^/?#]+)/);
		if (!pathMatch) {
			return;
		}

		const articleTitle = decodeURIComponent(pathMatch[1]);

		try {
			// Use Wikipedia API to get article extract
			const apiUrl = new URL('/w/api.php', url.origin);
			apiUrl.searchParams.set('action', 'query');
			apiUrl.searchParams.set('format', 'json');
			apiUrl.searchParams.set('titles', articleTitle);
			apiUrl.searchParams.set('prop', 'extracts|description');
			apiUrl.searchParams.set('exintro', '1'); // Only intro section (full intro, not entire article)
			apiUrl.searchParams.set('explaintext', '1'); // Plain text
			apiUrl.searchParams.set('origin', '*'); // CORS

			const response = await request({
				url: apiUrl.href,
				method: 'GET',
			});

			if (response.status >= 400) {
				return;
			}

			const data = JSON.parse(response.text) as WikipediaExtractResponse;
			const pages = data.query?.pages;
			
			if (!pages) {
				return;
			}

			// Get first (and only) page
			const pageId = Object.keys(pages)[0];
			const page = pages[pageId];

			if (!page) {
				return;
			}

			// Prefer extract (full intro text) over short description for richer previews
			let description = page.extract || page.description;
			
			if (description) {
				// Clean up the description
				description = description.trim();

				// Store full description - decorator will handle truncation based on maxCardLength/maxBubbleLength user settings
				metadata.description = description;
			}
		} catch (error) {
			// Silent error handling
		}
	}
}
