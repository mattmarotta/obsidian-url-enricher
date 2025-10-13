import { editorLivePreviewField } from "obsidian";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import type { LinkPreviewService } from "../services/linkPreviewService";
import type { InlineLinkPreviewSettings } from "../settings";
import { sanitizeTextContent } from "../utils/text";

const ELLIPSIS = "\u2026";

const emojiRegex = (() => {
	try {
		return new RegExp("\\p{Extended_Pictographic}", "gu");
	} catch {
		// Basic fallback covering common emoji ranges
		return /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{2600}-\u{27BF}]/gu;
	}
})();

function stripEmoji(value: string): string {
	return value.replace(emojiRegex, "").replace(/\s+/g, " ").trim();
}

class UrlPreviewWidget extends WidgetType {
	constructor(
		private title: string | null,
		private description: string | null,
		private faviconUrl: string | null,
		private isLoading: boolean
	) {
		super();
	}

	toDOM(): HTMLElement {
		const container = document.createElement("span");
		container.className = "inline-url-preview";

		if (this.isLoading) {
			container.className += " inline-url-preview--loading";
			container.textContent = "Loading...";
			return container;
		}

		// Favicon
		if (this.faviconUrl) {
			const favicon = document.createElement("img");
			favicon.src = this.faviconUrl;
			favicon.className = "inline-url-preview__favicon";
			favicon.alt = "";
			container.appendChild(favicon);
		}

		// Title and description
		const textContainer = document.createElement("span");
		textContainer.className = "inline-url-preview__text";

		if (this.title) {
			const titleSpan = document.createElement("span");
			titleSpan.className = "inline-url-preview__title";
			titleSpan.textContent = this.title;
			textContainer.appendChild(titleSpan);

			if (this.description) {
				const separator = document.createElement("span");
				separator.className = "inline-url-preview__separator";
				separator.textContent = " — ";
				textContainer.appendChild(separator);

				const descSpan = document.createElement("span");
				descSpan.className = "inline-url-preview__description";
				descSpan.textContent = this.description;
				textContainer.appendChild(descSpan);
			}
		}

		container.appendChild(textContainer);
		return container;
	}

	eq(other: UrlPreviewWidget): boolean {
		return (
			other.title === this.title &&
			other.description === this.description &&
			other.faviconUrl === this.faviconUrl &&
			other.isLoading === this.isLoading
		);
	}

	ignoreEvent(): boolean {
		return false; // Allow clicking through to the URL
	}
}

function sanitizeLinkText(text: string, keepEmoji: boolean): string {
	const sanitized = sanitizeTextContent(text);
	if (!sanitized) {
		return "";
	}
	return keepEmoji ? sanitized : stripEmoji(sanitized);
}

function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}
	return text.slice(0, maxLength).trim() + ELLIPSIS;
}

