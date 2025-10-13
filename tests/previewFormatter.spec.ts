import { strict as assert } from "assert";
import { __setRequestUrlMock } from "obsidian";
import { buildMarkdownPreview } from "../src/linkPreview/previewFormatter";
import { LinkPreviewBuilder } from "../src/linkPreview/previewBuilder";
import { LinkPreviewService } from "../src/services/linkPreviewService";
import type { MetadataHandler } from "../src/services/metadataHandlers";
import type { InlineLinkPreviewSettings } from "../src/settings";
import type { LinkMetadata } from "../src/services/linkPreviewService";
import { extractUrlList } from "../src/utils/url";
import { replaceUrlsWithPreviews } from "../src/editor/urlListConverter";
import type { RequestUrlParams, RequestUrlResponse } from "./stubs/obsidian";

function setRequestUrlMock(mock: ((params: RequestUrlParams) => Promise<RequestUrlResponse> | RequestUrlResponse) | null): void {
	(__setRequestUrlMock as unknown as (mock: ((params: RequestUrlParams) => Promise<RequestUrlResponse> | RequestUrlResponse) | null) => void)(mock);
}

function createSettings(overrides: Partial<InlineLinkPreviewSettings> = {}): InlineLinkPreviewSettings {
	return {
		autoPreviewOnPaste: true,
		includeDescription: true,
		maxDescriptionLength: 60,
		requestTimeoutMs: 7000,
		showFavicon: false,
		keepEmoji: true,
		dynamicPreviewMode: false,
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

function extractPreviewText(preview: string): string {
	const markdownMatch = preview.match(/^\[(.+)]\(<.+>\)$/);
	if (markdownMatch) {
		return markdownMatch[1].replace(/^!\[inline-link-preview-icon]\(<[^>]+>\)\s*/, "").trimStart();
	}

	const htmlMatch = preview.match(/<span class="inline-link-preview-text">([^<]+)<\/span>/);
	if (htmlMatch) {
		return htmlMatch[1];
	}

	return preview;
}

export default async function runPreviewFormatterTests(): Promise<void> {
	lowerLimitTruncates();
	zeroLimitRemovesDescription();
	highLimitKeepsFullText();
	stringLimitIsRespected();
	metadataHtmlTagsAreRemoved();
	urlListExtractionRecognizesMultipleUrls();
	urlListExtractionRejectsMixedContent();
	await replaceUrlsWithPreviewsHandlesMultipleLinks();
	await replaceUrlsWithPreviewsHandlesLargeBatch();
	await replaceUrlsWithPreviewsSkipsFailures();
	await replaceUrlsWithPreviewsReportsProgress();
	await replaceUrlsWithPreviewsHandlesMarkdownLinks();
	descriptionLimitHandlesEmDash();
	await googleSearchPreviewIncludesQuery();
	await descriptionLimitAppliesWithLocalParsing();
	await customMetadataHandlerCanOverrideMetadata();
	await youtubePreviewUsesGoogleFavicon();
	await noFaviconRenderedWhenGoogleUnavailable();
}

function lowerLimitTruncates(): void {
	const settings = createSettings({ maxDescriptionLength: 10 });
	const metadata = createMetadata();
	const output = buildMarkdownPreview("https://example.com/page", metadata, settings);
	const text = extractPreviewText(output);
	assert(text.endsWith("…"), "Preview text should end with an ellipsis when truncated.");
	assert(Array.from(text).length <= 10, "Preview text should respect the configured character limit.");
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
	const text = extractPreviewText(output);
	assert(
		text.includes("This is a long description"),
		"Preview text should remain intact when the limit exceeds its length.",
	);
	assert(!text.endsWith("…"), "No ellipsis should be added when the preview is within the limit.");
}

function stringLimitIsRespected(): void {
	const settings = createSettings({
		// Simulate settings stored as a string
		maxDescriptionLength: "15" as unknown as number,
	});
	const metadata = createMetadata();
	const output = buildMarkdownPreview("https://example.com/page", metadata, settings);
	const text = extractPreviewText(output);
	assert(Array.from(text).length <= 15, "String-based description limits should be coerced and respected.");
	assert(text.endsWith("…"), "Coerced limits should still append an ellipsis when truncating.");
}

function metadataHtmlTagsAreRemoved(): void {
	const settings = createSettings({ showFavicon: false });
	const metadata = createMetadata({
		title: "<strong>Ludicity &amp; Co.</strong>",
		description: '<blockquote>"While I\'m deeply sympathetic, the author should reconsider."</blockquote>',
	});
	const output = buildMarkdownPreview("https://ludic.mataroa.blog/", metadata, settings);
	const text = extractPreviewText(output);
	assert(
		text.includes("Ludicity & Co."),
		"HTML entities within titles should be decoded when building previews.",
	);
	assert(
		text.includes("While I'm deeply sympathetic"),
		"HTML markup should be stripped from descriptions while preserving text.",
	);
	assert(
		!output.includes("<blockquote"),
		"Generated markdown should not contain leftover HTML tags.",
	);
}

function urlListExtractionRecognizesMultipleUrls(): void {
	const clipboard = "<https://example.com>\nhttps://obsidian.md\n\nhttps://github.com";
	const entries = extractUrlList(clipboard);
	assert(entries && entries.length === 3, "extractUrlList should detect every URL in a pure list.");
	const urls = entries?.map((entry) => entry.url) ?? [];
	assert.deepEqual(
		urls,
		["https://example.com", "https://obsidian.md", "https://github.com"],
		"extractUrlList should normalize wrapped and bare URLs.",
	);
}

function urlListExtractionRejectsMixedContent(): void {
	assert.equal(
		extractUrlList("Take a look at https://example.com"),
		null,
		"extractUrlList should skip text that mixes prose with links.",
	);
	assert.equal(
		extractUrlList("- https://example.com"),
		null,
		"extractUrlList should skip link lists that include additional characters.",
	);
}

async function replaceUrlsWithPreviewsHandlesMultipleLinks(): Promise<void> {
	const clipboard = "<https://example.com>\nhttps://obsidian.md";
	const entries = extractUrlList(clipboard);
	assert(entries && entries.length === 2, "replaceUrlsWithPreviews requires URL metadata entries.");

	const builder = {
		async build(url: string): Promise<string> {
			return `[Preview for ${url}]`;
		},
	};

	const { text, converted } = await replaceUrlsWithPreviews(builder, clipboard, entries);

	assert.equal(converted, 2, "replaceUrlsWithPreviews should report the number of converted URLs.");
	assert.equal(
		text,
		"[Preview for https://example.com]\n[Preview for https://obsidian.md]",
		"replaceUrlsWithPreviews should substitute previews for every detected URL.",
	);
}

async function replaceUrlsWithPreviewsHandlesLargeBatch(): Promise<void> {
	const clipboard = Array.from({ length: 12 }, (_, index) => `https://example.com/page-${index + 1}`).join("\n");
	const entries = extractUrlList(clipboard);
	assert(entries && entries.length === 12, "extractUrlList should capture every URL in a large paste operation.");

	const builder = {
		async build(url: string): Promise<string> {
			return `Converted preview for ${url}`;
		},
	};

	const { text, converted } = await replaceUrlsWithPreviews(builder, clipboard, entries);
	assert.equal(converted, 12, "replaceUrlsWithPreviews should convert every URL when the builder succeeds.");

	const previews = text.split("\n");
	assert.equal(previews.length, 12, "Converted text should contain one preview per URL.");
	previews.forEach((preview, index) => {
		const expectedUrl = `https://example.com/page-${index + 1}`;
		assert.equal(preview, `Converted preview for ${expectedUrl}`, "Each preview should correspond to the correct URL.");
	});
}

async function replaceUrlsWithPreviewsSkipsFailures(): Promise<void> {
	const clipboard = "https://example.com\nhttps://obsidian.md";
	const entries = extractUrlList(clipboard);
	assert(entries && entries.length === 2, "replaceUrlsWithPreviews requires URL metadata entries.");

	const builder = {
		async build(url: string): Promise<string> {
			if (url.includes("obsidian")) {
				throw new Error("metadata unavailable");
			}
			return `(${url})`;
		},
	};

	const { text, converted } = await replaceUrlsWithPreviews(builder, clipboard, entries);

	assert.equal(converted, 1, "replaceUrlsWithPreviews should only count successful conversions.");
	assert.equal(
		text,
		"(https://example.com)\nhttps://obsidian.md",
		"replaceUrlsWithPreviews should fall back to the original URL when a preview fails.",
	);
}

async function replaceUrlsWithPreviewsReportsProgress(): Promise<void> {
	const clipboard = "https://example.com\nhttps://example.org";
	const entries = extractUrlList(clipboard);
	assert(entries && entries.length === 2, "replaceUrlsWithPreviews requires URL metadata entries.");

	const builder = {
		async build(url: string): Promise<string> {
			return `(${url})`;
		},
	};

	let recordedTotal: number | null = null;
	let increments = 0;
	let lastLabel: string | null = null;
	const progress = {
		setLabel(label: string) {
			lastLabel = label;
		},
		setTotal(total: number | null) {
			recordedTotal = total;
		},
		increment(amount = 1) {
			increments += amount;
		},
		finish() {
			// no-op for tests
		},
	};

	await replaceUrlsWithPreviews(builder, clipboard, entries, progress);
	progress.finish();

	assert.equal(recordedTotal, entries.length, "replaceUrlsWithPreviews should report the total number of URLs.");
	assert.equal(increments, entries.length, "replaceUrlsWithPreviews should increment progress for every URL processed.");
	assert.equal(lastLabel, null, "replaceUrlsWithPreviews should not update the progress label directly.");
}

async function replaceUrlsWithPreviewsHandlesMarkdownLinks(): Promise<void> {
	const url = "https://example.com/article";
	const markdown = `[${url}](${url})`;
	const entries = extractUrlList(markdown);
	assert(entries && entries.length === 1, "extractUrlList should treat markdown links as a single entry.");
	if (!entries) {
		throw new Error("extractUrlList did not return entries for markdown link");
	}

	const builder = {
		async build(requested: string): Promise<string> {
			return `converted:${requested}`;
		},
	};

	const { text, converted } = await replaceUrlsWithPreviews(builder, markdown, entries);
	assert.equal(text, `converted:${url}`, "Markdown links should be fully replaced by the preview markup.");
	assert.equal(converted, 1, "Converting a markdown link should only count once.");
}

function descriptionLimitHandlesEmDash(): void {
	const url = "https://example.com/fitness";
	const description = "Take your posture out of the equation — start strong and keep going until the finish line.";
	const settings = createSettings({ showFavicon: false, maxDescriptionLength: 40 });
	const metadata = createMetadata({
		title: "Strength Routine",
		description,
	});

	const preview = buildMarkdownPreview(url, metadata, settings);
	const match = preview.match(/— (.+)]\(<https:\/\/example\.com\/fitness>\)/);
	assert(match, "Preview should contain the truncated description after the dash.");
	const truncated = match?.[1] ?? "";
	assert(truncated.endsWith("…"), "Truncated description should end with an ellipsis.");
	const withoutEllipsis = truncated.slice(0, -1);
	const length = Array.from(withoutEllipsis).length;
	assert(length <= 40, "Truncated description should respect the configured character limit.");
}

async function googleSearchPreviewIncludesQuery(): Promise<void> {
	const googleUrl = "https://www.google.com/search?q=white+richlieu+hook+rack";
	const googleHtml = `
		<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<title>Google Search</title>
			</head>
			<body>
				<div>Sample Google results page</div>
			</body>
		</html>
	`;

	setRequestUrlMock(async ({ url, method }: RequestUrlParams) => {
		const normalizedMethod = (method ?? "GET").toUpperCase();
		if (url === googleUrl) {
	return {
		status: 200,
		text: googleHtml,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"x-final-url": googleUrl,
		},
	} as RequestUrlResponse;
		}

		if (/www\.google\.com\/s2\/favicons/.test(url)) {
	return {
		status: 200,
		text: "",
		headers: {
			"content-type": "image/png",
		},
	} as RequestUrlResponse;
		}

		throw new Error(`Unhandled requestUrl invocation: ${normalizedMethod} ${url}`);
	});

	try {
		const service = new LinkPreviewService({
			requestTimeoutMs: 0,
		});

		const settings = createSettings({ showFavicon: false, includeDescription: false });
		const builder = new LinkPreviewBuilder(service, () => settings);
		const preview = await builder.build(googleUrl);

		assert.equal(
			preview,
			"[Google Search — white richlieu hook rack](<https://www.google.com/search?q=white+richlieu+hook+rack>)",
			"Google search previews should include the search query in the title.",
		);
	} finally {
		setRequestUrlMock(null);
	}
}

