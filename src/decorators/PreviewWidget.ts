import { WidgetType } from "@codemirror/view";
import type { PreviewStyle, PreviewColorMode } from "../settings";
import { enrichTextWithStyledElements } from "./MetadataEnricher";

/**
 * Widget that displays an error indicator next to a URL when metadata fetching fails
 */
export class ErrorIndicatorWidget extends WidgetType {
	constructor(private errorType: string) {
		super();
	}

	toDOM(): HTMLElement {
		const span = createSpan();
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
 * Everything a preview widget renders. Text fields arrive already sanitized
 * and truncated by DecorationBuilder; the widget only lays them out.
 */
export interface UrlPreviewWidgetOptions {
	readonly url: string;
	/** Short label leading the preview, e.g. "r/ObsidianMD" */
	readonly context?: string | null;
	readonly title: string | null;
	readonly description: string | null;
	readonly faviconUrl: string | null;
	readonly isLoading: boolean;
	readonly previewStyle: PreviewStyle;
	readonly siteName?: string | null;
	readonly error?: string | null;
	readonly inlineColorMode?: PreviewColorMode;
	readonly cardColorMode?: PreviewColorMode;
}

type ResolvedWidgetOptions = Readonly<Required<UrlPreviewWidgetOptions>>;

/**
 * Widget that displays a rich preview (inline or card) for a URL
 * Includes context, title, description, favicon, and site name
 */
export class UrlPreviewWidget extends WidgetType {
	private readonly options: ResolvedWidgetOptions;

	constructor(options: UrlPreviewWidgetOptions) {
		super();
		this.options = {
			...options,
			context: options.context ?? null,
			siteName: options.siteName ?? null,
			error: options.error ?? null,
			inlineColorMode: options.inlineColorMode ?? "subtle",
			cardColorMode: options.cardColorMode ?? "subtle",
		};
	}

	toDOM(): HTMLElement {
		const { url, context, title, faviconUrl, isLoading, previewStyle, inlineColorMode, cardColorMode } = this.options;
		const container = createSpan();

		// Apply style classes and color mode classes
		if (previewStyle === "card") {
			container.className = `url-preview url-preview--card url-preview--${cardColorMode}`;
		} else {
			// Inline style - always flows inline with text
			container.className = `url-preview url-preview--inline url-preview--${inlineColorMode}`;
		}

		if (isLoading) {
			container.className += " url-preview--loading";
			container.textContent = "Loading...";
			return container;
		}

		// Prevent mousedown from moving cursor into the URL
		container.onmousedown = (e) => {
			e.preventDefault();
			e.stopPropagation();
		};

		// Handle click to open URL
		container.onclick = (e) => {
			e.preventDefault();
			e.stopPropagation();
			window.open(url, "_blank");
		};

		// Favicon
		let favicon: HTMLImageElement | null = null;
		if (faviconUrl) {
			favicon = createEl("img");
			favicon.src = faviconUrl;
			favicon.className = "url-preview__favicon";
			favicon.alt = "";
		}

		if (previewStyle === "card") {
			// Cards always get a header row carrying the context (or title), with
			// the favicon beside it when there is one. Building this only when a
			// favicon existed used to drop the title entirely for favicon-less cards.
			const headerText = context ?? title;
			if (favicon || headerText) {
				const headerRow = createDiv();
				headerRow.className = "url-preview__header";

				if (favicon) {
					headerRow.appendChild(favicon);
				}

				if (headerText) {
					headerRow.appendChild(this.createTextSpan("url-preview__title", headerText));
				}

				container.appendChild(headerRow);
			}
		} else if (favicon) {
			// For inline style, keep favicon inline
			container.appendChild(favicon);
		}

		// Title and description
		const textContainer = createSpan();
		textContainer.className = "url-preview__text";

		if (previewStyle === "card") {
			this.renderCardContent(textContainer);
		} else {
			this.renderInlineContent(textContainer);
		}

		container.appendChild(textContainer);

		// Add site name footer for card mode
		if (previewStyle === "card") {
			this.renderCardFooter(container);
		}

		return container;
	}

	private createTextSpan(className: string, text: string): HTMLElement {
		const span = createSpan();
		span.className = className;
		span.appendChild(enrichTextWithStyledElements(text));
		return span;
	}

	private createTextDiv(className: string, text: string): HTMLElement {
		const div = createDiv();
		div.className = className;
		div.appendChild(enrichTextWithStyledElements(text));
		return div;
	}

	private createSeparator(): HTMLElement {
		const separator = createSpan();
		separator.className = "url-preview__separator";
		separator.textContent = " — ";
		return separator;
	}

	/**
	 * Render content for card-style previews.
	 * The header already shows the context (or the title when there is none).
	 */
	private renderCardContent(textContainer: HTMLElement): void {
		const { context, title, description } = this.options;

		if (context && title) {
			textContainer.appendChild(this.createTextDiv("url-preview__post-title", title));
		}

		if (description) {
			textContainer.appendChild(this.createTextDiv("url-preview__description", description));
		}
	}

	/**
	 * Render content for inline-style previews:
	 * "<title> — <description>", or "<context> — <title>" when there is a context
	 */
	private renderInlineContent(textContainer: HTMLElement): void {
		const { context, title, description } = this.options;

		const lead = context ?? title;
		const trailing = context ? title : description;

		if (!lead) {
			return;
		}

		textContainer.appendChild(this.createTextSpan("url-preview__title", lead));

		if (trailing) {
			textContainer.appendChild(this.createSeparator());
			textContainer.appendChild(this.createTextSpan("url-preview__description", trailing));
		}
	}

	/**
	 * Render site name footer for card previews
	 */
	private renderCardFooter(container: HTMLElement): void {
		let siteName = this.options.siteName; // Try metadata first

		// Fallback to extracting from URL if metadata doesn't provide site name
		if (!siteName) {
			try {
				const parsed = new URL(this.options.url);
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
			const footer = createDiv();
			footer.className = "url-preview__footer";
			footer.textContent = siteName.toUpperCase();
			container.appendChild(footer);
		}
	}

	eq(other: UrlPreviewWidget): boolean {
		const a = this.options;
		const b = other.options;
		return (
			a.url === b.url &&
			a.context === b.context &&
			a.title === b.title &&
			a.description === b.description &&
			a.faviconUrl === b.faviconUrl &&
			a.isLoading === b.isLoading &&
			a.previewStyle === b.previewStyle &&
			a.siteName === b.siteName &&
			a.error === b.error &&
			a.inlineColorMode === b.inlineColorMode &&
			a.cardColorMode === b.cardColorMode
		);
	}

	ignoreEvent(event: Event): boolean {
		// Ignore mouse events to prevent CodeMirror from handling clicks on the widget
		return event.type === "mousedown" || event.type === "click";
	}
}
