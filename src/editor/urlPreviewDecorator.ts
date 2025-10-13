import { editorLivePreviewField } from "obsidian";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { RangeSetBuilder, StateEffect } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import type { LinkPreviewService } from "../services/linkPreviewService";
import type { InlineLinkPreviewSettings, UrlDisplayMode } from "../settings";
import { sanitizeTextContent } from "../utils/text";

// StateEffect to trigger decoration refresh when settings change
export const refreshDecorationsEffect = StateEffect.define<null>();

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

class SmallUrlWidget extends WidgetType {
	constructor(private url: string) {
		super();
	}

	toDOM(): HTMLElement {
		const span = document.createElement("span");
		span.className = "inline-url-preview-small-url-widget";
		span.textContent = this.url;
		// Use inline styles to override everything
		span.style.cssText = `
			font-size: 0.75em !important;
			color: var(--text-faint) !important;
			opacity: 0.6 !important;
			cursor: pointer !important;
			text-decoration: none !important;
			border-bottom: none !important;
			background: none !important;
			padding: 0 !important;
			margin: 0 !important;
		`.replace(/\s+/g, ' ').trim();
		
		// Make it clickable
		span.onclick = (e) => {
			e.preventDefault();
			e.stopPropagation();
			window.open(this.url, "_blank");
		};
		
		return span;
	}

	eq(other: SmallUrlWidget): boolean {
		return other.url === this.url;
	}

	ignoreEvent(event: Event): boolean {
		// Let click events through
		return event.type !== "mousedown";
	}
}

class UrlPreviewWidget extends WidgetType {
	constructor(
		private url: string,
		private title: string | null,
		private description: string | null,
		private faviconUrl: string | null,
		private isLoading: boolean,
		private displayMode: UrlDisplayMode
	) {
		super();
	}

	toDOM(): HTMLElement {
		// Create a container with a line break before it
		const wrapper = document.createElement("span");
		
		// Add line break before the preview bubble (except for preview-only mode)
		if (this.displayMode !== "preview-only") {
			const br = document.createElement("br");
			wrapper.appendChild(br);
		}
		
		const container = document.createElement("span");
		container.className = "inline-url-preview";

		if (this.isLoading) {
			container.className += " inline-url-preview--loading";
			container.textContent = "Loading...";
			wrapper.appendChild(container);
			return wrapper;
		}

		// Make the preview bubble clickable
		container.style.cursor = "pointer";
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
		wrapper.appendChild(container);
		return wrapper;
	}

	eq(other: UrlPreviewWidget): boolean {
		return (
			other.url === this.url &&
			other.title === this.title &&
			other.description === this.description &&
			other.faviconUrl === this.faviconUrl &&
			other.isLoading === this.isLoading &&
			other.displayMode === this.displayMode
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
				// Rebuild if doc changed, viewport changed, OR if we received a refresh effect
				if (update.docChanged || update.viewportChanged || update.transactions.some(tr => tr.effects.some(e => e.is(refreshDecorationsEffect)))) {
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
				
				// Get syntax tree for markdown context detection
				const tree = syntaxTree(view.state);

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

					// Check if URL is inside markdown link syntax using text analysis
					// Live Preview doesn't provide full markdown structure in syntax tree,
					// so we need to check the actual text context
					
					// Look backwards to find if there's a ]( before this URL
					let isInMarkdownLink = false;
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
								isInMarkdownLink = true;
							}
						}
					}
					
					// Skip if inside a markdown link [text](url)
					if (isInMarkdownLink) {
						continue;
					}
					
					// Also check for image syntax ![alt](url)
					const imageCheck = text.slice(Math.max(0, urlStart - 3), urlStart);
					if (imageCheck.endsWith('!(') || imageCheck.endsWith('](')) {
						const charBefore = text[Math.max(0, urlStart - 4)];
						if (charBefore === '!') {
							continue; // Skip images
						}
					}
					
					// Check for inline code context using syntax tree
					const node = tree.resolveInner(urlStart, 1);
					if (node.type.name === "InlineCode" || node.parent?.type.name === "InlineCode") {
						continue;
					}
					
					// Check for code block
					if (node.type.name === "CodeText" || node.parent?.type.name === "FencedCode") {
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
						const displayMode = settings.urlDisplayMode;
						
						if (displayMode === "preview-only") {
							// Hide the URL completely and show only the preview
							const replacementWidget = Decoration.replace({
								widget: new UrlPreviewWidget(url, title, description, faviconUrl, isLoading, displayMode),
							});
							builder.add(urlStart, urlEnd, replacementWidget);
						} else if (displayMode === "small-url-and-preview") {
							// Replace URL with small styled version
							const smallUrlWidget = Decoration.replace({
								widget: new SmallUrlWidget(url),
							});
							builder.add(urlStart, urlEnd, smallUrlWidget);
							
							// Add preview widget after URL
							const widget = Decoration.widget({
								widget: new UrlPreviewWidget(url, title, description, faviconUrl, isLoading, displayMode),
								side: 1,
							});
							builder.add(urlEnd, urlEnd, widget);
						} else {
							// Show preview after URL (url-and-preview)
							const widget = Decoration.widget({
								widget: new UrlPreviewWidget(url, title, description, faviconUrl, isLoading, displayMode),
								side: 1, // Display after the URL
							});
							builder.add(urlEnd, urlEnd, widget);
						}
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
