const SINGLE_URL_REGEX = /^https?:\/\/[^\s]+$/i;
const WRAPPED_URL_REGEX = /^<\s*(https?:\/\/[^\s>]+)\s*>$/i;

export const URL_IN_TEXT_REGEX = /https?:\/\/[^\s<>\])"']+/gi;

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

export function extractSingleUrl(text: string): string | null {
	if (!text) {
		return null;
	}

	const trimmed = text.trim();
	if (!trimmed) {
		return null;
	}

	const wrappedMatch = trimmed.match(WRAPPED_URL_REGEX);
	if (wrappedMatch) {
		return wrappedMatch[1];
	}

	if (SINGLE_URL_REGEX.test(trimmed)) {
		return trimmed;
	}

	return null;
}

export function looksLikeUrl(text: string): boolean {
	return SINGLE_URL_REGEX.test(text.trim());
}

const WHITESPACE_ONLY_REGEX = /^\s*$/;

export interface UrlListEntry {
	url: string;
	start: number;
	end: number;
}

export function extractUrlList(text: string): UrlListEntry[] | null {
	if (typeof text !== "string") {
		return [];
	}

	const pattern = new RegExp(URL_IN_TEXT_REGEX.source, "gi");
	const entries: UrlListEntry[] = [];
	let cursor = 0;

	for (const match of text.matchAll(pattern)) {
		const matchIndex = match.index ?? 0;
		const url = match[0];

		if (matchIndex > 0) {
			const before = text[matchIndex - 1] ?? "";
			const after = text[matchIndex + url.length] ?? "";
			if (before === "(" && after === ")" && matchIndex >= 2 && text[matchIndex - 2] === "]") {
				continue;
			}
		}

		let segmentStart = matchIndex;
		let allowNonWhitespacePrefix = false;

		let searchIndex = matchIndex;
		while (searchIndex > cursor) {
			const candidate = text[searchIndex - 1];
			if (candidate === "<") {
				segmentStart = searchIndex - 1;
				break;
			}
			if (candidate === "[") {
				segmentStart = searchIndex - 1;
				allowNonWhitespacePrefix = true;
				break;
			}
			if (!/\s/.test(candidate)) {
				break;
			}
			searchIndex -= 1;
		}

		const leading = text.slice(cursor, segmentStart);
		if (!allowNonWhitespacePrefix && !WHITESPACE_ONLY_REGEX.test(leading)) {
			return null;
		}

		const urlEnd = matchIndex + url.length;
		let segmentEnd = urlEnd;

		let lookahead = segmentEnd;
		while (lookahead < text.length && /\s/.test(text[lookahead])) {
			lookahead += 1;
		}

		if (lookahead < text.length && text[lookahead] === ">") {
			segmentEnd = lookahead + 1;
		} else if (allowNonWhitespacePrefix) {
			let closeIndex = lookahead;
			while (closeIndex < text.length && text[closeIndex] !== ")") {
				if (text[closeIndex] === "\n") {
					break;
				}
				closeIndex += 1;
			}
			if (closeIndex < text.length && text[closeIndex] === ")") {
				segmentEnd = closeIndex + 1;
			}
		} else {
			segmentEnd = urlEnd;
		}

		entries.push({
			url,
			start: segmentStart,
			end: segmentEnd,
		});

		cursor = segmentEnd;
	}

	const trailing = text.slice(cursor);
	if (!WHITESPACE_ONLY_REGEX.test(trailing)) {
		return null;
	}

	return entries;
}
