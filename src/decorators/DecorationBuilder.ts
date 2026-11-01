import { Decoration } from "@codemirror/view";
import type { EditorState, Text } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import type { InlineLinkPreviewSettings, PreviewStyle } from "../settings";
import type { LinkPreviewService } from "../services/linkPreviewService";
import { parsePageConfig, type PageConfig } from "./FrontmatterParser";
import { findWikilinkUrls, findMarkdownLinks, findBareUrls, isInCodeBlock, ClaimedRanges, type UrlMatch } from "./UrlMatcher";
import { UrlPreviewWidget, ErrorIndicatorWidget } from "./PreviewWidget";
import { stripEmoji, cleanMediaUrls } from "./MetadataEnricher";
import { sanitizeTextContent } from "../utils/text";
import {
	ELLIPSIS,
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
	maxInlineLength: number
): number {
	return previewStyle === "card" ? maxCardLength : maxInlineLength;
}

/**
 * Process metadata for display
 */
interface ProcessedMetadata {
	context: string | null;
	title: string | null;
	description: string | null;
	faviconUrl: string | null;
	siteName: string | null;
	error: string | null;
}

/**
 * Truncate so the result, ellipsis included, is at most `room` characters.
 */
function truncateToFit(text: string, room: number): string {
	if (text.length <= room) {
		return text;
	}
	return text.slice(0, Math.max(0, room - ELLIPSIS.length)).trim() + ELLIPSIS;
}

/**
 * Fit a preview that leads with a context label (e.g. "r/Sub") into `limit`.
 *
 * - Inline renders "<context> — <title>" and never shows the description.
 * - Cards render the context, title, and description on separate lines;
 *   the description is shortened first, then the title.
 *
 * Text that would be left with fewer than MIN_DESCRIPTION_LENGTH characters
 * is dropped rather than shown as a stub.
 */
function fitWithContext(
	context: string,
	title: string | null,
	description: string | null,
	limit: number,
	previewStyle: PreviewStyle
): Pick<ProcessedMetadata, "context" | "title" | "description"> {
	if (context.length >= limit) {
		return { context: truncateToFit(context, limit), title: null, description: null };
	}

	if (previewStyle !== "card") {
		const room = limit - context.length - TITLE_SEPARATOR_LENGTH;
		if (title && title.length > room) {
			title = room >= MIN_DESCRIPTION_LENGTH ? truncateToFit(title, room) : null;
		}
		return { context, title, description: null };
	}

	const room = limit - context.length;
	const titleLength = title?.length ?? 0;
	if (description && titleLength + description.length > room) {
		const descriptionRoom = room - titleLength;
		description = descriptionRoom >= MIN_DESCRIPTION_LENGTH ? truncateToFit(description, descriptionRoom) : null;
	}
	if (title && title.length > room) {
		title = room >= MIN_DESCRIPTION_LENGTH ? truncateToFit(title, room) : null;
	}
	return { context, title, description };
}