async function descriptionLimitAppliesWithLocalParsing(): Promise<void> {
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

	const redditJsonUrl =
		"https://www.reddit.com/r/PixelBook/comments/1nxv8v5/i_am_deeply_embedded_within_the_google_android/.json";

	setRequestUrlMock(async ({ url, method }: RequestUrlParams) => {
		const normalizedMethod = (method ?? "GET").toUpperCase();
		if (url === redditUrl) {
	return {
		status: 200,
		text: redditHtml,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"x-final-url": redditUrl,
		},
	} as RequestUrlResponse;
		}

		if (url === redditJsonUrl) {
	return {
		status: 200,
		text: redditJson,
		headers: {
			"content-type": "application/json",
		},
	} as RequestUrlResponse;
		}

		if (/www\.google\.com\/s2\/favicons/.test(url)) {
	return {
		status: 200,
		text: "",
		headers: {
			"content-type": "image/png",
		},
	} as RequestUrlResponse;
		}

		throw new Error(`Unhandled requestUrl invocation: ${normalizedMethod} ${url}`);
	});

	try {
		const service = new LinkPreviewService({
			requestTimeoutMs: 0,
		});

		const settings = createSettings({ maxDescriptionLength: 60, showFavicon: false });
		const builder = new LinkPreviewBuilder(service, () => settings);
	const preview = await builder.build(redditUrl);

	const text = extractPreviewText(preview);
	assert(
		text.startsWith("r/PixelBook — "),
		`Reddit previews should begin with the subreddit name followed by the post title. Received: ${text}`,
	);
	assert(
		text.includes("I am deeply embedded within the Google"),
		"Reddit previews should surface the original post title immediately after the subreddit name.",
	);
	assert(Array.from(text).length <= settings.maxDescriptionLength, "Preview text should respect the configured limit for Reddit links.");
	} finally {
		setRequestUrlMock(null);
	}
}

