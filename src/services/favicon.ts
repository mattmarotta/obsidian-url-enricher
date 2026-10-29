import { FAVICON_SIZE } from "../constants";

/**
 * Build the favicon URL for a page using Google's favicon service.
 *
 * The address depends only on the hostname, so it is computed on demand
 * rather than fetched, validated, or cached.
 *
 * @param pageUrl - The page whose site favicon is wanted
 * @returns The favicon URL, or null if the URL can't be parsed or has no hostname
 */
export function getFaviconUrl(pageUrl: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(pageUrl);
	} catch {
		return null;
	}

	if (!parsed.hostname) {
		return null;
	}

	const params = new URLSearchParams({
		domain: parsed.hostname,
		sz: FAVICON_SIZE,
	});
	return `https://www.google.com/s2/favicons?${params.toString()}`;
}
