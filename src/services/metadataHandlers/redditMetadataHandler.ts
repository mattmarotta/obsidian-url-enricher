import type { RequestUrlResponse } from "obsidian";
import type { MetadataHandler, MetadataHandlerContext } from "./metadataHandler";

const REDDIT_HOST_REGEX = /(^|\.)reddit\.com$/i;
const POST_PATH_REGEX = /^\/(?:r|u|user)\/[^/]+\/comments\/[a-z0-9]+/i;
const SHARE_PATH_REGEX = /^\/r\/(\w+)\/s\/\w+\/?$/i;
const SUBREDDIT_PATH_REGEX = /^\/r\/([^/]+)/i;
const USER_PATH_REGEX = /^\/(?:u|user)\/([^/]+)/i;

/**
 * Reddit pages can't be scraped: old.reddit.com redirects to a login page and
 * www.reddit.com serves a bot challenge. So the plugin never fetches the page
 * itself. Posts get their title from Reddit's oEmbed API, the one public
 * endpoint that still answers; every other Reddit link is labeled from its URL.
 */
export class RedditMetadataHandler implements MetadataHandler {
	matches({ url }: MetadataHandlerContext): boolean {
		return REDDIT_HOST_REGEX.test(url.hostname);
	}

	replacesPageFetch(url: URL): boolean {
		return REDDIT_HOST_REGEX.test(url.hostname);
	}

	async enrich(context: MetadataHandlerContext): Promise<void> {
		const { metadata } = context;
		metadata.title = this.labelFromUrl(context.url);
		metadata.description = null;

		const postUrl = await this.resolvePostUrl(context);
		if (!postUrl) {
			return;
		}

		// A share link resolves to a post, so label it from the post's URL
		const label = this.labelFromUrl(postUrl);
		const title = context.sanitizeText(await this.fetchOEmbedTitle(context, postUrl));
		if (title) {
			metadata.context = label;
			metadata.title = title;
		} else {
			metadata.title = label;
		}
	}

	/** "r/learnpython", "u/spez", or "Reddit" for anything else. */
	private labelFromUrl(url: URL): string {
		const subreddit = url.pathname.match(SUBREDDIT_PATH_REGEX)?.[1];
		if (subreddit) {
			return `r/${subreddit}`;
		}
		const user = url.pathname.match(USER_PATH_REGEX)?.[1];
		if (user) {
			return `u/${user}`;
		}
		return "Reddit";
	}

	/**
	 * The post URL for a link, or null if the link isn't a post.
	 * Share links (/r/<sub>/s/<id>) redirect to the post, but requestUrl doesn't
	 * expose the final URL and oEmbed rejects the short form, so the post path
	 * is read from the page the redirect lands on (the bot-challenge page
	 * still includes it).
	 */
	private async resolvePostUrl(context: MetadataHandlerContext): Promise<URL | null> {
		const { url } = context;
		if (POST_PATH_REGEX.test(url.pathname)) {
			return new URL(url.pathname, "https://www.reddit.com");
		}

		const subreddit = url.pathname.match(SHARE_PATH_REGEX)?.[1];
		if (!subreddit) {
			return null;
		}

		const response = await this.safeRequest(context, new URL(url.pathname, "https://www.reddit.com"));
		if (!response?.text) {
			return null;
		}

		const postPathRegex = new RegExp(`/r/${subreddit}/comments/[a-z0-9]+/(?:[^/"'?#<>\\s]+/)?`, "i");
		const postPath = response.text.match(postPathRegex)?.[0];
		return postPath ? new URL(postPath, "https://www.reddit.com") : null;
	}

	private async fetchOEmbedTitle(context: MetadataHandlerContext, postUrl: URL): Promise<string | null> {
		const oEmbedUrl = new URL("https://www.reddit.com/oembed");
		oEmbedUrl.searchParams.set("url", postUrl.href);

		const response = await this.safeRequest(context, oEmbedUrl);
		if (!response || response.status >= 400) {
			return null;
		}

		try {
			const payload = JSON.parse(response.text) as { title?: unknown };
			const title = typeof payload?.title === "string" ? payload.title.trim() : "";
			return title || null;
		} catch {
			return null;
		}
	}

	private async safeRequest(context: MetadataHandlerContext, url: URL): Promise<RequestUrlResponse | null> {
		try {
			return await context.request({ url: url.href, method: "GET" });
		} catch {
			return null;
		}
	}
}
