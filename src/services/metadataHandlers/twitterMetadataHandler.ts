import type { RequestUrlResponse } from "obsidian";
import type { MetadataHandler, MetadataHandlerContext } from "./metadataHandler";

interface TwitterOEmbedResponse {
	url?: string;
	author_name?: string;
	author_url?: string;
	html?: string;
	type?: string;
	provider_name?: string;
}

export class TwitterMetadataHandler implements MetadataHandler {
	matches({ url }: MetadataHandlerContext): boolean {
		return /(^|\.)(?:twitter|x)\.com$/i.test(url.hostname);
	}

	async enrich(context: MetadataHandlerContext): Promise<void> {
		const { metadata, url } = context;

		const username = this.extractUsername(url);
		if (!username) {
			return;
		}

		// Always set title to @username for all Twitter/X URLs
		metadata.title = `@${username}`;

		// Try to fetch tweet content if it's a status URL
		if (this.isTweetUrl(url)) {
			const tweetData = await this.fetchTweetData(context);
			if (tweetData?.text) {
				const sanitized = context.sanitizeText(tweetData.text);
				if (sanitized) {
					metadata.description = sanitized;
				}
			}
		}

		// Clear generic descriptions for all Twitter URLs
		if (metadata.description && this.isGenericDescription(metadata.description)) {
			metadata.description = null;
		}
	}

	private extractUsername(url: URL): string | null {
		const pathParts = url.pathname.split("/").filter(Boolean);
		return pathParts[0] || null;
	}

	private isTweetUrl(url: URL): boolean {
		return /\/status\/\d+/.test(url.pathname);
	}

	private async fetchTweetData(context: MetadataHandlerContext): Promise<{ text: string } | null> {
		const { originalUrl, request } = context;

		try {
			const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(originalUrl)}`;
			const response = await this.safeRequest(request, oembedUrl);

			if (!response || response.status !== 200) {
				return null;
			}

			const data = JSON.parse(response.text) as TwitterOEmbedResponse;

			// Parse tweet text from HTML field
			const text = this.extractTweetTextFromHtml(data.html);
			return text ? { text } : null;
		} catch {
			return null;
		}
	}

	private async safeRequest(
		request: MetadataHandlerContext["request"],
		url: string,
	): Promise<RequestUrlResponse | null> {
		try {
			return await request({
				url,
				method: "GET",
			});
		} catch {
			return null;
		}
	}

	private extractTweetTextFromHtml(html: string | undefined): string | null {
		if (!html) {
			return null;
		}

		// Extract text from <p> tag in blockquote
		// Example: <blockquote class="twitter-tweet"><p lang="en" dir="ltr">Tweet text here</p>...
		const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
		if (!match) {
			return null;
		}

		// Strip HTML tags, decode entities, clean up
		let text = match[1];

		// Remove HTML tags
		text = text.replace(/<[^>]+>/g, "");

		// Decode common HTML entities
		text = text
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&amp;/g, "&")
			.replace(/&quot;/g, '"')
			.replace(/&#039;/g, "'")
			.replace(/&#39;/g, "'")
			.replace(/&nbsp;/g, " ");

		// Clean up whitespace
		text = text.replace(/\s+/g, " ").trim();

		return text.length > 0 ? text : null;
	}

	private isGenericDescription(desc: string): boolean {
		const normalized = desc.trim().toLowerCase();
		return (
			normalized.includes("see tweets about") ||
			normalized.includes("see what") ||
			normalized.includes("x (formerly twitter)") ||
			normalized.includes("formerly twitter") ||
			normalized === "x.com" ||
			normalized === "twitter.com" ||
			normalized === "" ||
			normalized.length < 10
		);
	}
}
