import type { ParsedMetadata } from "./HtmlParser";

/**
 * MetadataValidator - Detects soft 404s and validates metadata quality
 */
export class MetadataValidator {
	/**
	 * Detects "soft 404s" - pages that return 200 OK but show error content
	 * Common patterns:
	 * - Reddit: "page not found", "this community doesn't exist"
	 * - YouTube: "video unavailable", "this video isn't available"
	 * - Generic: "404", "not found", "page not found", etc.
	 */
	isSoft404(html: string, metadata: ParsedMetadata, url: string): boolean {
		const lowerHtml = html.toLowerCase();
		const title = (metadata.title || "").toLowerCase();
		const description = (metadata.description || "").toLowerCase();

		// Reddit-specific patterns
		if (url.includes("reddit.com")) {
			if (title.includes("page not found") ||
				title.includes("this community doesn't exist") ||
				description.includes("page not found") ||
				lowerHtml.includes("sorry, nobody on reddit goes by that name")) {
				return true;
			}
		}

		// YouTube-specific patterns
		if (url.includes("youtube.com") || url.includes("youtu.be")) {
			if (title.includes("video unavailable") ||
				description.includes("video isn't available") ||
				description.includes("video has been removed") ||
				lowerHtml.includes("this video isn't available")) {
				return true;
			}
		}

		// Generic patterns - only check title to avoid false positives
		// Must be very specific to avoid catching legitimate pages
		const titleErrorPatterns = [
			"404",
			"not found",
			"page not found",
			"404 error"
		];

		// Only flag as error if title EXACTLY matches or STARTS WITH these patterns
		for (const pattern of titleErrorPatterns) {
			if (title === pattern ||
				title.startsWith(pattern + " ") ||
				title.startsWith(pattern + "|") ||
				title.startsWith(pattern + "-") ||
				title.startsWith(pattern + ":")) {
				return true;
			}
		}

		return false;
	}
}
