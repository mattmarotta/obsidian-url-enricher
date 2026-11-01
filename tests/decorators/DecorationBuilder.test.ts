import { describe, it, expect, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import { buildUrlDecorations, expandToLines, type ScanRange } from "../../src/decorators/DecorationBuilder";
import { ClaimedRanges } from "../../src/decorators/UrlMatcher";
import { DEFAULT_SETTINGS, type InlineLinkPreviewSettings } from "../../src/settings";
import type { LinkMetadata } from "../../src/services/types";

const metadata: LinkMetadata = { title: "A title", description: "A description", favicon: null };

const service = {
	getCachedMetadata: () => metadata,
	hasCachedMetadata: () => true,
};

function build(doc: string, ranges: ScanRange[] | "all", overrides: Partial<InlineLinkPreviewSettings> = {}, cursor = 0) {
	const state = EditorState.create({ doc, selection: { anchor: cursor } });
	const queue = vi.fn();
	const scan = ranges === "all" ? [{ from: 0, to: state.doc.length }] : ranges;
	const result = buildUrlDecorations(
		state,
		scan,
		service as never,
		{ ...DEFAULT_SETTINGS, ...overrides },
		new Map(),
		queue,
	);
	return { state, result, fetched: queue.mock.calls.map(([url]) => url as string) };
}

/** Document range of line `n` (1-based) */
function line(state: EditorState, n: number): ScanRange {
	const l = state.doc.line(n);
	return { from: l.from, to: l.to };
}

const DOC = [
	"Top: https://top.example",
	"filler",
	"Middle: [docs](https://middle.example/docs) and [[https://wiki.example]]",
	"filler",
	"Bottom: https://bottom.example",
].join("\n");

describe("buildUrlDecorations", () => {
	it("decorates and fetches only URLs inside the given ranges", () => {
		const probe = EditorState.create({ doc: DOC });
		const { result, fetched } = build(DOC, [line(probe, 3)]);

		expect(fetched.sort()).toEqual(["https://middle.example/docs", "https://wiki.example"]);
		const middle = probe.doc.line(3);
		expect(result.decorations.length).toBeGreaterThan(0);
		for (const { from, to } of result.decorations) {
			expect(from).toBeGreaterThanOrEqual(middle.from);
			expect(to).toBeLessThanOrEqual(middle.to);
		}
	});

	it("handles several separate ranges with correct document offsets", () => {
		const probe = EditorState.create({ doc: DOC });
		const { result, fetched } = build(DOC, [line(probe, 5), line(probe, 1)]);

		expect(fetched.sort()).toEqual(["https://bottom.example", "https://top.example"]);
		const top = DOC.indexOf("https://top.example");
		const bottom = DOC.indexOf("https://bottom.example");
		expect(result.urlRanges).toEqual([
			{ from: top, to: top + "https://top.example".length },
			{ from: bottom, to: bottom + "https://bottom.example".length },
		]);
	});

	it("still decorates a link that crosses a range edge", () => {
		const url = "https://middle.example/docs";
		const urlStart = DOC.indexOf(url);
		// A range covering only a few characters in the middle of the link
		const { result, fetched } = build(DOC, [{ from: urlStart + 5, to: urlStart + 8 }]);

		expect(fetched).toContain(url);
		const linkStart = DOC.indexOf("[docs]");
		expect(result.urlRanges).toContainEqual({ from: linkStart, to: urlStart + url.length + 1 });
	});

	it("applies frontmatter that is outside the scanned range", () => {
		const doc = ["---", 'preview-style: "card"', "---", "filler", "https://example.com"].join("\n");
		const probe = EditorState.create({ doc });
		const { result } = build(doc, [line(probe, 5)]);

		expect(result.cursorSensitive).toBe(false);
		// Card mode adds a widget and a mark for the URL
		expect(result.decorations).toHaveLength(2);
	});

	it("respects require-frontmatter using only the frontmatter block", () => {
		const withKey = ["---", "preview-style: inline", "---", "https://example.com"].join("\n");
		const tagsOnly = ["---", "tags: [a]", "---", "https://example.com"].join("\n");
		const none = "https://example.com";

		expect(build(withKey, "all", { requireFrontmatter: true }).result.decorations.length).toBe(1);
		expect(build(tagsOnly, "all", { requireFrontmatter: true }).result.decorations).toEqual([]);
		expect(build(none, "all", { requireFrontmatter: true }).result.decorations).toEqual([]);
		expect(build(none, "all", { requireFrontmatter: true }).fetched).toEqual([]);
	});

	it("ignores '---' lines later in the note that aren't frontmatter", () => {
		const doc = ["# Title", "---", "preview-style: card", "---", "https://example.com"].join("\n");
		expect(build(doc, "all").result.cursorSensitive).toBe(true);
	});

	it("picks up frontmatter edits even when the parse is cached", () => {
		const inline = ["---", "preview-style: inline", "---", "https://example.com"].join("\n");
		const card = inline.replace("inline", "card");

		expect(build(inline, "all").result.cursorSensitive).toBe(true);
		expect(build(card, "all").result.cursorSensitive).toBe(false);
		expect(build(inline, "all").result.cursorSensitive).toBe(true);
	});

	it("does not also match a bare URL inside a markdown link or wikilink", () => {
		const doc = "[x](https://a.example) [[https://b.example]] https://c.example";
		// Card mode ignores the cursor, so every URL gets its widget + mark
		const { result, fetched } = build(doc, "all", { previewStyle: "card" });

		expect(fetched).toEqual(["https://b.example", "https://a.example", "https://c.example"]);
		expect(result.urlRanges).toHaveLength(3);
		expect(result.decorations).toHaveLength(6);
	});

	it("records the URL under the cursor even though it is left undecorated", () => {
		const doc = "https://a.example https://b.example";
		const { result, fetched } = build(doc, "all", {}, 3);

		expect(fetched).toEqual(["https://a.example", "https://b.example"]);
		expect(result.urlRanges).toHaveLength(2);
		expect(result.decorations).toHaveLength(1);
	});
});

describe("expandToLines", () => {
	const state = EditorState.create({ doc: "one\ntwo\nthree\nfour\nfive" });

	it("expands ranges to whole lines", () => {
		expect(expandToLines(state.doc, [{ from: 5, to: 6 }])).toEqual([line(state, 2)]);
	});

	it("merges overlapping and adjacent ranges, in order", () => {
		const merged = expandToLines(state.doc, [
			{ from: line(state, 5).from, to: line(state, 5).to },
			{ from: 1, to: 5 },
			{ from: line(state, 3).from + 1, to: line(state, 3).from + 2 },
		]);
		expect(merged).toEqual([
			{ from: 0, to: line(state, 3).to },
			line(state, 5),
		]);
	});
});

describe("ClaimedRanges", () => {
	it("detects overlap with any claimed range", () => {
		const claimed = new ClaimedRanges([
			{ start: 30, end: 40 },
			{ start: 0, end: 10 },
			{ start: 12, end: 20 },
		]);

		expect(claimed.overlaps(5, 6)).toBe(true);
		expect(claimed.overlaps(10, 12)).toBe(false);
		expect(claimed.overlaps(19, 25)).toBe(true);
		expect(claimed.overlaps(20, 30)).toBe(false);
		expect(claimed.overlaps(39, 50)).toBe(true);
		expect(claimed.overlaps(40, 50)).toBe(false);
	});

	it("handles a long range that contains later ones", () => {
		const claimed = new ClaimedRanges([
			{ start: 0, end: 100 },
			{ start: 10, end: 20 },
		]);
		expect(claimed.overlaps(50, 60)).toBe(true);
	});

	it("reports no overlap when nothing is claimed", () => {
		expect(new ClaimedRanges([]).overlaps(0, 10)).toBe(false);
	});
});
