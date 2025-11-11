import { WidgetType } from "@codemirror/view";
import type { PreviewStyle, PreviewColorMode } from "../settings";
import { enrichTextWithStyledElements, cleanMediaUrls } from "./MetadataEnricher";

/**
 * Widget that displays an error indicator next to a URL when metadata fetching fails
 */
export class ErrorIndicatorWidget extends WidgetType {
	constructor(private errorType: string) {
		super();
	}

	toDOM(): HTMLElement {
		const span = document.createElement("span");
		span.className = "url-preview-error-indicator";
		span.textContent = " ⚠️";

		// Different tooltip based on error type
		if (this.errorType.startsWith("network:")) {
			span.title = "Network error at URL. Cannot generate preview.";
		} else {
			span.title = "HTTP error (403/404). Disable warnings in settings.";
		}

		return span;
	}

	eq(other: ErrorIndicatorWidget): boolean {
		return other.errorType === this.errorType;
	}

	ignoreEvent(): boolean {
		return true;
	}
}

/**
 * Widget that displays a rich preview (inline or card) for a URL
 * Includes title, description, favicon, and site name
 */
export class UrlPreviewWidget extends WidgetType {
	constructor(
		private url: string,
		private title: string | null,
		private description: string | null,
		private faviconUrl: string | null,
		private isLoading: boolean,
		private previewStyle: PreviewStyle,
		private maxLength: number,
		private siteName: string | null = null,
		private error: string | null = null,
		private inlineColorMode: PreviewColorMode = 'subtle',
		private cardColorMode: PreviewColorMode = 'subtle'
	) {
		super();
	}

	toDOM(): HTMLElement {
		const container = document.createElement("span");

		// Apply style classes and color mode classes
		if (this.previewStyle === "card") {
			container.className = `url-preview url-preview--card url-preview--${this.cardColorMode}`;
		} else {
			// Inline style - always flows inline with text
			container.className = `url-preview url-preview--inline url-preview--${this.inlineColorMode}`;
		}

		if (this.isLoading) {
			container.className += " url-preview--loading";
			container.textContent = "Loading...";
			return container;
		}

		// Clean media URLs from description
		const cleanedDescription = this.description ? cleanMediaUrls(this.description) : this.description;

		// Prevent mousedown from moving cursor into the URL
		container.onmousedown = (e) => {
			e.preventDefault();
			e.stopPropagation();
		};

		// Handle click to open URL
		container.onclick = (e) => {
			e.preventDefault();
			e.stopPropagation();
			window.open(this.url, "_blank");
		};

		// Favicon
		if (this.faviconUrl) {
			const favicon = document.createElement("img");
			favicon.src = this.faviconUrl;
			favicon.className = "url-preview__favicon";
			favicon.alt = "";

			// For cards, wrap favicon and title in a header row
			if (this.previewStyle === "card") {
				const headerRow = document.createElement("div");
				headerRow.className = "url-preview__header";
				headerRow.appendChild(favicon);

				// Add title next to favicon for cards
				if (this.title) {
					const titleSpan = document.createElement("span");
					titleSpan.className = "url-preview__title";
					const enrichedTitle = enrichTextWithStyledElements(this.title);
					titleSpan.appendChild(enrichedTitle);
					headerRow.appendChild(titleSpan);
				}

				container.appendChild(headerRow);
			} else {
				// For inline style, keep favicon inline
				container.appendChild(favicon);
			}
		}

		// Title and description
		const textContainer = document.createElement("span");
		textContainer.className = "url-preview__text";

		// Check if this is Reddit content with special markers
		const isReddit = !!(cleanedDescription && cleanedDescription.includes("§REDDIT_CARD§"));

		if (this.previewStyle === "card") {
			this.renderCardContent(textContainer, cleanedDescription, isReddit);
		} else {
			this.renderInlineContent(textContainer, cleanedDescription, isReddit);
		}

		container.appendChild(textContainer);

		// Add site name footer for card mode
		if (this.previewStyle === "card") {
			this.renderCardFooter(container);
		}

		return container;
	}