function deriveTitleFromUrl(url: string): string {
	try {
		const parsed = new URL(url);
		return parsed.hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

function equalsIgnoreCase(a: string, b: string): boolean {
	return a.toLowerCase() === b.toLowerCase();
}

export function createUrlPreviewDecorator(
	service: LinkPreviewService,
	getSettings: () => InlineLinkPreviewSettings
) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			private pendingUpdates = new Map<string, Promise<void>>();
			private updateTimeout: ReturnType<typeof setTimeout> | null = null;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			destroy(): void {
				if (this.updateTimeout !== null) {
					clearTimeout(this.updateTimeout);
				}
			}

			update(update: ViewUpdate): void {
				if (update.docChanged || update.viewportChanged) {
					this.decorations = this.buildDecorations(update.view);
				}
			}

			buildDecorations(view: EditorView): DecorationSet {
				const settings = getSettings();
				
				// Only decorate if dynamic preview mode is enabled
				if (!settings.dynamicPreviewMode) {
					return Decoration.none;
				}

				// Only show in Live Preview mode
				const isLivePreview = view.state.field(editorLivePreviewField);
				if (!isLivePreview) {
					return Decoration.none;
				}

				const builder = new RangeSetBuilder<Decoration>();
				const doc = view.state.doc;
				const text = doc.toString();

				// Match bare URLs (not already in markdown link syntax)
				// This regex looks for URLs that are NOT preceded by ]( and followed by )
				const urlRegex = /(?<!\]\()(?:https?:\/\/[^\s)\]]+)(?!\))/g;
				let match;

				const processedRanges = new Set<string>();

				while ((match = urlRegex.exec(text)) !== null) {
					const url = match[0];
					const urlStart = match.index;
					const urlEnd = urlStart + url.length;
					const rangeKey = `${urlStart}-${urlEnd}`;

					// Skip if we've already processed this range
					if (processedRanges.has(rangeKey)) {
						continue;
					}
					processedRanges.add(rangeKey);

					// Additional check: make sure this isn't part of a markdown link
					// by looking at surrounding context
					const beforeMatch = text.slice(Math.max(0, urlStart - 2), urlStart);
					const afterMatch = text.slice(urlEnd, Math.min(text.length, urlEnd + 1));
					
					if (beforeMatch === "](" || afterMatch === ")") {
						continue;
					}

					// Queue metadata fetch
					this.queueMetadataFetch(url, view);

					// Try to get cached metadata
					const cache = (service as any).cache as Map<string, any> | undefined;
					const metadata = cache?.get(url);

					let title: string | null = null;
					let description: string | null = null;
					let faviconUrl: string | null = null;
					let isLoading = false;

					if (metadata) {
						title = metadata.title
							? sanitizeLinkText(metadata.title, settings.keepEmoji)
							: deriveTitleFromUrl(url);

						description = metadata.description
							? sanitizeLinkText(metadata.description, settings.keepEmoji)
							: null;

						// Remove description if it's the same as title
						if (description && equalsIgnoreCase(description, title)) {
							description = null;
						}

						// Truncate description if needed
						const limitInput = settings.maxDescriptionLength as unknown;
						let limitValue: number;
						if (typeof limitInput === "string") {
							limitValue = Number(limitInput);
						} else if (typeof limitInput === "number") {
							limitValue = limitInput;
						} else {
							limitValue = 60;
						}
						const limit = Number.isFinite(limitValue) ? Math.max(0, Math.round(limitValue)) : 60;

						if (description && limit > 0) {
							const combined = `${title} — ${description}`;
							if (combined.length > limit) {
								const titleLength = title.length + 3; // " — "
								const remainingLength = limit - titleLength;
								if (remainingLength > 10) {
									description = truncate(description, remainingLength);
								} else {
									description = null;
								}
							}
						}

						if (!settings.includeDescription || limit === 0) {
							description = null;
						}

						faviconUrl = settings.showFavicon ? metadata.favicon : null;
					} else if (this.pendingUpdates.has(url)) {
						isLoading = true;
					}

					// Only show preview if we have metadata or are loading
					if (isLoading || title) {
						const widget = Decoration.widget({
							widget: new UrlPreviewWidget(title, description, faviconUrl, isLoading),
							side: 1, // Display after the URL
						});
						builder.add(urlEnd, urlEnd, widget);
					}
				}

				return builder.finish();
			}

			private queueMetadataFetch(url: string, view: EditorView): void {
				if (this.pendingUpdates.has(url)) {
					return;
				}

				// Check if already cached
				const cache = (service as any).cache as Map<string, any> | undefined;
				if (cache?.has(url)) {
					return;
				}

				const promise = service.getMetadata(url).then(() => {
					// Use a short timeout to batch updates
					if (this.updateTimeout !== null) {
						clearTimeout(this.updateTimeout);
					}
					this.updateTimeout = setTimeout(() => {
						this.decorations = this.buildDecorations(view);
						view.requestMeasure();
						this.updateTimeout = null;
					}, 100);
				}).catch(() => {
					// Silently ignore errors - no preview will be shown
				}).finally(() => {
					this.pendingUpdates.delete(url);
				});

				this.pendingUpdates.set(url, promise);
			}
		},
		{
			decorations: (v) => v.decorations,
		}
	);
}