async function customMetadataHandlerCanOverrideMetadata(): Promise<void> {
	const articleUrl = "https://example.org/articles/123";
	const articleHtml = `
		<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<title>Example Domain</title>
			</head>
			<body>
				<h1>Example placeholder</h1>
			</body>
		</html>
	`;

	setRequestUrlMock(async ({ url, method }: RequestUrlParams) => {
		const normalizedMethod = (method ?? "GET").toUpperCase();
		if (url === articleUrl) {
	return {
		status: 200,
		text: articleHtml,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"x-final-url": articleUrl,
		},
	} as RequestUrlResponse;
		}

		if (/www\.google\.com\/s2\/favicons/.test(url)) {
	return {
		status: 200,
		text: "",
		headers: {
			"content-type": "image/png",
		},
	} as RequestUrlResponse;
		}

		throw new Error(`Unhandled requestUrl invocation: ${normalizedMethod} ${url}`);
	});

	try {
		const service = new LinkPreviewService({
			requestTimeoutMs: 0,
		});

		const customHandler: MetadataHandler = {
			matches: ({ url }) => url.hostname === "example.org",
			async enrich({ metadata }) {
				metadata.title = "Example Override";
				metadata.description = "Custom summary for Example.";
			},
		};

		service.registerMetadataHandler(customHandler);

		const settings = createSettings({ includeDescription: true, maxDescriptionLength: 120, showFavicon: false });
		const builder = new LinkPreviewBuilder(service, () => settings);
		const preview = await builder.build(articleUrl);

		assert.equal(
			preview,
			"[Example Override — Custom summary for Example.](<https://example.org/articles/123>)",
			"Custom metadata handlers should be able to override titles and descriptions for new domains.",
		);
	} finally {
		setRequestUrlMock(null);
	}
}

