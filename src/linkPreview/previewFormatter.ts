import type { InlineLinkPreviewSettings } from "../settings";
import { sanitizeTextContent } from "../utils/text";
import type { LinkMetadata } from "../services/linkPreviewService";

const ELLIPSIS = "\u2026";
const DEFAULT_DESCRIPTION_LIMIT = 60;

interface NormalizedLink {
	url: string;
	type: "default" | "youtube";
}

export function buildMarkdownPreview(
	url: string,
	metadata: LinkMetadata,
	settings: InlineLinkPreviewSettings,
): string {
	const title = sanitizeLinkText(metadata.title, settings.keepEmoji) || deriveTitleFromUrl(url);
	let description = metadata.description
		? sanitizeLinkText(metadata.description, settings.keepEmoji)
		: null;

	const limitInput = settings.maxDescriptionLength as unknown;
	let limitValue: number;
	if (typeof limitInput === "string") {
		limitValue = Number(limitInput);
	} else if (typeof limitInput === "number") {
		limitValue = limitInput;
	} else {
		limitValue = Number.NaN;
	}

	const limit = Number.isFinite(limitValue) ? Math.max(0, Math.round(limitValue)) : DEFAULT_DESCRIPTION_LIMIT;

	if (!settings.includeDescription || limit === 0) {
		description = null;
	}

	const linkText = description ? `${title} — ${description}` : title;
	const limitedLinkText = limit > 0 ? truncate(linkText, limit) : linkText;
	const normalized = normalizeLinkUrl(url);

	const iconMarkdown =
		settings.showFavicon && metadata.favicon ? buildImageComponent(metadata.favicon) : null;
	const iconHtml = settings.showFavicon && metadata.favicon ? buildImageHtml(metadata.favicon) : null;

	if (normalized.type === "youtube") {
		return buildYoutubeLinkHtml(normalized.url, iconHtml, limitedLinkText);
	}

	const components: string[] = [];
	if (iconMarkdown) {
		components.push(iconMarkdown);
	}

	const escapedText = escapeMarkdownLinkText(limitedLinkText);
	components.push(escapedText);

	const linkDestination = formatLinkDestination(normalized.url);
	return `[${components.join(" ")}](${linkDestination})`;
}

function sanitizeLinkText(value: string, keepEmoji: boolean): string {
	const sanitized = sanitizeTextContent(value);
	if (!sanitized) {
		return "";
	}
	return keepEmoji ? sanitized : stripEmoji(sanitized);
}

function truncate(value: string, maxLength: number): string {
	const units = Array.from(value);
	if (units.length <= maxLength) {
		return value;
	}

	if (maxLength <= 1) {
		return ELLIPSIS.slice(0, maxLength);
	}

	let trimmed = units.slice(0, maxLength - 1).join("").trimEnd();
	if (trimmed.endsWith(".") || trimmed.endsWith("!") || trimmed.endsWith("?")) {
		return trimmed;
	}
	return `${trimmed}${ELLIPSIS}`;
}

function escapeMarkdownLinkText(text: string): string {
	return text.replace(/([\[\]\\])/g, "\\$1");
}

function buildImageComponent(url: string): string | null {
	if (!url) {
		return null;
	}
	return `![inline-link-preview-icon](${formatLinkDestination(url)})`;
}

function buildImageHtml(url: string): string | null {
	if (!url) {
		return null;
	}
	const escaped = escapeAttribute(url);
	return `<img class="inline-link-preview-icon" src="${escaped}" alt="inline-link-preview-icon" width="16" height="16" loading="lazy" decoding="async">`;
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

function normalizeLinkUrl(url: string): NormalizedLink {
	const youTubeId = extractYouTubeVideoId(url);
	if (!youTubeId) {
		return { url, type: "default" };
	}

	const parameters = extractYouTubeParameters(url);
	const searchParams = new URLSearchParams();
	searchParams.set("v", youTubeId);

	if (parameters.t) {
		const seconds = convertTimestampToSeconds(parameters.t);
		if (seconds > 0) {
			searchParams.set("start", String(seconds));
		}
	}

	if (parameters.start && !searchParams.has("start")) {
		searchParams.set("start", String(parameters.start));
	}

	return { url: `https://www.youtube-nocookie.com/watch?${searchParams.toString()}`, type: "youtube" };
}

function extractYouTubeVideoId(url: string): string | null {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.toLowerCase();
		if (host === "youtu.be") {
			const segment = parsed.pathname.split("/").filter(Boolean)[0];
			return segment ?? null;
		}

		if (host.endsWith("youtube.com")) {
			if (parsed.pathname === "/watch") {
				return parsed.searchParams.get("v");
			}

			if (parsed.pathname.startsWith("/shorts/")) {
				const segment = parsed.pathname.split("/").filter(Boolean)[1];
				return segment ?? null;
			}
		}

		return null;
	} catch {
		return null;
	}
}

function extractYouTubeParameters(url: string): { t?: string; start?: number } {
	try {
		const parsed = new URL(url);
		const params: { t?: string; start?: number } = {};

		const tParam = parsed.searchParams.get("t");
		if (tParam) {
			params.t = tParam;
		}

		const startParam = parsed.searchParams.get("start");
		if (startParam) {
			const value = Number(startParam);
			if (Number.isFinite(value) && value >= 0) {
				params.start = Math.floor(value);
			}
		}

		if (!params.t) {
			const hash = parsed.hash?.replace(/^#/, "") ?? "";
			if (hash) {
				const hashParams = new URLSearchParams(hash);
				const tHash = hashParams.get("t");
				if (tHash) {
					params.t = tHash;
				}
				const startHash = hashParams.get("start");
				if (startHash) {
					const value = Number(startHash);
					if (Number.isFinite(value) && value >= 0) {
						params.start = Math.floor(value);
					}
				}
			}
		}

		return params;
	} catch {
		return {};
	}
}

function convertTimestampToSeconds(value: string): number {
	if (!value) {
		return 0;
	}

	if (/^\d+$/.test(value)) {
		return Math.max(0, Number(value));
	}

	const match = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
	if (!match) {
		return 0;
	}

	const hours = Number(match[1] ?? 0);
	const minutes = Number(match[2] ?? 0);
	const seconds = Number(match[3] ?? 0);

	if (![hours, minutes, seconds].some((part) => Number.isFinite(part) && part > 0)) {
		return 0;
	}

	return hours * 3600 + minutes * 60 + seconds;
}

function buildYoutubeLinkHtml(url: string, iconHtml: string | null, linkText: string): string {
	const escapedUrl = escapeAttribute(url);
	const escapedText = escapeHtml(linkText);
	const parts: string[] = [];
	if (iconHtml) {
		parts.push(iconHtml);
	}
	parts.push(`<span class="inline-link-preview-text">${escapedText}</span>`);
	return `<a class="inline-link-preview-link" href="${escapedUrl}" rel="noopener noreferrer">${parts.join(" ")}</a>`;
}

function escapeAttribute(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function escapeHtml(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
