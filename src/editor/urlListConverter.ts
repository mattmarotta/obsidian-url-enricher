import type { LinkPreviewBuilder } from "../linkPreview/previewBuilder";
import type { UrlListEntry } from "../utils/url";
import type { ProgressReporter } from "../status/progressStatusManager";
import { findMarkdownLinkRange } from "../utils/markdown";

type PreviewBuilder = Pick<LinkPreviewBuilder, "build">;

export interface UrlListConversionResult {
	text: string;
	converted: number;
}

export async function replaceUrlsWithPreviews(
	builder: PreviewBuilder,
	originalText: string,
	entries: UrlListEntry[],
	progress?: ProgressReporter,
): Promise<UrlListConversionResult> {
	let result = "";
	let cursor = 0;
	let converted = 0;

	if (progress) {
		progress.setTotal(entries.length);
	}

	for (const entry of entries) {
		if (entry.end <= cursor) {
			progress?.increment();
			continue;
		}

		const markdownRange = findMarkdownLinkRange(originalText, entry.start, entry.end);
		const replaceStart = markdownRange ? markdownRange.start : entry.start;
		const replaceEnd = markdownRange ? markdownRange.end : entry.end;

		result += originalText.slice(cursor, replaceStart);

		let preview: string;
		try {
			preview = await builder.build(entry.url);
		} catch (error) {
			console.warn(
				"[inline-link-preview] Failed to build preview for URL in paste",
				entry.url,
				error instanceof Error ? error.message : error,
			);
			preview = entry.url;
		}

		if (preview !== entry.url) {
			converted += 1;
		}

		result += preview;
		progress?.increment();
		cursor = replaceEnd;
	}

	result += originalText.slice(cursor);

	return { text: result, converted };
}