function processMetadata(
	metadata: import("../services/types").LinkMetadata | undefined,
	url: string,
	linkText: string | undefined,
	settings: {
		previewStyle: PreviewStyle;
		maxCardLength: number;
		maxInlineLength: number;
		showFavicon: boolean;
		includeDescription: boolean;
		keepEmoji: boolean;
	}
): ProcessedMetadata {
	const limit = calculateMaxLength(settings.previewStyle, settings.maxCardLength, settings.maxInlineLength);

	let context: string | null = null;
	let title: string | null = null;
	let description: string | null = null;
	let faviconUrl: string | null = null;
	let siteName: string | null = null;
	let error: string | null = null;

	if (!metadata) {
		return { context, title, description, faviconUrl, siteName, error };
	}

	context = metadata.context
		? sanitizeLinkText(metadata.context, settings.keepEmoji) || null
		: null;

	// Always prefer fetched metadata title over custom link text for consistency
	// Fallback chain: metadata title → custom link text → derived from URL
	title = metadata.title
		? sanitizeLinkText(metadata.title, settings.keepEmoji)
		: (linkText
			? sanitizeLinkText(linkText, settings.keepEmoji)
			: deriveTitleFromUrl(url));

	// Media links are removed before measuring, so lengths match what's shown
	description = metadata.description
		? cleanMediaUrls(sanitizeLinkText(metadata.description, settings.keepEmoji)) || null
		: null;

	// Remove description if it's the same as title. A context's title is post
	// content shown on its own line, so a matching body is left alone there.
	if (!context && description && equalsIgnoreCase(description, title)) {
		description = null;
	}

	if (context) {
		// The title after a context is post content, so it gets the same media
		// cleanup as descriptions, and "include description" hides it too -
		// leaving just the context, e.g. "r/Sub".
		const postTitle = settings.includeDescription ? cleanMediaUrls(title) || null : null;
		({ context, title, description } = fitWithContext(context, postTitle, description, limit, settings.previewStyle));
	}
	// Truncate title if it exceeds max length on its own
	else if (title.length > limit && limit > 0) {
		title = truncate(title, limit);
		description = null; // No room for description when title is truncated
	}
	// Truncate to fit within maximum length for preview style
	else if (description && limit > 0) {
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

	return { context, title, description, faviconUrl, siteName, error };
}

/**
 * Create decorations for a single URL
 */
function createDecorationsForUrl(
	url: string,
	urlStart: number,
	urlEnd: number,
	metadata: ProcessedMetadata,
	isLoading: boolean,
	settings: {
		previewStyle: PreviewStyle;
		inlineColorMode: import("../settings").PreviewColorMode;
		cardColorMode: import("../settings").PreviewColorMode;
	}
): Array<{ from: number; to: number; decoration: Decoration }> {
	const decorations: Array<{ from: number; to: number; decoration: Decoration }> = [];

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
	if (!isLoading && !metadata.title && !metadata.context) {
		return decorations;
	}

	const widget = new UrlPreviewWidget({
		url,
		context: metadata.context,
		title: metadata.title,
		description: metadata.description,
		faviconUrl: metadata.faviconUrl,
		isLoading,
		previewStyle: settings.previewStyle,
		siteName: metadata.siteName,
		error: metadata.error,
		inlineColorMode: settings.inlineColorMode,
		cardColorMode: settings.cardColorMode,
	});

	if (settings.previewStyle === "card") {
		// Card mode: Show card ABOVE the URL, leave URL as-is
		const cardWidget = Decoration.widget({
			widget,
			side: -1 // Place widget BEFORE the URL
		});
		decorations.push({ from: urlStart, to: urlStart, decoration: cardWidget });

		// Style the URL to be subtle (small, grey, no underline)
		const urlMark = Decoration.mark({
			class: "url-preview-card-url"
		});
		decorations.push({ from: urlStart, to: urlEnd, decoration: urlMark });
	} else {
		// Inline mode: Replace URL with inline preview (hide URL)
		const replacementWidget = Decoration.replace({
			widget,
		});
		decorations.push({ from: urlStart, to: urlEnd, decoration: replacementWidget });
	}

	return decorations;
}

/**
 * A document range to scan, in document offsets
 */
export interface ScanRange {
	from: number;
	to: number;
}

/**
 * Result of a decoration build
 */
export interface UrlDecorationBuild {
	decorations: Array<{ from: number; to: number; decoration: Decoration }>;
	/**
	 * Every URL range that reached the cursor check, sorted by start,
	 * including ones left undecorated because the cursor was inside them
	 */
	urlRanges: ScanRange[];
	/** Whether moving the cursor into or out of a URL changes the output (inline mode) */
	cursorSensitive: boolean;
}

/**
 * Expand ranges to whole lines and merge any that overlap or touch, so links
 * that straddle a range edge are still matched in full.
 */
export function expandToLines(doc: Text, ranges: readonly ScanRange[]): ScanRange[] {
	const expanded = ranges
		.map(({ from, to }) => ({ from: doc.lineAt(from).from, to: doc.lineAt(to).to }))
		.sort((a, b) => a.from - b.from);

	const merged: ScanRange[] = [];
	for (const range of expanded) {
		const last = merged[merged.length - 1];
		// +1 joins ranges separated only by a line break
		if (last && range.from <= last.to + 1) {
			last.to = Math.max(last.to, range.to);
		} else {
			merged.push({ ...range });
		}
	}
	return merged;
}

/**
 * The frontmatter block (both `---` lines included), or "" if the document
 * doesn't open with a closed one. Only this slice is read on each update.
 */
function readFrontmatterBlock(doc: Text): string {
	if (doc.lines < 2 || doc.line(1).text !== "---") {
		return "";
	}

	const lines = doc.iterLines(2);
	let lineNumber = 2;
	for (let next = lines.next(); !next.done; next = lines.next(), lineNumber++) {
		if (next.value === "---") {
			const closing = doc.line(lineNumber);
			return doc.sliceString(0, Math.min(closing.to + 1, doc.length));
		}
	}
	return "";
}

interface FrontmatterState {
	block: string;
	config: PageConfig;
	active: boolean;
}

// Frontmatter rarely changes between updates, so the last parse is reused
// while its text is unchanged.
let lastFrontmatter: FrontmatterState | null = null;

function getFrontmatterState(doc: Text): FrontmatterState {
	const block = readFrontmatterBlock(doc);
	if (lastFrontmatter?.block !== block) {
		const config = parsePageConfig(block);
		// Same rule as hasFrontmatter(), without parsing the block twice
		lastFrontmatter = { block, config, active: Object.keys(config).length > 0 };
	}
	return lastFrontmatter;
}

/**
 * Build decorations for the URLs inside `ranges` (normally the editor's
 * visible ranges). Metadata fetches are queued only for those URLs, so links
 * elsewhere in the note load as they're scrolled into view.
 */
export function buildUrlDecorations(
	state: EditorState,
	ranges: readonly ScanRange[],
	service: LinkPreviewService,
	globalSettings: InlineLinkPreviewSettings,
	pendingUpdates: Map<string, Promise<void>>,
	queueMetadataFetch: (url: string) => void
): UrlDecorationBuild {
	const decorations: Array<{ from: number; to: number; decoration: Decoration }> = [];
	const urlRanges: ScanRange[] = [];
	const doc = state.doc;

	// Parse page-level configuration from frontmatter
	const frontmatter = getFrontmatterState(doc);
	const pageConfig = frontmatter.config;

	// Check if frontmatter-only mode is enabled
	if (globalSettings.requireFrontmatter && !frontmatter.active) {
		// Return empty decorations - plugin is opt-in via frontmatter
		return { decorations, urlRanges, cursorSensitive: false };
	}

	// Merge frontmatter config with global settings (frontmatter takes precedence)
	const previewStyle = pageConfig.previewStyle ?? globalSettings.previewStyle;
	const maxCardLength = pageConfig.maxCardLength ?? globalSettings.maxCardLength;
	const maxInlineLength = pageConfig.maxInlineLength ?? globalSettings.maxInlineLength;
	const showFavicon = pageConfig.showFavicon ?? globalSettings.showFavicon;
	const includeDescription = pageConfig.includeDescription ?? globalSettings.includeDescription;
	const inlineColorMode = pageConfig.inlineColorMode ?? globalSettings.inlineColorMode;
	const cardColorMode = pageConfig.cardColorMode ?? globalSettings.cardColorMode;
	const keepEmoji = globalSettings.keepEmoji; // Not exposed to frontmatter

	// Get syntax tree for markdown context detection
	const tree = syntaxTree(state);

	// Get cursor position
	const cursorPos = state.selection.main.head;

	// Helper function to process a URL match (positions are document offsets)
	const processUrlMatch = (
		url: string,
		start: number,
		end: number,
		linkText?: string
	): void => {
		// Check for code block context
		const node = tree.resolveInner(start, 1);
		if (isInCodeBlock(node)) {
			return;
		}

		urlRanges.push({ from: start, to: end });

		// Queue metadata fetch.
		// This must happen BEFORE the cursor check below: the caret sits inside
		// (or just after) a URL immediately after pasting it, and skipping the
		// fetch there meant the preview never even started loading until the
		// caret moved away.
		queueMetadataFetch(url);

		// Skip rendering if cursor is inside this URL (user is actively editing)
		// Only skip for inline mode - card mode keeps preview visible while editing
		if (previewStyle === "inline" && cursorPos >= start && cursorPos <= end) {
			return;
		}

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
				maxInlineLength,
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
			processed,
			isLoading,
			{
				previewStyle,
				inlineColorMode,
				cardColorMode
			}
		);

		decorations.push(...urlDecorations);
	};

	for (const range of expandToLines(doc, ranges)) {
		const text = doc.sliceString(range.from, range.to);
		const offset = range.from;

		// First pass: Wikilink URLs [[https://...]]
		// Second pass: Markdown links [text](url)
		const bracketed: UrlMatch[] = [...findWikilinkUrls(text), ...findMarkdownLinks(text)];
		for (const match of bracketed) {
			processUrlMatch(match.url, match.start + offset, match.end + offset, match.linkText);
		}

		// Third pass: Bare URLs, skipping any inside the links above
		for (const match of findBareUrls(text, new ClaimedRanges(bracketed))) {
			processUrlMatch(match.url, match.start + offset, match.end + offset);
		}
	}

	urlRanges.sort((a, b) => a.from - b.from);
	return { decorations, urlRanges, cursorSensitive: previewStyle === "inline" };
}
