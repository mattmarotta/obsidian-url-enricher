import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EditorState, RangeSetBuilder } from "@codemirror/state";
import { EditorView, Decoration, DecorationSet, ViewPlugin, WidgetType } from "@codemirror/view";
import { editorLivePreviewField } from "obsidian";
import { createUrlPreviewDecorator } from "../../src/editor/urlPreviewDecorator";
import { DEFAULT_SETTINGS } from "../../src/settings";
import type { LinkMetadata } from "../../src/services/types";

/**
 * End-to-end rendering tests that mount a REAL CodeMirror EditorView with the
 * real decorator, so regressions in decoration lifecycle are caught.
 *
 * Regression coverage:
 *  - metadata fetches must be queued even when the caret sits in the URL
 *    (otherwise a just-pasted link never starts loading)
 *  - card previews must render their title even with no favicon
 */

const DOC = [
	"Bare URL: https://github.com",
	"Markdown link: [some link](https://en.wikipedia.org/wiki/Obsidian)",
	"Wikilink: [[https://reddit.com/r/ObsidianMD]]",
].join("\n");

const URLS = [
	"https://github.com",
	"https://en.wikipedia.org/wiki/Obsidian",
	"https://reddit.com/r/ObsidianMD",
];

class FakeService {
	cache = new Map<string, LinkMetadata>();
	/** urls that getMetadata() was actually called for */
	requested: string[] = [];
	private resolvers = new Map<string, () => void>();

	constructor(private withFavicon = false) {}

	hasCachedMetadata(url: string) {
		return this.cache.has(url);
	}
	getCachedMetadata(url: string) {
		return this.cache.get(url);
	}
	getMetadata(url: string): Promise<LinkMetadata> {
		this.requested.push(url);
		return new Promise((res) => {
			this.resolvers.set(url, () => {
				const md = {
					url,
					title: `TITLE ${url}`,
					description: "a description",
					favicon: this.withFavicon ? "https://icon.example/i.png" : null,
				} as unknown as LinkMetadata;
				this.cache.set(url, md);
				res(md);
			});
		});
	}
	resolveOne(url: string) {
		this.resolvers.get(url)?.();
	}
	async settleAll() {
		for (const url of URLS) {
			this.resolvers.get(url)?.();
		}
	}
}

function titles(view: EditorView): string[] {
	return Array.from(view.dom.querySelectorAll(".url-preview__title")).map((e) =>
		(e.textContent ?? "").replace("TITLE ", "")
	);
}

/**
 * The decorator coalesces repaints onto a timer, so assertions must wait for
 * the repaint to actually land rather than sleeping a fixed amount (which
 * races under load).
 */
async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (!predicate()) {
		if (Date.now() > deadline) {
			throw new Error("waitFor: condition not met within timeout");
		}
		await new Promise((r) => setTimeout(r, 1));
	}
}

function mount(
	service: FakeService,
	previewStyle: "inline" | "card",
	cursorPos: number
): EditorView {
	const settings = { ...DEFAULT_SETTINGS, previewStyle };
	const plugin = createUrlPreviewDecorator(service as never, () => settings);
	const parent = document.createElement("div");
	document.body.appendChild(parent);
	return new EditorView({
		state: EditorState.create({
			doc: DOC,
			selection: { anchor: cursorPos },
			extensions: [editorLivePreviewField, plugin],
		}),
		parent,
	});
}

