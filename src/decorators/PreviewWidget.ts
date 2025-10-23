import { WidgetType } from "@codemirror/view";
import type { PreviewStyle, DisplayMode } from "../settings";
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
		span.className = "inline-url-preview-error-indicator";
		span.textContent = " ⚠️";

		// Different tooltip based on error type
		if (this.errorType.startsWith("network:")) {
			span.title = "Network error at URL. Cannot generate preview.";
		} else {
			span.title = "HTTP error (403/404). Disable warnings in settings.";
		}

		span.style.cssText = `
			font-size: 0.85em;
			opacity: 0.6;
			margin-left: 0.25em;
			cursor: default;
		`.replace(/\s+/g, ' ').trim();
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
 * Widget that displays a rich preview (bubble or card) for a URL
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
		private displayMode: DisplayMode,
		private maxLength: number,
		private siteName: string | null = null,
		private error: string | null = null
	) {
		super();
	}

	toDOM(): HTMLElement {
		// Create a wrapper container
		const wrapper = document.createElement("span");
		wrapper.style.display = "contents"; // Allows children to participate in parent's layout

		// Add line break for block display mode
		if (this.displayMode === "block") {
			const br = document.createElement("br");
			wrapper.appendChild(br);
		}

		const container = document.createElement("span");

		// Apply style classes
		if (this.previewStyle === "card") {
			container.className = "inline-url-preview inline-url-preview--card";
		} else {
			// Bubble style with display mode
			if (this.displayMode === "block") {
				container.className = "inline-url-preview inline-url-preview--bubble inline-url-preview--bubble-block";
			} else {
				container.className = "inline-url-preview inline-url-preview--bubble inline-url-preview--bubble-inline";
			}
		}

		if (this.isLoading) {
			container.className += " inline-url-preview--loading";
			container.textContent = "Loading...";
			wrapper.appendChild(container);
			return wrapper;
		}

		// Clean media URLs from description
		const cleanedDescription = this.description ? cleanMediaUrls(this.description) : this.description;

		// Make the preview bubble clickable
		container.style.cursor = "pointer";

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
			favicon.className = "inline-url-preview__favicon";
			favicon.alt = "";

			// For cards, wrap favicon and title in a header row
			if (this.previewStyle === "card") {
				const headerRow = document.createElement("div");
				headerRow.className = "inline-url-preview__header";
				headerRow.style.cssText = `
					display: flex;
					align-items: center;
					margin-bottom: 0.5em;
				`.replace(/\s+/g, ' ').trim();
				headerRow.appendChild(favicon);

				// Add title next to favicon for cards
				if (this.title) {
					const titleSpan = document.createElement("span");
					titleSpan.className = "inline-url-preview__title";
					titleSpan.textContent = this.title;
					titleSpan.style.cssText = `
						flex: 1;
						margin: 0;
					`.replace(/\s+/g, ' ').trim();
					headerRow.appendChild(titleSpan);
				}

				container.appendChild(headerRow);
			} else {
				// For bubbles, keep favicon inline
				container.appendChild(favicon);
			}
		}

		// Title and description
		const textContainer = document.createElement("span");
		textContainer.className = "inline-url-preview__text";

		// Check if this is Reddit content with special markers
		const isReddit = !!(cleanedDescription && cleanedDescription.includes("§REDDIT_CARD§"));

		if (this.previewStyle === "card") {
			this.renderCardContent(textContainer, cleanedDescription, isReddit);
		} else {
			this.renderBubbleContent(textContainer, cleanedDescription, isReddit);
		}

		container.appendChild(textContainer);

		// Add site name footer for card mode
		if (this.previewStyle === "card") {
			this.renderCardFooter(container);
		}

		wrapper.appendChild(container);
		return wrapper;
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
				postTitleDiv.className = "inline-url-preview__post-title";
				const enrichedTitle = enrichTextWithStyledElements(postTitle.trim());
				postTitleDiv.appendChild(enrichedTitle);
				postTitleDiv.style.cssText = `
					font-size: 1.05em;
					font-weight: 600;
					line-height: 1.35;
					color: var(--text-normal);
					margin-bottom: 0.4em;
				`.replace(/\s+/g, ' ').trim();
				textContainer.appendChild(postTitleDiv);
			}

			// Post content preview
			if (postContent) {
				const contentDiv = document.createElement("div");
				contentDiv.className = "inline-url-preview__description";
				const enrichedContent = enrichTextWithStyledElements(postContent.trim());
				contentDiv.appendChild(enrichedContent);
				textContainer.appendChild(contentDiv);
			}
		} else if (cleanedDescription) {
			// Standard card: description below title
			const descDiv = document.createElement("div");
			descDiv.className = "inline-url-preview__description";
			const enrichedDesc = enrichTextWithStyledElements(cleanedDescription);
			descDiv.appendChild(enrichedDesc);
			textContainer.appendChild(descDiv);
		}
	}

	/**
	 * Render content for bubble-style previews
	 */
	private renderBubbleContent(textContainer: HTMLElement, cleanedDescription: string | null, isReddit: boolean): void {
		if (isReddit && cleanedDescription) {
			// Reddit bubble: "r/Subreddit — Post Title"
			const parts = cleanedDescription.split("§REDDIT_CARD§");
			const titlePart = parts[1] ? parts[1].split("§REDDIT_CONTENT§")[0] : "";

			if (this.title) {
				const titleSpan = document.createElement("span");
				titleSpan.className = "inline-url-preview__title";
				titleSpan.textContent = this.title; // r/Subreddit
				textContainer.appendChild(titleSpan);
			}

			if (titlePart) {
				const separator = document.createElement("span");
				separator.className = "inline-url-preview__separator";
				separator.textContent = " — ";
				textContainer.appendChild(separator);

				const descSpan = document.createElement("span");
				descSpan.className = "inline-url-preview__description";
				const enrichedTitlePart = enrichTextWithStyledElements(titlePart.trim());
				descSpan.appendChild(enrichedTitlePart);
				textContainer.appendChild(descSpan);
			}
		} else {
			// Standard bubble format
			if (this.title) {
				const titleSpan = document.createElement("span");
				titleSpan.className = "inline-url-preview__title";
				titleSpan.textContent = this.title;
				textContainer.appendChild(titleSpan);

				if (cleanedDescription) {
					const separator = document.createElement("span");
					separator.className = "inline-url-preview__separator";
					separator.textContent = " — ";
					textContainer.appendChild(separator);

					const descSpan = document.createElement("span");
					descSpan.className = "inline-url-preview__description";
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
			} catch (e) {
				// If URL parsing fails, skip the footer
				siteName = null;
			}
		}

		if (siteName) {
			const footer = document.createElement("div");
			footer.className = "inline-url-preview__footer";
			footer.textContent = siteName.toUpperCase();
			footer.style.cssText = `
				font-size: 0.68em;
				font-weight: 500;
				color: var(--text-muted);
				text-transform: uppercase;
				letter-spacing: 0.1em;
				margin-top: 0.9em;
				padding-top: 0.8em;
				border-top: 1px solid var(--background-modifier-border);
				opacity: 0.45;
			`.replace(/\s+/g, ' ').trim();

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
			other.displayMode === this.displayMode &&
			other.siteName === this.siteName &&
			other.error === this.error
		);
	}

	ignoreEvent(event: Event): boolean {
		// Ignore mouse events to prevent CodeMirror from handling clicks on the widget
		return event.type === "mousedown" || event.type === "click";
	}
}
