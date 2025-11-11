import type { MetadataHandler, MetadataHandlerContext } from "./metadataHandler";

/**
 * LinkedIn Metadata Handler
 *
 * Cleans up LinkedIn's poorly-structured titles that put hashtags first.
 *
 * Example transformation:
 * Before: "#personalbranding #careerbranding | Hina Arora | 17 comments — We are using..."
 * After: "Hina Arora — We are using..."
 *
 * Supports different LinkedIn URL types:
 * - Posts: /posts/username_activity-123456
 * - Feed posts: /feed/update/urn:li:activity:123456
 * - Articles: /pulse/article-slug
 * - Company pages: /company/company-name
 * - Profile pages: /in/username
 */
export class LinkedInMetadataHandler implements MetadataHandler {
	matches({ url }: MetadataHandlerContext): boolean {
		return /(^|\.)linkedin\.com$/i.test(url.hostname);
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- Method must be async to match MetadataHandler interface
	async enrich(context: MetadataHandlerContext): Promise<void> {
		const { metadata } = context;

		// Only process if we have a title to clean
		if (!metadata.title) {
			return;
		}

		const cleanedTitle = this.cleanTitle(metadata.title);
		if (cleanedTitle && cleanedTitle !== metadata.title) {
			metadata.title = cleanedTitle;
		}

		// Set site name if not already set
		if (!metadata.siteName) {
			metadata.siteName = "LinkedIn";
		}
	}

	/**
	 * Clean LinkedIn title by removing hashtags and extracting author + content
	 *
	 * LinkedIn title structure: "hashtags | author | comments — content"
	 * Goal: "author — content"
	 *
	 * Rules:
	 * 1. Remove leading hashtag block
	 * 2. Extract author name (between pipes)
	 * 3. Remove comment counts ("17 comments")
	 * 4. Extract content preview (after —)
	 * 5. Only keep hashtags that appear naturally in content
	 */
	private cleanTitle(rawTitle: string): string {
		const original = rawTitle.trim();
		if (!original) {
			return original;
		}

		// Split by | (pipe) separator
		const parts = original.split("|").map(p => p.trim());

		let author: string | null = null;
		let content: string | null = null;

		// Case 1: Multiple pipe-separated parts
		if (parts.length >= 2) {
			// First part is usually hashtags - skip it if it starts with #
			let startIndex = 0;
			if (parts[0].startsWith("#")) {
				startIndex = 1;
			}

			// Extract author from next non-empty, non-hashtag part
			for (let i = startIndex; i < parts.length; i++) {
				const part = parts[i];
				if (!part.startsWith("#") && part && !this.isCommentCount(part)) {
					// Check if this part contains the content separator —
					const dashIndex = part.indexOf("—");
					if (dashIndex !== -1) {
						// Author might be before —, content after
						const beforeDash = part.substring(0, dashIndex).trim();
						const afterDash = part.substring(dashIndex + 1).trim();

						if (beforeDash && !this.isCommentCount(beforeDash)) {
							author = beforeDash;
						}
						if (afterDash) {
							content = afterDash;
						}
						break;
					} else if (!author) {
						author = part;
					}
				}
			}

			// Look for content after — in any part
			if (!content) {
				for (const part of parts) {
					const dashIndex = part.indexOf("—");
					if (dashIndex !== -1) {
						const afterDash = part.substring(dashIndex + 1).trim();
						if (afterDash) {
							content = afterDash;
							break;
						}
					}
				}
			}
		}

		// Case 2: Single part with —
		if (!author && !content) {
			const dashIndex = original.indexOf("—");
			if (dashIndex !== -1) {
				const beforeDash = original.substring(0, dashIndex).trim();
				const afterDash = original.substring(dashIndex + 1).trim();

				// Remove hashtags from before —
				const cleanedBefore = this.removeLeadingHashtags(beforeDash);
				if (cleanedBefore) {
					author = cleanedBefore;
				}
				if (afterDash) {
					content = afterDash;
				}
			}
		}

		// Case 3: No clear structure, just remove leading hashtags
		if (!author && !content) {
			const cleaned = this.removeLeadingHashtags(original);
			return cleaned || original;
		}

		// Construct cleaned title
		if (author && content) {
			return `${author} — ${content}`;
		} else if (content) {
			return content;
		} else if (author) {
			return author;
		}

		// Fallback: return original if we couldn't clean it
		return original;
	}

	/**
	 * Remove leading hashtags from text
	 * Example: "#tag1 #tag2 Some text" → "Some text"
	 */
	private removeLeadingHashtags(text: string): string {
		const trimmed = text.trim();

		// Remove all leading hashtags (with or without spaces between them)
		const cleaned = trimmed.replace(/^(#\w+\s*)+/, '').trim();

		return cleaned;
	}

	/**
	 * Check if text looks like a comment count
	 * Examples: "17 comments", "1 comment", "123 comments"
	 */
	private isCommentCount(text: string): boolean {
		return /^\d+\s+comments?$/i.test(text.trim());
	}
}
