import { editorLivePreviewField } from "obsidian";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { RangeSetBuilder, StateEffect } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import type { LinkPreviewService } from "../services/linkPreviewService";
import type { InlineLinkPreviewSettings, PreviewStyle, DisplayMode, PreviewColorMode } from "../settings";
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

interface PageConfig {
	previewStyle?: PreviewStyle;
	displayMode?: DisplayMode;
	maxCardLength?: number;
	maxBubbleLength?: number;
	showFavicon?: boolean;
	includeDescription?: boolean;
	previewColorMode?: PreviewColorMode;
	customPreviewColor?: string;
}

/**
 * Parse frontmatter from the document to extract page-level preview configuration
 */
function parsePageConfig(text: string): PageConfig {
	const config: PageConfig = {};
	
	// Check if document starts with frontmatter
	if (!text.startsWith('---')) {
		return config;
	}
	
	// Find the closing ---
	const lines = text.split('\n');
	let endIndex = -1;
	for (let i = 1; i < lines.length; i++) {
		if (lines[i].trim() === '---') {
			endIndex = i;
			break;
		}
	}
	
	if (endIndex === -1) {
		return config;
	}
	
	// Parse frontmatter lines
	const frontmatter = lines.slice(1, endIndex);
	
	// Debug: Log frontmatter parsing
	console.log('[Inline Link Preview] Parsing frontmatter:', frontmatter);
	
	for (const line of frontmatter) {
		// Preview style
		const styleMatch = line.match(/^preview-style:\s*(.+)$/i);
		if (styleMatch) {
			const value = styleMatch[1].trim().toLowerCase();
			if (value === 'bubble' || value === 'card') {
				config.previewStyle = value;
			}
		}
		
		// Display mode
		const displayMatch = line.match(/^preview-display:\s*(.+)$/i);
		if (displayMatch) {
			const value = displayMatch[1].trim().toLowerCase();
			if (value === 'inline' || value === 'block') {
				config.displayMode = value;
			}
		}
		
		// Max card length
		const maxCardMatch = line.match(/^max-card-length:\s*(\d+)$/i);
		if (maxCardMatch) {
			const value = parseInt(maxCardMatch[1], 10);
			if (value >= 100 && value <= 5000) {
				config.maxCardLength = value;
			}
		}
		
		// Max bubble length
		const maxBubbleMatch = line.match(/^max-bubble-length:\s*(\d+)$/i);
		if (maxBubbleMatch) {
			const value = parseInt(maxBubbleMatch[1], 10);
			if (value >= 50 && value <= 5000) {
				config.maxBubbleLength = value;
			}
		}
		
		// Show favicon
		const faviconMatch = line.match(/^show-favicon:\s*(.+)$/i);
		if (faviconMatch) {
			const value = faviconMatch[1].trim().toLowerCase();
			if (value === 'true' || value === 'false') {
				config.showFavicon = value === 'true';
			}
		}
		
		// Include description
		const descMatch = line.match(/^include-description:\s*(.+)$/i);
		if (descMatch) {
			const value = descMatch[1].trim().toLowerCase();
			if (value === 'true' || value === 'false') {
				config.includeDescription = value === 'true';
			}
		}
		
		// Preview color mode
		const colorModeMatch = line.match(/^preview-color-mode:\s*(.+)$/i);
		if (colorModeMatch) {
			const value = colorModeMatch[1].trim().toLowerCase();
			if (value === 'none' || value === 'grey' || value === 'custom') {
				config.previewColorMode = value;
			}
		}
		
		// Custom preview color
		const customColorMatch = line.match(/^custom-preview-color:\s*(.+)$/i);
		if (customColorMatch) {
			const value = customColorMatch[1].trim();
			// Basic hex color validation
			if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
				config.customPreviewColor = value;
			}
		}
	}
	
	// Debug: Log parsed config
	console.log('[Inline Link Preview] Parsed config:', config);
	
	return config;
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
		private previewStyle: PreviewStyle,
		private displayMode: DisplayMode,
		private maxLength: number,
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
		const isReddit = this.description && this.description.includes("§REDDIT_CARD§");
		
		if (this.previewStyle === "card") {
			// Card layout
			if (isReddit && this.description) {
				// Reddit card: parse structured format
				const parts = this.description.split("§REDDIT_CARD§");
				const titleAndContent = parts[1] || "";
				const [postTitle, ...contentParts] = titleAndContent.split("§REDDIT_CONTENT§");
				let postContent = contentParts.join("§REDDIT_CONTENT§");
				
				// Calculate total length and truncate if needed
				// Format: "r/Subreddit" (title) + "Post Title" + content
				const totalLength = (this.title?.length || 0) + postTitle.length + postContent.length;
				if (totalLength > this.maxLength) {
					// Calculate remaining space for content after title and post title
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
					postTitleDiv.textContent = postTitle.trim();
					postTitleDiv.style.cssText = `
						font-size: 1.05em;
						font-weight: 600;
						line-height: 1.35;
						color: var(--text-normal);
						margin-bottom: 0.4em;
					`.replace(/\s+/g, ' ').trim();
					textContainer.appendChild(postTitleDiv);
				}
				
				// Post content preview (below post title)
				if (postContent) {
					const contentDiv = document.createElement("div");
					contentDiv.className = "inline-url-preview__description";
					contentDiv.textContent = postContent.trim();
					textContainer.appendChild(contentDiv);
				}
			} else if (this.description) {
				// Standard card: description below title
				const descDiv = document.createElement("div");
				descDiv.className = "inline-url-preview__description";
				descDiv.textContent = this.description;
				textContainer.appendChild(descDiv);
			}
		} else {
			// Bubble layout
			if (isReddit && this.description) {
				// Reddit bubble: "r/Subreddit — Post Title"
				const parts = this.description.split("§REDDIT_CARD§");
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
					descSpan.textContent = titlePart.trim();
					textContainer.appendChild(descSpan);
				}
			} else {
				// Standard bubble format
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
			}
		}

		container.appendChild(textContainer);
		
		// Add URL at bottom for card style only
		if (this.previewStyle === "card") {
			const urlFooter = document.createElement("div");
			urlFooter.className = "inline-url-preview__url-footer";
			urlFooter.textContent = this.url;
			urlFooter.style.cssText = `
				margin-top: 0.5em;
				font-size: 0.75em;
				color: var(--text-faint);
				opacity: 0.7;
				word-break: break-all;
			`.replace(/\s+/g, ' ').trim();
			container.appendChild(urlFooter);
		}
		
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
			other.previewStyle === this.previewStyle &&
			other.displayMode === this.displayMode &&
			other.error === this.error
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

			// Only show in Live Preview mode
			const isLivePreview = view.state.field(editorLivePreviewField);
			if (!isLivePreview) {
				return Decoration.none;
			}
			
			console.log('[Inline Link Preview] buildDecorations called');
			
			const builder = new RangeSetBuilder<Decoration>();
			const doc = view.state.doc;
			const text = doc.toString();
			
			// Parse page-level configuration from frontmatter
			// Parse page-level configuration from frontmatter
			const pageConfig = parsePageConfig(text);
			
			// Merge frontmatter config with global settings (frontmatter takes precedence)
			const previewStyle = pageConfig.previewStyle ?? settings.previewStyle;
			const displayMode = pageConfig.displayMode ?? settings.displayMode;
			const maxCardLength = pageConfig.maxCardLength ?? settings.maxCardLength;
			const maxBubbleLength = pageConfig.maxBubbleLength ?? settings.maxBubbleLength;
			const showFavicon = pageConfig.showFavicon ?? settings.showFavicon;
			const includeDescription = pageConfig.includeDescription ?? settings.includeDescription;
			const keepEmoji = settings.keepEmoji; // Not exposed to frontmatter
			
			// Debug: Log merged settings
			console.log('[Inline Link Preview] Merged settings:', {
				previewStyle,
				displayMode,
				maxCardLength,
				maxBubbleLength,
				showFavicon,
				includeDescription
			});
			
			// Get syntax tree for markdown context detection
			const tree = syntaxTree(view.state);

			// Collect all decorations first, then sort them before adding to builder
			// This is required because RangeSetBuilder needs decorations in sorted order
			const decorationsToAdd: Array<{ from: number; to: number; decoration: Decoration }> = [];
			const processedRanges = new Set<string>();

			// First pass: Match markdown links like [url](url) or [text](url)
			// Pattern: [anything](http://... or https://...)
			const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
			let markdownMatch;

			while ((markdownMatch = markdownLinkRegex.exec(text)) !== null) {
				const fullMatch = markdownMatch[0]; // e.g., "[text](url)"
				const linkText = markdownMatch[1]; // e.g., "text" or "url"
				const url = markdownMatch[2]; // e.g., "https://example.com"
				const linkStart = markdownMatch.index;
				const linkEnd = linkStart + fullMatch.length;
				
				const rangeKey = `${linkStart}-${linkEnd}`;
				if (processedRanges.has(rangeKey)) {
					continue;
				}
				processedRanges.add(rangeKey);
				
				// Check for image syntax ![alt](url) - skip images
				if (linkStart > 0 && text[linkStart - 1] === '!') {
					continue;
				}
				
				// Check for inline code context using syntax tree
				const node = tree.resolveInner(linkStart, 1);
				if (node.type.name === "InlineCode" || node.parent?.type.name === "InlineCode") {
					continue;
				}
				
				// Check for code block
				if (node.type.name === "CodeText" || node.parent?.type.name === "FencedCode") {
					continue;
				}

				// Queue metadata fetch for the URL
				this.queueMetadataFetch(url, view);

				// Try to get cached metadata
				const cache = (service as any).cache as Map<string, any> | undefined;
				const metadata = cache?.get(url);

				let title: string | null = null;
				let description: string | null = null;
				let faviconUrl: string | null = null;
				let isLoading = false;
				let error: string | null = null;
				
				// Calculate max length based on preview style
				const maxLength = (previewStyle === "card" 
					? maxCardLength 
					: maxBubbleLength) as unknown;
				let maxLengthValue: number;
				if (typeof maxLength === "string") {
					maxLengthValue = Number(maxLength);
				} else if (typeof maxLength === "number") {
					maxLengthValue = maxLength;
				} else {
					// Default: 300 for cards, 150 for bubbles
					maxLengthValue = previewStyle === "card" ? 300 : 150;
				}
				const limit = Number.isFinite(maxLengthValue) ? Math.max(0, Math.round(maxLengthValue)) : (previewStyle === "card" ? 300 : 150);

				if (metadata) {
					// Use custom link text if it's not the same as the URL
					if (linkText !== url) {
						// Custom text provided - use it as title
						title = sanitizeLinkText(linkText, keepEmoji);
					} else {
						// linkText is the URL - use metadata title
						title = metadata.title
							? sanitizeLinkText(metadata.title, keepEmoji)
							: deriveTitleFromUrl(url);
					}

					description = metadata.description
						? sanitizeLinkText(metadata.description, keepEmoji)
						: null;

					// Remove description if it's the same as title
					if (description && equalsIgnoreCase(description, title)) {
						description = null;
					}

					// Truncate to fit within maximum length for preview style
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

					if (!includeDescription || limit === 0) {
						description = null;
					}

					faviconUrl = showFavicon ? metadata.favicon : null;
					error = metadata.error || null;
				} else if (this.pendingUpdates.has(url)) {
					isLoading = true;
				}

				// Only show preview if we have metadata or are loading
				// If there's an error, skip decoration entirely - leave as plain editable URL
				if (!error && (isLoading || title)) {
					// Collect decoration instead of adding directly to builder
					const replacementWidget = Decoration.replace({
						widget: new UrlPreviewWidget(url, title, description, faviconUrl, isLoading, previewStyle, displayMode, limit, error),
					});
					decorationsToAdd.push({ from: linkStart, to: linkEnd, decoration: replacementWidget });
				}
			}

			// Second pass: Match bare URLs (not already in markdown link syntax)
			// Simple regex to find all HTTP/HTTPS URLs - we'll filter out markdown links with our overlap check
			const urlRegex = /https?:\/\/[^\s)\]]+/g;
			let match;

			while ((match = urlRegex.exec(text)) !== null) {
				const url = match[0];
				const urlStart = match.index;
				const urlEnd = urlStart + url.length;
				
				// Skip if this URL overlaps with any already-processed range (from markdown links)
				let overlapsExisting = false;
				for (const existingKey of processedRanges) {
					const [existingStart, existingEnd] = existingKey.split('-').map(Number);
					// Check if ranges overlap: (start1 < end2) && (start2 < end1)
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
				
				const rangeKey = `${urlStart}-${urlEnd}`;

				// Skip if we've already processed this exact range
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
					let error: string | null = null;
					
					// Calculate max length based on preview style
					const maxLength = (previewStyle === "card" 
						? maxCardLength 
						: maxBubbleLength) as unknown;
					let maxLengthValue: number;
					if (typeof maxLength === "string") {
						maxLengthValue = Number(maxLength);
					} else if (typeof maxLength === "number") {
						maxLengthValue = maxLength;
					} else {
						// Default: 300 for cards, 150 for bubbles
						maxLengthValue = previewStyle === "card" ? 300 : 150;
					}
					const limit = Number.isFinite(maxLengthValue) ? Math.max(0, Math.round(maxLengthValue)) : (previewStyle === "card" ? 300 : 150);

					if (metadata) {
						title = metadata.title
							? sanitizeLinkText(metadata.title, keepEmoji)
							: deriveTitleFromUrl(url);

						description = metadata.description
							? sanitizeLinkText(metadata.description, keepEmoji)
							: null;

						// Remove description if it's the same as title
						if (description && equalsIgnoreCase(description, title)) {
							description = null;
						}

						// Truncate to fit within maximum length for preview style
						// limit was calculated above based on maxCardLength or maxBubbleLength
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

						if (!includeDescription || limit === 0) {
							description = null;
						}

						faviconUrl = showFavicon ? metadata.favicon : null;
						error = metadata.error || null;
					} else if (this.pendingUpdates.has(url)) {
					isLoading = true;
				}

				// Only show preview if we have metadata or are loading
				// If there's an error, skip decoration entirely - leave as plain editable URL
				if (!error && (isLoading || title)) {
					// Collect decoration instead of adding directly to builder
					const replacementWidget = Decoration.replace({
						widget: new UrlPreviewWidget(url, title, description, faviconUrl, isLoading, previewStyle, displayMode, limit, error),
					});
					decorationsToAdd.push({ from: urlStart, to: urlEnd, decoration: replacementWidget });
				}
			}

			// Sort decorations by position (required by RangeSetBuilder)
			decorationsToAdd.sort((a, b) => a.from - b.from);

			// Add all decorations to builder in sorted order
			for (const { from, to, decoration } of decorationsToAdd) {
				builder.add(from, to, decoration);
			}

			return builder.finish();
		}			private queueMetadataFetch(url: string, view: EditorView): void {
				if (this.pendingUpdates.has(url)) {
					return;
				}

				// Check if already cached
				const cache = (service as any).cache as Map<string, any> | undefined;
				if (cache?.has(url)) {
					return;
				}

				const promise = service.getMetadata(url).then(() => {
					// Rebuild decorations immediately after metadata is fetched
					this.decorations = this.buildDecorations(view);
					
					// Force a full viewport update to ensure the view re-renders
					view.dispatch({
						effects: []
					});
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
