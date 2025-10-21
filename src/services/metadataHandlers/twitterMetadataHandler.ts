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

		// Only enrich if title is generic
		if (!this.isGenericTitle(metadata.title)) {
			return;
		}

		const username = this.extractUsername(url);
		if (!username) {
			return;
		}

		// Set title to @username
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
		// For profile URLs, leave description as-is (empty or from existing metadata)
	}

	private isGenericTitle(title: string | null | undefined): boolean {
		if (!title) {
			return true;
		}

		const normalized = title.trim().toLowerCase();
		return (
			normalized === "x.com" ||
			normalized === "twitter.com" ||
			normalized === "x" ||
			normalized === "twitter" ||
			normalized.includes("x (formerly twitter)") ||
			normalized.includes("on x") ||
			normalized.includes("on twitter")
		);
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
		} catch (error) {
			console.warn("[inline-link-preview] Failed to fetch Twitter oEmbed data", error);
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
		} catch (error) {
			console.warn("[inline-link-preview] Twitter oEmbed request failed", error);
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
}