describe("decorator rendering (real CodeMirror)", () => {
	let view: EditorView | null = null;

	beforeEach(() => {
		view?.destroy();
		view = null;
	});

	it("queues a metadata fetch for every URL even when the caret is inside one", () => {
		const service = new FakeService();
		// caret at end of doc == inside the last link, where pasting leaves it
		view = mount(service, "inline", DOC.length);

		expect(service.requested.sort()).toEqual([...URLS].sort());
	});

	it("inline: reveals the caret-occupied preview as soon as the caret moves, with no refetch", async () => {
		const service = new FakeService();
		view = mount(service, "inline", DOC.length);
		await service.settleAll();
		await waitFor(() => titles(view!).length === 2);

		// link under the caret stays as raw text while editing
		expect(titles(view)).toEqual([URLS[0], URLS[1]]);

		const requestsBeforeMove = service.requested.length;
		view.dispatch({ selection: { anchor: 0 } });

		// it appears immediately - the data was already fetched
		expect(titles(view)).toEqual(URLS);
		expect(service.requested.length).toBe(requestsBeforeMove);
	});

	it("card: renders titles for all URLs when there is no favicon", async () => {
		const service = new FakeService(false);
		view = mount(service, "card", DOC.length);
		await service.settleAll();
		await waitFor(() => titles(view!).length === URLS.length);

		expect(titles(view)).toEqual(URLS);
	});

	it("card: renders titles for all URLs when there is a favicon", async () => {
		const service = new FakeService(true);
		view = mount(service, "card", DOC.length);
		await service.settleAll();
		await waitFor(() => titles(view!).length === URLS.length);

		expect(titles(view)).toEqual(URLS);
		expect(view.dom.querySelectorAll(".url-preview__favicon").length).toBe(3);
	});

	it("renders each preview as its own fetch lands, one at a time", async () => {
		const service = new FakeService();
		view = mount(service, "card", 0);

		const counts: number[] = [];
		let expected = 0;
		for (const url of URLS) {
			service.resolveOne(url);
			expected += 1;
			await waitFor(() => titles(view!).length === expected);
			counts.push(titles(view).length);
		}

		expect(counts).toEqual([1, 2, 3]);
	});

	it("still repaints when a fetch resolves alongside a document change", async () => {
		const service = new FakeService();
		view = mount(service, "card", 0);

		for (const url of URLS) service.resolveOne(url);
		view.dispatch({ changes: { from: 0, insert: "x" } });
		await waitFor(() => titles(view!).length === 3);

		expect(titles(view).length).toBe(3);
	});


	it("wins decoration precedence over Live Preview's own bracketed-range widgets", async () => {
		// Obsidian's Live Preview installs replace decorations over
		// [text](url) and [[url]] before plugin extensions load. At default
		// precedence those beat ours and only bare URLs ever rendered.
		class Stub extends WidgetType {
			toDOM() {
				const s = document.createElement("span");
				s.className = "competing-widget";
				s.textContent = "obsidian-own";
				return s;
			}
		}
		const bracketed = [
			/\[\[https?:\/\/[^\]]+\]\]/g,
			/\[[^\]]*\]\(https?:\/\/[^)]+\)/g,
		].flatMap((re) => {
			const out: { from: number; to: number }[] = [];
			let m: RegExpExecArray | null;
			while ((m = re.exec(DOC)) !== null) out.push({ from: m.index, to: m.index + m[0].length });
			return out;
		}).sort((a, b) => a.from - b.from);

		const competitor = ViewPlugin.fromClass(
			class {
				decorations: DecorationSet;
				constructor() {
					const b = new RangeSetBuilder<Decoration>();
					for (const { from, to } of bracketed) {
						b.add(from, to, Decoration.replace({ widget: new Stub() }));
					}
					this.decorations = b.finish();
				}
			},
			{ decorations: (v) => v.decorations }
		);

		const service = new FakeService();
		// inline mode is the affected one: it replaces the whole link range,
		// so it collides head-on with Live Preview's own replace decoration
		const settings = { ...DEFAULT_SETTINGS, previewStyle: "inline" as const };
		const parent = document.createElement("div");
		document.body.appendChild(parent);
		// competitor registered FIRST, as Obsidian's core extensions are
		view = new EditorView({
			state: EditorState.create({
				doc: DOC,
				selection: { anchor: 0 },
				extensions: [
					editorLivePreviewField,
					competitor,
					createUrlPreviewDecorator(service as never, () => settings),
				],
			}),
			parent,
		});
		await service.settleAll();
		await waitFor(() => titles(view!).length === URLS.length);

		// all three render, including the two bracketed ones
		expect(titles(view)).toEqual(URLS);
		// and Live Preview's widgets are suppressed on those ranges
		expect(view.dom.querySelectorAll(".competing-widget").length).toBe(0);
	});

});

