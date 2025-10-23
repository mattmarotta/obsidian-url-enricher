import type { SyntaxNode } from "@lezer/common";

/**
 * Represents a matched URL in the document with its position and type
 */
export interface UrlMatch {
	url: string;
	start: number;
	end: number;
	type: 'wikilink' | 'markdown' | 'bare';
	linkText?: string; // For markdown links, the custom text if different from URL
}

/**
 * Check if a position is inside an inline code block or code fence
 */
export function isInCodeBlock(node: SyntaxNode, position: number): boolean {
	const contextNode = node;

	// Check for inline code
	if (contextNode.type.name === "InlineCode" || contextNode.parent?.type.name === "InlineCode") {
		return true;
	}

	// Check for code block
	if (contextNode.type.name === "CodeText" || contextNode.parent?.type.name === "FencedCode") {
		return true;
	}

	return false;
}

/**
 * Check if a URL position is inside a markdown link using text analysis
 * Live Preview doesn't provide full markdown structure in syntax tree,
 * so we need to check the actual text context
 */
export function isInMarkdownLink(text: string, urlStart: number, urlEnd: number, url: string): boolean {
	// Look backwards to find if there's a ]( before this URL
	const searchStart = Math.max(0, urlStart - 1000); // Look back up to 1000 chars
	const beforeText = text.slice(searchStart, urlStart);

	// Find the last occurrence of ]( before our URL
	const lastLinkStart = beforeText.lastIndexOf('](');

	if (lastLinkStart !== -1) {
		// Check if there's a closing ) after our URL without any [ in between
		const afterUrlPos = urlEnd;
		const searchEnd = Math.min(text.length, afterUrlPos + 100);
		const afterText = text.slice(afterUrlPos, searchEnd);

		// Find first ) after URL
		const nextParen = afterText.indexOf(')');

		if (nextParen !== -1) {
			// Check if there's no [ between ]( and )
			const potentialLinkText = beforeText.slice(lastLinkStart + 2) + url + afterText.slice(0, nextParen);

			// If no [ in this section, we're likely inside [text](url)
			if (!potentialLinkText.includes('[')) {
				return true;
			}
		}
	}

	// Also check for image syntax ![alt](url)
	const imageCheck = text.slice(Math.max(0, urlStart - 3), urlStart);
	if (imageCheck.endsWith('!(') || imageCheck.endsWith('](')) {
		const charBefore = text[Math.max(0, urlStart - 4)];
		if (charBefore === '!') {
			return true; // Skip images
		}
	}

	return false;
}

/**
 * Find all wikilink-formatted URLs in text: [[https://...]]
 */
export function* findWikilinkUrls(text: string): Generator<UrlMatch> {
	const wikilinkUrlRegex = /\[\[(https?:\/\/[^\]]+)\]\]/g;
	let match;

	while ((match = wikilinkUrlRegex.exec(text)) !== null) {
		const fullMatch = match[0]; // e.g., "[[https://example.com]]"
		const url = match[1]; // e.g., "https://example.com"
		const linkStart = match.index;
		const linkEnd = linkStart + fullMatch.length;

		yield {
			url,
			start: linkStart,
			end: linkEnd,
			type: 'wikilink'
		};
	}
}

/**
 * Find all markdown-formatted URLs in text: [text](url)
 */
export function* findMarkdownLinks(text: string): Generator<UrlMatch> {
	const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
	let match;

	while ((match = markdownLinkRegex.exec(text)) !== null) {
		const fullMatch = match[0]; // e.g., "[text](url)"
		const linkText = match[1]; // e.g., "text" or "url"
		const url = match[2]; // e.g., "https://example.com"
		const linkStart = match.index;
		const linkEnd = linkStart + fullMatch.length;

		// Skip if this is an image ![alt](url)
		if (linkStart > 0 && text[linkStart - 1] === '!') {
			continue;
		}

		yield {
			url,
			start: linkStart,
			end: linkEnd,
			type: 'markdown',
			linkText: linkText !== url ? linkText : undefined
		};
	}
}

/**
 * Find all bare URLs in text (not in markdown links or wikilinks)
 * Returns only properly bounded URLs (start of line or preceded by whitespace)
 */
export function* findBareUrls(text: string, processedRanges: Set<string>): Generator<UrlMatch> {
	const urlRegex = /https?:\/\/[^\s)\]]+/g;
	let match;

	while ((match = urlRegex.exec(text)) !== null) {
		const url = match[0];
		const urlStart = match.index;
		const urlEnd = urlStart + url.length;

		// Skip if this URL overlaps with any already-processed range
		let overlapsExisting = false;
		for (const existingKey of processedRanges) {
			const [existingStart, existingEnd] = existingKey.split('-').map(Number);
			// Check if ranges overlap
			if (urlStart < existingEnd && existingStart < urlEnd) {
				overlapsExisting = true;
				break;
			}
		}
		if (overlapsExisting) {
			continue;
		}

		// Only decorate URLs that are properly bounded (start of line, or preceded by whitespace)
		if (urlStart > 0) {
			const charBefore = text[urlStart - 1];
			if (charBefore && !/[\s\n\r\t]/.test(charBefore)) {
				continue; // Skip URLs not preceded by whitespace
			}
		}

		// Check if inside markdown link using text analysis
		if (isInMarkdownLink(text, urlStart, urlEnd, url)) {
			continue;
		}

		yield {
			url,
			start: urlStart,
			end: urlEnd,
			type: 'bare'
		};
	}
}

/**
 * Check if two ranges overlap
 */
export function rangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
	return start1 < end2 && start2 < end1;
}
