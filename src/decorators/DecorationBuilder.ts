import { Decoration } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { InlineLinkPreviewSettings, PreviewStyle } from "../settings";
import type { LinkPreviewService } from "../services/linkPreviewService";
import { parsePageConfig } from "./FrontmatterParser";
import { findWikilinkUrls, findMarkdownLinks, findBareUrls, isInCodeBlock } from "./UrlMatcher";
import { UrlPreviewWidget, ErrorIndicatorWidget } from "./PreviewWidget";
import { stripEmoji } from "./MetadataEnricher";
import { sanitizeTextContent } from "../utils/text";
import {
	ELLIPSIS,
	DEFAULT_CARD_LENGTH,
	DEFAULT_BUBBLE_LENGTH,
	MIN_DESCRIPTION_LENGTH,
	TITLE_SEPARATOR_LENGTH
} from "../constants";

/**
 * Helper functions for text processing
 */
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

/**
 * Calculate the maximum length for content based on preview style
 */
function calculateMaxLength(
	previewStyle: PreviewStyle,
	maxCardLength: number,
	maxBubbleLength: number
): number {
	const maxLength = (previewStyle === "card" ? maxCardLength : maxBubbleLength) as unknown;
	let maxLengthValue: number;

	if (typeof maxLength === "string") {
		maxLengthValue = Number(maxLength);
	} else if (typeof maxLength === "number") {
		maxLengthValue = maxLength;
	} else {
		// Default: 300 for cards, 150 for bubbles
		maxLengthValue = previewStyle === "card" ? DEFAULT_CARD_LENGTH : DEFAULT_BUBBLE_LENGTH;
	}

	return Number.isFinite(maxLengthValue) ? Math.max(0, Math.round(maxLengthValue)) : (previewStyle === "card" ? DEFAULT_CARD_LENGTH : DEFAULT_BUBBLE_LENGTH);
}

/**
 * Process metadata for display
 */
interface ProcessedMetadata {
	title: string | null;
	description: string | null;
	faviconUrl: string | null;
	siteName: string | null;
	error: string | null;
}

