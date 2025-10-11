import type { LinkPreviewBuilder } from "../linkPreview/previewBuilder";
import type { UrlListEntry } from "../utils/url";
import type { ProgressReporter } from "../status/progressStatusManager";

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
		result += originalText.slice(cursor, entry.start);

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
		cursor = entry.end;
	}

	result += originalText.slice(cursor);

	return { text: result, converted };
}
