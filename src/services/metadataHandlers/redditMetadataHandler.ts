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

		const postUrl = await this.resolveShareUrl(context);
		if (!postUrl) {
			return;
		}

		const postContext = { ...context, url: postUrl };
		const extraMetadata =
			(await this.fetchRedditMetadata(postContext)) ??
			(await this.fetchRedditOEmbedMetadata(postContext));
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
		const isHeartOfInternetTitle =
			/^reddit\s*[-–—]\s*the heart of the internet$/.test(normalized);
		const isLoginPageTitle =
			/^welcome to reddit\s*[-–—]\s*log in or sign up(?:\.{3}|…)?$/.test(normalized);

		return (
			normalized === "reddit.com" ||
			normalized === "reddit" ||
			normalized === "welcome to reddit" ||
			isHeartOfInternetTitle ||
			isLoginPageTitle
		);
	}

	/**
	 * Share links (/r/<sub>/s/<id>) redirect to the full /comments/ URL, but
	 * requestUrl doesn't expose the final URL and neither JSON nor oEmbed accept
	 * the short form. Fetch the link and pull the post path out of the page it
	 * lands on (canonical link, or the bot-challenge form's action).
	 */
	private async resolveShareUrl(context: MetadataHandlerContext): Promise<URL | null> {
		const { url, request } = context;
		const shareMatch = url.pathname.match(/^\/r\/(\w+)\/s\/\w+\/?$/i);
		if (!shareMatch) {
			return url;
		}

		const subreddit = shareMatch[1];
		const response = await this.safeRequest(request, {
			url: new URL(url.pathname, "https://www.reddit.com"),
			method: "GET",
		});
		if (!response?.text) {
			return null;
		}

		const postPathRegex = new RegExp(`/r/${subreddit}/comments/[a-z0-9]+/(?:[^/"'?#<>\\s]+/)?`, "i");
		const postPath = response.text.match(postPathRegex)?.[0];
		return postPath ? new URL(postPath, "https://www.reddit.com") : null;
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
			if (!rawTitle) {
				return null;
			}
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
		} catch {
			return null;
		}
	}

	private async fetchRedditOEmbedMetadata(context: MetadataHandlerContext): Promise<RedditMetadata | null> {
		const { url, request } = context;
		if (!/\/comments\//.test(url.pathname)) {
			return null;
		}

		const oEmbedUrl = new URL("https://www.reddit.com/oembed");
		oEmbedUrl.searchParams.set("url", url.href);

		const response = await this.safeRequest(request, {
			url: oEmbedUrl,
			method: "GET",
		});
		if (!response || response.status >= 400) {
			return null;
		}

		try {
			const payload = JSON.parse(response.text) as { title?: unknown };
			const rawTitle = typeof payload?.title === "string" ? payload.title.trim() : "";
			if (!rawTitle) {
				return null;
			}

			const subredditName = url.pathname.match(/^\/r\/([^/]+)\/comments\//i)?.[1];
			if (subredditName) {
				return {
					title: `r/${subredditName}`,
					description: `§REDDIT_CARD§${rawTitle}`,
				};
			}

			return { title: rawTitle };
		} catch {
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
		} catch {
			return null;
		}
	}

	private createJsonUrl(url: URL): URL {
		// Try old.reddit.com first for richer JSON post metadata.
		// If JSON is unavailable, the caller falls back to Reddit's oEmbed endpoint.
		const jsonUrl = new URL(url.pathname.replace(/\/?$/, "/") + ".json", `${url.protocol}//old.reddit.com`);
		if (url.search) {
			jsonUrl.search = url.search;
		}
		return jsonUrl;
	}
}