describe("previews with a context label (real CodeMirror)", () => {
	const POST_URL = "https://www.reddit.com/r/Sub/comments/abc123/post_title/";
	const POST_DOC = `See ${POST_URL}\nmore text`;

	/** Serves one fixed metadata object for every URL. */
	class StaticService {
		constructor(private metadata: LinkMetadata) {}
		hasCachedMetadata() {
			return true;
		}
		getCachedMetadata() {
			return this.metadata;
		}
		getMetadata() {
			return Promise.resolve(this.metadata);
		}
	}

	let view: EditorView | null = null;

	beforeEach(() => {
		view?.destroy();
		view = null;
	});

	afterEach(() => {
		view?.dom.parentElement?.remove();
		view?.destroy();
		view = null;
	});

	function mountPost(metadata: LinkMetadata, overrides: Partial<typeof DEFAULT_SETTINGS>): EditorView {
		const settings = { ...DEFAULT_SETTINGS, ...overrides };
		const plugin = createUrlPreviewDecorator(new StaticService(metadata) as never, () => settings);
		const parent = document.createElement("div");
		document.body.appendChild(parent);
		return new EditorView({
			state: EditorState.create({
				doc: POST_DOC,
				selection: { anchor: 0 },
				extensions: [editorLivePreviewField, plugin],
			}),
			parent,
		});
	}

	function text(selector: string): string[] {
		return Array.from(view!.dom.querySelectorAll(selector)).map((e) => e.textContent ?? "");
	}

	const redditPost: LinkMetadata = {
		context: "r/Sub",
		title: "Post title",
		description: "The body of the post.",
		favicon: "https://icon.example/reddit.png",
	};

	it("inline: renders '<context> — <title>' and leaves the description out", () => {
		view = mountPost(redditPost, { previewStyle: "inline" });

		expect(text(".url-preview__text")).toEqual(["r/Sub — Post title"]);
		expect(text(".url-preview__title")).toEqual(["r/Sub"]);
		expect(text(".url-preview__description")).toEqual(["Post title"]);
		expect(view.dom.querySelectorAll(".url-preview--inline .url-preview__favicon").length).toBe(1);
	});

	it("card: puts the context in the header, then the post title, then the description", () => {
		view = mountPost(redditPost, { previewStyle: "card" });

		const card = view.dom.querySelector(".url-preview--card")!;
		expect(card.querySelector(".url-preview__header .url-preview__favicon")).not.toBeNull();
		expect(card.querySelector(".url-preview__header .url-preview__title")?.textContent).toBe("r/Sub");
		expect(card.querySelector("div.url-preview__post-title")?.textContent).toBe("Post title");
		expect(card.querySelector("div.url-preview__description")?.textContent).toBe("The body of the post.");
		expect(card.querySelector(".url-preview__footer")?.textContent).toBe("REDDIT");

		const order = Array.from(card.querySelectorAll(".url-preview__title, .url-preview__post-title, .url-preview__description"))
			.map((e) => e.className);
		expect(order).toEqual(["url-preview__title", "url-preview__post-title", "url-preview__description"]);
	});

	it("card: truncates a long selftext to fit the limit and ends it with an ellipsis", () => {
		const limit = 120;
		view = mountPost(
			{ ...redditPost, description: "word ".repeat(200).trim() },
			{ previewStyle: "card", maxCardLength: limit },
		);

		const [context] = text(".url-preview__header .url-preview__title");
		const [title] = text(".url-preview__post-title");
		const [description] = text(".url-preview__description");
		expect(context).toBe("r/Sub");
		expect(title).toBe("Post title");
		expect(description.endsWith("…")).toBe(true);
		expect(context.length + title.length + description.length).toBeLessThanOrEqual(limit);
	});

	it("card: shortens the title once the description no longer fits", () => {
		const limit = 60;
		view = mountPost(
			{ ...redditPost, title: "A very long post title ".repeat(10).trim() },
			{ previewStyle: "card", maxCardLength: limit },
		);

		const [title] = text(".url-preview__post-title");
		expect(title.endsWith("…")).toBe(true);
		expect("r/Sub".length + title.length).toBeLessThanOrEqual(limit);
		expect(text(".url-preview__description")).toEqual([]);
	});

	it("inline: truncates a long title so '<context> — <title>' fits the limit", () => {
		const limit = 40;
		view = mountPost(
			{ ...redditPost, title: "An extremely long Reddit post title that goes on and on" },
			{ previewStyle: "inline", maxInlineLength: limit },
		);

		const [shown] = text(".url-preview__text");
		expect(shown.startsWith("r/Sub — An extremely")).toBe(true);
		expect(shown.endsWith("…")).toBe(true);
		expect(shown.length).toBeLessThanOrEqual(limit);
	});

	it("inline: drops the title when too little room remains", () => {
		view = mountPost(redditPost, { previewStyle: "inline", maxInlineLength: 12 });

		expect(text(".url-preview__text")).toEqual(["r/Sub"]);
		expect(view.dom.querySelectorAll(".url-preview__separator").length).toBe(0);
	});

	it("removes media links before measuring and showing the description", () => {
		view = mountPost(
			{ ...redditPost, description: "Look at this i.redd.it/abc123.jpg photo" },
			{ previewStyle: "card" },
		);

		expect(text(".url-preview__description")).toEqual(["Look at this photo"]);
	});

	it("shows only the context when include-description is off, as before", () => {
		view = mountPost(redditPost, { previewStyle: "card", includeDescription: false });

		expect(text(".url-preview__header .url-preview__title")).toEqual(["r/Sub"]);
		expect(text(".url-preview__post-title")).toEqual([]);
		expect(text(".url-preview__description")).toEqual([]);

		view.dom.parentElement?.remove();
		view.destroy();
		view = mountPost(redditPost, { previewStyle: "inline", includeDescription: false });
		expect(text(".url-preview__text")).toEqual(["r/Sub"]);
	});

	it("removes media links from the post title", () => {
		view = mountPost({ ...redditPost, title: "My cat imgur.com/abc123 today" }, { previewStyle: "inline" });

		expect(text(".url-preview__text")).toEqual(["r/Sub — My cat today"]);
	});
});

