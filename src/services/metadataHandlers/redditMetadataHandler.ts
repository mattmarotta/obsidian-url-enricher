import type { RequestUrlResponse } from "obsidian";
import type { MetadataHandler, MetadataHandlerContext } from "./metadataHandler";

interface RedditPostData {
	data?: {
		children?: Array<{
			data?: {
				title?: unknown;
				selftext?: unknown;
				public_description?: unknown;
				subreddit?: unknown;
			};
		}>;
	};
}

interface RedditMetadata {
	title?: string;
	description?: string;
}

export class RedditMetadataHandler implements MetadataHandler {
	matches({ url }: MetadataHandlerContext): boolean {
		return /(^|\.)reddit\.com$/i.test(url.hostname);
	}

	async enrich(context: MetadataHandlerContext): Promise<void> {
		const { metadata } = context;

		const needsTitle = this.isGenericTitle(metadata.title);
		const needsDescription = !metadata.description;

		if (!needsTitle && !needsDescription) {
			return;
		}

		const extraMetadata = await this.fetchRedditMetadata(context);
		if (!extraMetadata) {
			return;
		}

		if (extraMetadata.title) {
			metadata.title = extraMetadata.title;
		}

		if (extraMetadata.description) {
			const sanitizedDescription = context.sanitizeText(extraMetadata.description);
			if (sanitizedDescription) {
				metadata.description = sanitizedDescription;
			}
		}
	}

	private isGenericTitle(title: string | null | undefined): boolean {
		if (!title) {
			return true;
		}

		const normalized = title.trim().toLowerCase();
		return (
			normalized === "reddit.com" ||
			normalized === "reddit" ||
			normalized.includes("the heart of the internet")
		);
	}

	private async fetchRedditMetadata(context: MetadataHandlerContext): Promise<RedditMetadata | null> {
		const { url, request } = context;

		if (!/\/comments\//.test(url.pathname)) {
			return null;
		}

		const jsonUrl = this.createJsonUrl(url);
		const response = await this.safeRequest(request, {
			url: jsonUrl,
			method: "GET",
		});
		if (!response || response.status >= 400) {
			return null;
		}

		try {
			const payload = JSON.parse(response.text) as RedditPostData[];
			const post = payload?.[0]?.data?.children?.[0]?.data;
			if (!post) {
				return null;
			}

			const rawTitle = typeof post.title === "string" ? post.title.trim() : "";
			const subredditName = typeof post.subreddit === "string" ? post.subreddit.trim() : "";
			const descriptionSource =
				typeof post.selftext === "string"
					? post.selftext
					: typeof post.public_description === "string"
					? post.public_description
					: "";

			const normalizedDescription = descriptionSource.replace(/\s+/g, " ").trim();
			
			// Special format for cards vs bubbles
			// Cards: subreddit | post title | content (using special markers)
			// Bubbles: r/Subreddit — Post Title
			
			let title = "";
			let description = "";
			
			if (subredditName && rawTitle) {
				// For cards: Store structured data with special markers
				// Format: "r/Subreddit §REDDIT_CARD§ Post Title §REDDIT_CONTENT§ Content"
				title = `r/${subredditName}`;
				description = `§REDDIT_CARD§${rawTitle}`;
				
				if (normalizedDescription) {
					// Store full content - decorator will handle truncation based on maxCardLength/maxBubbleLength
					description += `§REDDIT_CONTENT§${normalizedDescription}`;
				}
			} else if (subredditName) {
				title = `r/${subredditName}`;
			} else if (rawTitle) {
				title = rawTitle;
			}

			return {
				title: title || undefined,
				description: description || undefined,
			};
		} catch (error) {
			console.warn("[url-enricher] Failed to parse Reddit metadata response", error);
			return null;
		}
	}

	private async safeRequest(
		request: MetadataHandlerContext["request"],
		params: { url: URL; method: string },
	): Promise<RequestUrlResponse | null> {
		try {
			return await request({
				url: params.url.href,
				method: params.method,
			});
		} catch (error) {
			console.warn("[url-enricher] Failed to fetch Reddit metadata", error);
			return null;
		}
	}

	private createJsonUrl(url: URL): URL {
		const jsonUrl = new URL(url.pathname.replace(/\/?$/, "/") + ".json", `${url.protocol}//${url.host}`);
		if (url.search) {
			jsonUrl.search = url.search;
		}
		return jsonUrl;
	}
}