function processMetadata(
	metadata: import("../services/types").LinkMetadata | undefined,
	url: string,
	linkText: string | undefined,
	settings: {
		previewStyle: PreviewStyle;
		maxCardLength: number;
		maxBubbleLength: number;
		showFavicon: boolean;
		includeDescription: boolean;
		keepEmoji: boolean;
	}
): ProcessedMetadata {
	const limit = calculateMaxLength(settings.previewStyle, settings.maxCardLength, settings.maxBubbleLength);

	let title: string | null = null;
	let description: string | null = null;
	let faviconUrl: string | null = null;
	let siteName: string | null = null;
	let error: string | null = null;

	if (!metadata) {
		return { title, description, faviconUrl, siteName, error };
	}

	// Determine title based on link text or metadata
	if (linkText) {
		// Custom text provided - use it as title
		title = sanitizeLinkText(linkText, settings.keepEmoji);
	} else {
		// Use metadata title
		title = metadata.title
			? sanitizeLinkText(metadata.title, settings.keepEmoji)
			: deriveTitleFromUrl(url);
	}

	description = metadata.description
		? sanitizeLinkText(metadata.description, settings.keepEmoji)
		: null;

	// Remove description if it's the same as title
	if (description && equalsIgnoreCase(description, title)) {
		description = null;
	}

	// Truncate to fit within maximum length for preview style
	if (description && limit > 0) {
		const combined = `${title} — ${description}`;
		if (combined.length > limit) {
			const titleLength = title.length + TITLE_SEPARATOR_LENGTH;
			const remainingLength = limit - titleLength;
			if (remainingLength > MIN_DESCRIPTION_LENGTH) {
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
	siteName = metadata.siteName || null;
	error = metadata.error || null;

	return { title, description, faviconUrl, siteName, error };
}

/**
 * Create decorations for a single URL
 */
function createDecorationsForUrl(
	url: string,
	urlStart: number,
	urlEnd: number,
	linkText: string | undefined,
	metadata: ProcessedMetadata,
	isLoading: boolean,
	settings: {
		previewStyle: PreviewStyle;
		displayMode: import("../settings").DisplayMode;
		maxCardLength: number;
		maxBubbleLength: number;
	}
): Array<{ from: number; to: number; decoration: Decoration }> {
	const decorations: Array<{ from: number; to: number; decoration: Decoration }> = [];
	const limit = calculateMaxLength(settings.previewStyle, settings.maxCardLength, settings.maxBubbleLength);

	// If there's an error, add error indicator
	if (metadata.error) {
		const errorWidget = Decoration.widget({
			widget: new ErrorIndicatorWidget(metadata.error),
			side: 1 // Place after the URL
		});
		decorations.push({ from: urlEnd, to: urlEnd, decoration: errorWidget });
		return decorations;
	}

	// Only show preview if we have metadata or are loading
	if (!isLoading && !metadata.title) {
		return decorations;
	}

	if (settings.previewStyle === "card") {
		// Card mode: Show card ABOVE the URL, leave URL as-is
		const cardWidget = Decoration.widget({
			widget: new UrlPreviewWidget(
				url,
				metadata.title,
				metadata.description,
				metadata.faviconUrl,
				isLoading,
				settings.previewStyle,
				settings.displayMode,
				limit,
				metadata.siteName,
				metadata.error
			),
			side: -1 // Place widget BEFORE the URL
		});
		decorations.push({ from: urlStart, to: urlStart, decoration: cardWidget });

		// Style the URL to be subtle (small, grey, no underline)
		const urlMark = Decoration.mark({
			class: "ilp-card-url",
			attributes: {
				style: `
					font-size: 0.85em;
					color: var(--text-faint);
					text-decoration: none;
					opacity: 0.7;
				`.replace(/\s+/g, ' ').trim()
			}
		});
		decorations.push({ from: urlStart, to: urlEnd, decoration: urlMark });
	} else {
		// Bubble mode: Replace URL with bubble (hide URL)
		const replacementWidget = Decoration.replace({
			widget: new UrlPreviewWidget(
				url,
				metadata.title,
				metadata.description,
				metadata.faviconUrl,
				isLoading,
				settings.previewStyle,
				settings.displayMode,
				limit,
				metadata.siteName,
				metadata.error
			),
		});
		decorations.push({ from: urlStart, to: urlEnd, decoration: replacementWidget });
	}

	return decorations;
}

/**
 * Build all decorations for URLs in the document
 */
export function buildUrlDecorations(
	view: EditorView,
	service: LinkPreviewService,
	globalSettings: InlineLinkPreviewSettings,
	pendingUpdates: Map<string, Promise<void>>,
	queueMetadataFetch: (url: string) => void
): Array<{ from: number; to: number; decoration: Decoration }> {
	const decorations: Array<{ from: number; to: number; decoration: Decoration }> = [];
	const doc = view.state.doc;
	const text = doc.toString();

	// Parse page-level configuration from frontmatter
	const pageConfig = parsePageConfig(text);

	// Merge frontmatter config with global settings (frontmatter takes precedence)
	const previewStyle = pageConfig.previewStyle ?? globalSettings.previewStyle;
	const displayMode = pageConfig.displayMode ?? globalSettings.displayMode;
	const maxCardLength = pageConfig.maxCardLength ?? globalSettings.maxCardLength;
	const maxBubbleLength = pageConfig.maxBubbleLength ?? globalSettings.maxBubbleLength;
	const showFavicon = pageConfig.showFavicon ?? globalSettings.showFavicon;
	const includeDescription = pageConfig.includeDescription ?? globalSettings.includeDescription;
	const keepEmoji = globalSettings.keepEmoji; // Not exposed to frontmatter

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

	// Get cursor position
	const cursorPos = view.state.selection.main.head;

	// Track processed ranges to avoid duplicates
	const processedRanges = new Set<string>();

	// Helper function to process a URL match
	const processUrlMatch = (
		url: string,
		start: number,
		end: number,
		linkText?: string
	): void => {
		const rangeKey = `${start}-${end}`;
		if (processedRanges.has(rangeKey)) {
			return;
		}
		processedRanges.add(rangeKey);

		// Skip if cursor is inside this URL (user is actively editing)
		// Only skip for bubble mode - card mode keeps preview visible while editing
		if (previewStyle === "bubble" && cursorPos >= start && cursorPos <= end) {
			return;
		}

		// Check for code block context
		const node = tree.resolveInner(start, 1);
		if (isInCodeBlock(node, start)) {
			return;
		}

		// Queue metadata fetch
		queueMetadataFetch(url);

		// Try to get cached metadata
		const metadata = service.getCachedMetadata(url);

		const isLoading = !metadata && pendingUpdates.has(url);

		// Process metadata
		const processed = processMetadata(
			metadata,
			url,
			linkText,
			{
				previewStyle,
				maxCardLength,
				maxBubbleLength,
				showFavicon,
				includeDescription,
				keepEmoji
			}
		);

		// Create decorations
		const urlDecorations = createDecorationsForUrl(
			url,
			start,
			end,
			linkText,
			processed,
			isLoading,
			{
				previewStyle,
				displayMode,
				maxCardLength,
				maxBubbleLength
			}
		);

		decorations.push(...urlDecorations);
	};

	// First pass: Wikilink URLs [[https://...]]
	for (const match of findWikilinkUrls(text)) {
		processUrlMatch(match.url, match.start, match.end);
	}

	// Second pass: Markdown links [text](url)
	for (const match of findMarkdownLinks(text)) {
		processUrlMatch(match.url, match.start, match.end, match.linkText);
	}

	// Third pass: Bare URLs
	for (const match of findBareUrls(text, processedRanges)) {
		processUrlMatch(match.url, match.start, match.end);
	}

	return decorations;
}
