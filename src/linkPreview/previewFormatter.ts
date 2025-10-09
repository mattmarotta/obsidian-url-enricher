import type { InlineLinkPreviewSettings } from "../settings";
import type { LinkMetadata } from "../services/linkPreviewService";

const ELLIPSIS = "\u2026";

export function buildMarkdownPreview(
	url: string,
	metadata: LinkMetadata,
	settings: InlineLinkPreviewSettings,
): string {
	const title = sanitizeLinkText(metadata.title, settings.keepEmoji) || deriveTitleFromUrl(url);
	let description = metadata.description
		? sanitizeLinkText(metadata.description, settings.keepEmoji)
		: null;

	if (!settings.includeDescription) {
		description = null;
	}

	if (description) {
		description = truncate(description, settings.maxDescriptionLength);
	}

	const linkText = description ? `${title} — ${description}` : title;
	const escapedText = escapeMarkdownLinkText(linkText);
	const components = [];

	if (settings.showFavicon && metadata.favicon) {
		components.push(buildImageComponent(metadata.favicon));
	}
	components.push(escapedText);

	const linkDestination = formatLinkDestination(url);
	return `[${components.join(" ")}](${linkDestination})`;
}

function sanitizeLinkText(value: string, keepEmoji: boolean): string {
	const trimmed = value.replace(/\s+/g, " ").trim();
	return keepEmoji ? trimmed : stripEmoji(trimmed);
}

function truncate(value: string, maxLength: number): string {
	if (value.length <= maxLength) {
		return value;
	}

	const trimmed = value.slice(0, maxLength).trimEnd();
	return trimmed.endsWith(".") || trimmed.endsWith("!") || trimmed.endsWith("?")
		? trimmed
		: `${trimmed}${ELLIPSIS}`;
}

function escapeMarkdownLinkText(text: string): string {
	return text.replace(/([\[\]\\])/g, "\\$1");
}

function buildImageComponent(url: string): string {
	return `![inline-link-preview-icon](${formatLinkDestination(url)})`;
}

function formatLinkDestination(url: string): string {
	if (!url) {
		return url;
	}
	return `<${url}>`;
}

function deriveTitleFromUrl(url: string): string {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.replace(/^www\./i, "");
		if (parsed.pathname && parsed.pathname !== "/") {
			const segments = parsed.pathname.split("/").filter(Boolean);
			const lastSegment = segments[segments.length - 1] ?? "";
			return lastSegment ? `${host} / ${decodeURIComponent(lastSegment)}` : host;
		}
		return host || parsed.href;
	} catch {
		return url;
	}
}

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
