import { describe, it, expect, beforeEach } from "vitest";
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
