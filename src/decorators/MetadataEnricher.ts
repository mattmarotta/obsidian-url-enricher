/**
 * MetadataEnricher - Functions for enhancing and cleaning metadata text
 */

const emojiRegex = (() => {
	try {
		return new RegExp("\\p{Extended_Pictographic}", "gu");
	} catch {
		// Basic fallback covering common emoji ranges
		return /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{2600}-\u{27BF}]/gu;
	}
})();

/**
 * Remove emoji characters from text
 */
export function stripEmoji(value: string): string {
	return value.replace(emojiRegex, "").replace(/\s+/g, " ").trim();
}

/**
 * Remove common media/shortened URLs from text to clean up descriptions
 * Cleans patterns like pic.twitter.com, t.co, imgur.com, reddit media, etc.
 */
export function cleanMediaUrls(text: string): string {
	if (!text) return text;

	// Pattern to match common media and shortened URLs
	const mediaUrlPatterns = [
		/pic\.twitter\.com\/\w+/gi,
		/t\.co\/\w+/gi,
		/i\.imgur\.com\/\w+\.\w+/gi,
		/imgur\.com\/\w+/gi,
		/i\.redd\.it\/\w+\.\w+/gi,
		/v\.redd\.it\/\w+/gi,
		/gfycat\.com\/\w+/gi,
	];

	let cleaned = text;
	for (const pattern of mediaUrlPatterns) {
		cleaned = cleaned.replace(pattern, '');
	}

	// Clean up extra whitespace left after URL removal
	cleaned = cleaned.replace(/\s+/g, ' ').trim();

	return cleaned;
}

/**
 * Enrich text by wrapping hashtags and @mentions in styled spans (non-clickable)
 * Returns an HTML element with styled content
 */
export function enrichTextWithStyledElements(text: string): HTMLElement {
	const container = document.createElement('span');

	// Pattern to match hashtags (#word) and mentions (@word)
	// Matches word characters, numbers, and underscores
	const pattern = /(#\w+)|(@\w+)/g;

	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(text)) !== null) {
		// Add text before the match
		if (match.index > lastIndex) {
			container.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
		}

		// Create styled span for hashtag or mention
		const span = document.createElement('span');
		const matchedText = match[0];

		if (matchedText.startsWith('#')) {
			span.className = 'url-preview-hashtag';
		} else {
			span.className = 'url-preview-mention';
		}

		span.textContent = matchedText;
		container.appendChild(span);

		lastIndex = pattern.lastIndex;
	}

	// Add remaining text after last match
	if (lastIndex < text.length) {
		container.appendChild(document.createTextNode(text.substring(lastIndex)));
	}

	return container;
}
