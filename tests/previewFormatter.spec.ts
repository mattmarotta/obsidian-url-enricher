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
	urlListExtractionRecognizesMultipleUrls();
	urlListExtractionRejectsMixedContent();
	await replaceUrlsWithPreviewsHandlesMultipleLinks();
	await replaceUrlsWithPreviewsSkipsFailures();
	await googleSearchPreviewIncludesQuery();
	await descriptionLimitAppliesWithoutLinkPreviewApi();
	await customMetadataHandlerCanOverrideMetadata();
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

	__setRequestUrlMock(async ({ url, method }) => {
		const normalizedMethod = (method ?? "GET").toUpperCase();
		if (url === googleUrl) {
			return {
				status: 200,
				text: googleHtml,
				headers: {
					"content-type": "text/html; charset=utf-8",
					"x-final-url": googleUrl,
				},
			};
		}

		if (url === "https://www.google.com/favicon.ico") {
			return {
				status: 200,
				text: "",
				headers: {
					"content-type": "image/x-icon",
				},
			};
		}

		if (/google\.com\/favicon/i.test(url) || /google\.com\/apple-touch-icon/i.test(url)) {
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

		const settings = createSettings({ showFavicon: false, includeDescription: false });
		const builder = new LinkPreviewBuilder(service, () => settings);
		const preview = await builder.build(googleUrl);

		assert.equal(
			preview,
			"[Google Search — white richlieu hook rack](<https://www.google.com/search?q=white+richlieu+hook+rack>)",
			"Google search previews should include the search query in the title.",
		);
	} finally {
		__setRequestUrlMock(null);
	}
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

	const faviconUrl = "https://example.org/favicon.ico";

	__setRequestUrlMock(async ({ url, method }) => {
		const normalizedMethod = (method ?? "GET").toUpperCase();
		if (url === articleUrl) {
			return {
				status: 200,
				text: articleHtml,
				headers: {
					"content-type": "text/html; charset=utf-8",
					"x-final-url": articleUrl,
				},
			};
		}

		if (url === faviconUrl) {
			return {
				status: 200,
				text: "",
				headers: {
					"content-type": "image/x-icon",
				},
			};
		}

		if (/example\.org\/favicon/i.test(url) || /example\.org\/apple-touch-icon/i.test(url)) {
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
		__setRequestUrlMock(null);
	}
}
