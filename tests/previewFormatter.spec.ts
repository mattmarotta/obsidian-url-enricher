import { strict as assert } from "assert";
import { __setRequestUrlMock } from "obsidian";
import { buildMarkdownPreview } from "../src/linkPreview/previewFormatter";
import { LinkPreviewBuilder } from "../src/linkPreview/previewBuilder";
import { LinkPreviewService } from "../src/services/linkPreviewService";
import type { InlineLinkPreviewSettings } from "../src/settings";
import type { LinkMetadata } from "../src/services/linkPreviewService";

function createSettings(overrides: Partial<InlineLinkPreviewSettings> = {}): InlineLinkPreviewSettings {
	return {
		autoPreviewOnPaste: true,
		includeDescription: true,
		maxDescriptionLength: 60,
		requestTimeoutMs: 7000,
		showFavicon: false,
		keepEmoji: true,
		useLinkPreviewApi: false,
		linkPreviewApiKey: "",
		showRateLimitTimer: false,
		...overrides,
	};
}

function createMetadata(overrides: Partial<LinkMetadata> = {}): LinkMetadata {
	return {
		title: "Sample Title",
		description: "This is a long description that should be trimmed when the limit is enforced.",
		favicon: null,
		...overrides,
	};
}

export default async function runPreviewFormatterTests(): Promise<void> {
	lowerLimitTruncates();
	zeroLimitRemovesDescription();
	highLimitKeepsFullText();
	stringLimitIsRespected();
	await descriptionLimitAppliesWithoutLinkPreviewApi();
}

function lowerLimitTruncates(): void {
	const settings = createSettings({ maxDescriptionLength: 10 });
	const metadata = createMetadata();
	const output = buildMarkdownPreview("https://example.com/page", metadata, settings);
	assert(
		output.includes("Sample Title — This is a…"),
		"Description should truncate and append ellipsis when a short limit is set.",
	);
}

function zeroLimitRemovesDescription(): void {
	const settings = createSettings({ maxDescriptionLength: 0 });
	const metadata = createMetadata();
	const output = buildMarkdownPreview("https://example.com/page", metadata, settings);
	assert.equal(
		output,
		"[Sample Title](<https://example.com/page>)",
		"Description should be removed entirely when limit is zero.",
	);
}

function highLimitKeepsFullText(): void {
	const settings = createSettings({ maxDescriptionLength: 200 });
	const metadata = createMetadata();
	const output = buildMarkdownPreview("https://example.com/page", metadata, settings);
	assert(
		output.includes("Sample Title — This is a long description"),
		"Description should remain intact when the limit exceeds its length.",
	);
}

function stringLimitIsRespected(): void {
	const settings = createSettings({
		// Simulate settings stored as a string
		maxDescriptionLength: "15" as unknown as number,
	});
	const metadata = createMetadata();
	const output = buildMarkdownPreview("https://example.com/page", metadata, settings);
	assert(
		output.includes("Sample Title — This is a"),
		"String-based description limits should be coerced and respected.",
	);
	assert(!output.includes("trimmed when the limit"), "Description should be truncated to approximately 15 characters.");
}

async function descriptionLimitAppliesWithoutLinkPreviewApi(): Promise<void> {
	const redditUrl =
		"https://www.reddit.com/r/PixelBook/comments/1nxv8v5/i_am_deeply_embedded_within_the_google_android/";
	const longTitle =
		"I am deeply embedded within the Google android ecosystem Pixelbook go Pixel phone Pixel earbuds have we seen the best of Google ecosystem or is better coming?";

	const redditHtml = `
		<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<title>${longTitle}</title>
			</head>
			<body>
				<h1>Reddit placeholder</h1>
			</body>
		</html>
	`;

	const redditJson = JSON.stringify([
		{
			data: {
				children: [
					{
						data: {
							title: longTitle,
							selftext: "",
							public_description: "",
							subreddit: "PixelBook",
						},
					},
				],
			},
		},
	]);

	const redditFavicon = "https://www.reddit.com/favicon.ico";
	const redditJsonUrl =
		"https://www.reddit.com/r/PixelBook/comments/1nxv8v5/i_am_deeply_embedded_within_the_google_android/.json";

	__setRequestUrlMock(async ({ url, method }) => {
		const normalizedMethod = (method ?? "GET").toUpperCase();
		if (url === redditUrl) {
			return {
				status: 200,
				text: redditHtml,
				headers: {
					"content-type": "text/html; charset=utf-8",
					"x-final-url": redditUrl,
				},
			};
		}

		if (url === redditJsonUrl) {
			return {
				status: 200,
				text: redditJson,
				headers: {
					"content-type": "application/json",
				},
			};
		}

		if (url === redditFavicon) {
			return {
				status: normalizedMethod === "HEAD" ? 200 : 200,
				text: "",
				headers: {
					"content-type": "image/x-icon",
				},
			};
		}

		if (/reddit\.com\/favicon/i.test(url) || /apple-touch-icon/i.test(url)) {
			return {
				status: 404,
				text: "",
				headers: {
					"content-type": "text/plain",
				},
			};
		}

		throw new Error(`Unhandled requestUrl invocation: ${normalizedMethod} ${url}`);
	});

	try {
		const service = new LinkPreviewService({
			requestTimeoutMs: 0,
			useLinkPreviewApi: false,
			linkPreviewApiKey: null,
		});

		const settings = createSettings({ maxDescriptionLength: 60, showFavicon: false });
		const builder = new LinkPreviewBuilder(service, () => settings);
		const preview = await builder.build(redditUrl);

		assert(
			preview.startsWith("[r/PixelBook - Reddit — I am deeply embedded within the Google android ecosystem Pix…"),
			"Reddit previews should use subreddit-based titles and truncate the post text when LinkPreview.net is disabled.",
		);
		assert(
			!preview.includes("Pixel earbuds have we seen the best of Google ecosystem or is better coming?"),
			"Truncated reddit previews should not include text beyond the configured description length.",
		);
	} finally {
		__setRequestUrlMock(null);
	}
}