describe("cursor moves (real CodeMirror)", () => {
	const LINK = "https://example.com/page";
	const CURSOR_DOC = `Plain text before.\nSee ${LINK} here.\nPlain text after.`;
	const linkStart = CURSOR_DOC.indexOf(LINK);

	/** Counts metadata lookups, which happen once per URL per rebuild */
	class CountingService {
		lookups = 0;
		private metadata: LinkMetadata = { title: "Page title", description: null, favicon: null };
		hasCachedMetadata() {
			return true;
		}
		getCachedMetadata() {
			this.lookups++;
			return this.metadata;
		}
		getMetadata() {
			return Promise.resolve(this.metadata);
		}
	}

	let view: EditorView | null = null;

	afterEach(() => {
		view?.dom.parentElement?.remove();
		view?.destroy();
		view = null;
	});

	function mountAt(service: CountingService, previewStyle: "inline" | "card", cursor: number): EditorView {
		const settings = { ...DEFAULT_SETTINGS, previewStyle };
		const parent = document.createElement("div");
		document.body.appendChild(parent);
		return new EditorView({
			state: EditorState.create({
				doc: CURSOR_DOC,
				selection: { anchor: cursor },
				extensions: [editorLivePreviewField, createUrlPreviewDecorator(service as never, () => settings)],
			}),
			parent,
		});
	}

	const previews = () => view!.dom.querySelectorAll(".url-preview").length;

	it("card: moving the selection, even into the link, does not rebuild", () => {
		const service = new CountingService();
		view = mountAt(service, "card", 0);
		const lookups = service.lookups;
		expect(previews()).toBe(1);

		view.dispatch({ selection: { anchor: 5 } });
		view.dispatch({ selection: { anchor: linkStart + 3 } });
		view.dispatch({ selection: { anchor: CURSOR_DOC.length } });

		expect(service.lookups).toBe(lookups);
		expect(previews()).toBe(1);
	});

	it("inline: moving within plain text does not rebuild", () => {
		const service = new CountingService();
		view = mountAt(service, "inline", 0);
		const lookups = service.lookups;

		view.dispatch({ selection: { anchor: 5 } });
		view.dispatch({ selection: { anchor: CURSOR_DOC.length - 2 } });

		expect(service.lookups).toBe(lookups);
		expect(previews()).toBe(1);
	});

	it("inline: moving into a link reveals the raw text, and moving out restores the preview", () => {
		const service = new CountingService();
		view = mountAt(service, "inline", 0);
		expect(previews()).toBe(1);

		view.dispatch({ selection: { anchor: linkStart + 4 } });
		expect(previews()).toBe(0);
		expect(view.dom.textContent).toContain(LINK);

		// Moving within the same link keeps it revealed without rebuilding
		const lookups = service.lookups;
		view.dispatch({ selection: { anchor: linkStart + 10 } });
		expect(service.lookups).toBe(lookups);
		expect(previews()).toBe(0);

		view.dispatch({ selection: { anchor: 0 } });
		expect(previews()).toBe(1);
		expect(view.dom.textContent).not.toContain(LINK);
	});

	it("inline: the link edge counts as inside it", () => {
		const service = new CountingService();
		view = mountAt(service, "inline", 0);

		view.dispatch({ selection: { anchor: linkStart + LINK.length } });
		expect(previews()).toBe(0);

		view.dispatch({ selection: { anchor: linkStart + LINK.length + 1 } });
		expect(previews()).toBe(1);
	});
});
