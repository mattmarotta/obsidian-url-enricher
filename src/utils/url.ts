const REDDIT_HOST_REGEX = /^(?:www\.|new\.|np\.)?reddit\.com$/i;

/**
 * Rewrite a URL to an equivalent host that serves scrapable metadata.
 *
 * www.reddit.com answers non-browser requests with an 8KB JavaScript
 * proof-of-work interstitial whose <title> is just "Reddit", so every Reddit
 * preview came out as a bare "Reddit". old.reddit.com serves the same content
 * with full Open Graph tags and no challenge.
 *
 * This only affects the URL we FETCH - the original URL is still what gets
 * cached, displayed, and opened on click.
 *
 * @param rawUrl - The URL as written in the document
 * @returns The URL to fetch metadata from (unchanged for non-rewritten hosts)
 */
export function rewriteUrlForFetch(rawUrl: string): string {
	let parsed: URL;
	try {
		parsed = new URL(rawUrl);
	} catch {
		return rawUrl;
	}

	if (REDDIT_HOST_REGEX.test(parsed.hostname)) {
		parsed.hostname = "old.reddit.com";
		return parsed.toString();
	}

	return rawUrl;
}