async function noFaviconRenderedWhenGoogleUnavailable(): Promise<void> {
	const articleUrl = "https://news.example.com/story";

	const articleHtml = `
		<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<title>Example News Story</title>
			</head>
			<body>
				<p>Example article</p>
			</body>
		</html>
	`;

	setRequestUrlMock(async ({ url, method }: RequestUrlParams) => {
		const normalizedMethod = (method ?? "GET").toUpperCase();

		if (url === articleUrl) {
	return {
		status: 200,
		text: articleHtml,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"x-final-url": articleUrl,
		},
	} as RequestUrlResponse;
		}

		if (/www\.google\.com\/s2\/favicons/.test(url)) {
	return {
		status: 404,
		text: "",
		headers: {
			"content-type": "text/plain",
		},
	} as RequestUrlResponse;
		}

		throw new Error(`Unhandled requestUrl invocation: ${normalizedMethod} ${url}`);
	});

	try {
		const service = new LinkPreviewService({
			requestTimeoutMs: 0,
		});

		const settings = createSettings({ showFavicon: true, includeDescription: false });
		const builder = new LinkPreviewBuilder(service, () => settings);
		const preview = await builder.build(articleUrl);

	assert(
		!preview.includes("![inline-link-preview-icon]"),
		"Sites without a favicon should not render the inline icon when Google's favicon service cannot provide one.",
	);
	assert(
		!preview.includes("https://www.google.com/s2/favicons"),
		"Sites without a favicon should leave the preview without referencing the Google favicon URL when none is available.",
	);
	} finally {
		setRequestUrlMock(null);
	}
}
async function youtubePreviewUsesGoogleFavicon(): Promise<void> {
	const youtubeUrl = "https://www.youtube.com/watch?v=abcdefghijk";
	const youtubeHtml = `
		<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<title>YouTube Video Title</title>
				<meta property="og:title" content="YouTube Video Title" />
				<meta property="og:description" content="Video description from local parsing." />
			</head>
			<body>
				<div>YouTube placeholder</div>
			</body>
		</html>
	`;

	setRequestUrlMock(async ({ url, method }: RequestUrlParams) => {
		const normalizedMethod = (method ?? "GET").toUpperCase();
		if (url === youtubeUrl) {
	return {
		status: 200,
		text: youtubeHtml,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"x-final-url": youtubeUrl,
		},
	} as RequestUrlResponse;
		}

		if (url === "https://www.youtube.com/favicon.ico") {
	return {
		status: 200,
		text: "",
		headers: {
			"content-type": "image/x-icon",
		},
	} as RequestUrlResponse;
		}

		throw new Error(`Unhandled requestUrl invocation: ${normalizedMethod} ${url}`);
	});

	try {
		const service = new LinkPreviewService({
			requestTimeoutMs: 0,
		});

		const settings = createSettings({ showFavicon: true, includeDescription: false });
		const builder = new LinkPreviewBuilder(service, () => settings);
		const preview = await builder.build(youtubeUrl);

		assert(preview.startsWith("["), "YouTube previews should render as standard Markdown links.");
		assert(
			preview.includes("YouTube Video Title"),
			"YouTube previews should render the video title.",
		);
		assert(
			preview.includes("https://www.youtube.com/watch?v=abcdefghijk"),
			"YouTube previews should link to the canonical youtube.com watch URL.",
		);
		assert(!preview.includes("img.youtube.com"), "YouTube previews should avoid embedding the video thumbnail in the output.");
		assert(!preview.includes("favicon"), "Favicons should not be embedded in the Markdown output.");
	} finally {
		setRequestUrlMock(null);
	}
}