	/**
	 * Render content for card-style previews
	 */
	private renderCardContent(textContainer: HTMLElement, cleanedDescription: string | null, isReddit: boolean): void {
		if (isReddit && cleanedDescription) {
			// Reddit card: parse structured format
			const parts = cleanedDescription.split("§REDDIT_CARD§");
			const titleAndContent = parts[1] || "";
			const [postTitle, ...contentParts] = titleAndContent.split("§REDDIT_CONTENT§");
			let postContent = contentParts.join("§REDDIT_CONTENT§");

			// Calculate total length and truncate if needed
			const totalLength = (this.title?.length || 0) + postTitle.length + postContent.length;
			if (totalLength > this.maxLength) {
				const usedLength = (this.title?.length || 0) + postTitle.length + 6; // +6 for separators
				const remainingLength = this.maxLength - usedLength;
				if (remainingLength > 20) {
					postContent = postContent.substring(0, remainingLength) + "...";
				} else {
					postContent = "";
				}
			}

			// Post title (below subreddit/favicon)
			if (postTitle) {
				const postTitleDiv = document.createElement("div");
				postTitleDiv.className = "url-preview__post-title";
				const enrichedTitle = enrichTextWithStyledElements(postTitle.trim());
				postTitleDiv.appendChild(enrichedTitle);
				textContainer.appendChild(postTitleDiv);
			}

			// Post content preview
			if (postContent) {
				const contentDiv = document.createElement("div");
				contentDiv.className = "url-preview__description";
				const enrichedContent = enrichTextWithStyledElements(postContent.trim());
				contentDiv.appendChild(enrichedContent);
				textContainer.appendChild(contentDiv);
			}
		} else if (cleanedDescription) {
			// Standard card: description below title
			const descDiv = document.createElement("div");
			descDiv.className = "url-preview__description";
			const enrichedDesc = enrichTextWithStyledElements(cleanedDescription);
			descDiv.appendChild(enrichedDesc);
			textContainer.appendChild(descDiv);
		}
	}

	/**
	 * Render content for inline-style previews
	 */
	private renderInlineContent(textContainer: HTMLElement, cleanedDescription: string | null, isReddit: boolean): void {
		if (isReddit && cleanedDescription) {
			// Reddit inline: "r/Subreddit — Post Title"
			const parts = cleanedDescription.split("§REDDIT_CARD§");
			const titlePart = parts[1] ? parts[1].split("§REDDIT_CONTENT§")[0] : "";

			if (this.title) {
				const titleSpan = document.createElement("span");
				titleSpan.className = "url-preview__title";
				const enrichedTitle = enrichTextWithStyledElements(this.title); // r/Subreddit
				titleSpan.appendChild(enrichedTitle);
				textContainer.appendChild(titleSpan);
			}

			if (titlePart) {
				const separator = document.createElement("span");
				separator.className = "url-preview__separator";
				separator.textContent = " — ";
				textContainer.appendChild(separator);

				const descSpan = document.createElement("span");
				descSpan.className = "url-preview__description";
				const enrichedTitlePart = enrichTextWithStyledElements(titlePart.trim());
				descSpan.appendChild(enrichedTitlePart);
				textContainer.appendChild(descSpan);
			}
		} else {
			// Standard inline format
			if (this.title) {
				const titleSpan = document.createElement("span");
				titleSpan.className = "url-preview__title";
				const enrichedTitle = enrichTextWithStyledElements(this.title);
				titleSpan.appendChild(enrichedTitle);
				textContainer.appendChild(titleSpan);

				if (cleanedDescription) {
					const separator = document.createElement("span");
					separator.className = "url-preview__separator";
					separator.textContent = " — ";
					textContainer.appendChild(separator);

					const descSpan = document.createElement("span");
					descSpan.className = "url-preview__description";
					const enrichedDesc = enrichTextWithStyledElements(cleanedDescription);
					descSpan.appendChild(enrichedDesc);
					textContainer.appendChild(descSpan);
				}
			}
		}
	}

	/**
	 * Render site name footer for card previews
	 */
	private renderCardFooter(container: HTMLElement): void {
		let siteName = this.siteName; // Try metadata first

		// Fallback to extracting from URL if metadata doesn't provide site name
		if (!siteName) {
			try {
				const parsed = new URL(this.url);
				siteName = parsed.hostname;

				// Remove www. prefix if present
				if (siteName.startsWith('www.')) {
					siteName = siteName.substring(4);
				}

				// Extract the main domain name (before the TLD)
				const parts = siteName.split('.');
				if (parts.length >= 2) {
					siteName = parts[0]; // Take first part (main domain)
				}
			} catch {
				// If URL parsing fails, skip the footer
				siteName = null;
			}
		}

		if (siteName) {
			const footer = document.createElement("div");
			footer.className = "url-preview__footer";
			footer.textContent = siteName.toUpperCase();
			container.appendChild(footer);
		}
	}

	eq(other: UrlPreviewWidget): boolean {
		return (
			other.url === this.url &&
			other.title === this.title &&
			other.description === this.description &&
			other.faviconUrl === this.faviconUrl &&
			other.isLoading === this.isLoading &&
			other.previewStyle === this.previewStyle &&
			other.siteName === this.siteName &&
			other.error === this.error &&
			other.inlineColorMode === this.inlineColorMode &&
			other.cardColorMode === this.cardColorMode
		);
	}

	ignoreEvent(event: Event): boolean {
		// Ignore mouse events to prevent CodeMirror from handling clicks on the widget
		return event.type === "mousedown" || event.type === "click";
	}
}
