import { describe, it, expect, vi } from "vitest";
import InlineLinkPreviewPlugin from "../src/main";
import { DEFAULT_SETTINGS } from "../src/settings";
import {
	CARD_LENGTH_MIN,
	CARD_LENGTH_MAX,
	REQUEST_TIMEOUT_MIN,
} from "../src/constants";
import { App } from "obsidian";

/**
 * Tests the REAL loadSettings() on the plugin class.
 *
 * Replaces the previous main.test.ts, which exercised a local copy of a
 * `normalizeSettings` function that does not exist anywhere in src/ - so it
 * could never fail for a real reason, nor catch a regression.
 */

function makePlugin(stored: unknown) {
	const plugin = new InlineLinkPreviewPlugin(new App() as never, {} as never);
	vi.spyOn(plugin, "loadData").mockResolvedValue(stored);
	return plugin;
}

describe("loadSettings", () => {
	it("uses defaults when nothing is stored", async () => {
		const plugin = makePlugin(null);
		await plugin.loadSettings();
		expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
	});

	it("uses defaults when stored data is empty", async () => {
		const plugin = makePlugin({});
		await plugin.loadSettings();
		expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
	});

	it("overlays stored values onto the defaults", async () => {
		const plugin = makePlugin({ previewStyle: "card", maxCardLength: 900 });
		await plugin.loadSettings();

		expect(plugin.settings.previewStyle).toBe("card");
		expect(plugin.settings.maxCardLength).toBe(900);
		// untouched keys still come from defaults
		expect(plugin.settings.showFavicon).toBe(DEFAULT_SETTINGS.showFavicon);
		expect(plugin.settings.requestTimeoutMs).toBe(DEFAULT_SETTINGS.requestTimeoutMs);
	});

	it("does not mutate DEFAULT_SETTINGS", async () => {
		const before = { ...DEFAULT_SETTINGS };
		const plugin = makePlugin({ maxCardLength: 4321 });
		await plugin.loadSettings();

		expect(DEFAULT_SETTINGS).toEqual(before);
	});

	/**
	 * data.json is user-editable and survives downgrades, so anything can be in
	 * it. Bad values must not reach the decorator.
	 */
	describe("normalization of stored values", () => {
		it("clamps a number below the minimum", async () => {
			const plugin = makePlugin({ maxCardLength: -50 });
			await plugin.loadSettings();
			expect(plugin.settings.maxCardLength).toBe(CARD_LENGTH_MIN);
		});

		it("clamps a number above the maximum", async () => {
			const plugin = makePlugin({ maxCardLength: 999999 });
			await plugin.loadSettings();
			expect(plugin.settings.maxCardLength).toBe(CARD_LENGTH_MAX);
		});

		it("rounds a fractional number", async () => {
			const plugin = makePlugin({ maxInlineLength: 120.7 });
			await plugin.loadSettings();
			expect(plugin.settings.maxInlineLength).toBe(121);
		});

		it("accepts a numeric string", async () => {
			const plugin = makePlugin({ maxCardLength: "450" });
			await plugin.loadSettings();
			expect(plugin.settings.maxCardLength).toBe(450);
		});

		it("falls back to the default for a non-numeric value", async () => {
			const plugin = makePlugin({ maxCardLength: "not a number" });
			await plugin.loadSettings();
			expect(plugin.settings.maxCardLength).toBe(DEFAULT_SETTINGS.maxCardLength);
		});

		it("falls back to the default for an unrecognised preview style", async () => {
			const plugin = makePlugin({ previewStyle: "bogus" });
			await plugin.loadSettings();
			expect(plugin.settings.previewStyle).toBe(DEFAULT_SETTINGS.previewStyle);
		});

		it("falls back to the default for an unrecognised color mode", async () => {
			const plugin = makePlugin({ cardColorMode: "chartreuse" });
			await plugin.loadSettings();
			expect(plugin.settings.cardColorMode).toBe(DEFAULT_SETTINGS.cardColorMode);
		});

		it("falls back to the default for a non-boolean toggle", async () => {
			const plugin = makePlugin({ showFavicon: "yes" });
			await plugin.loadSettings();
			expect(plugin.settings.showFavicon).toBe(DEFAULT_SETTINGS.showFavicon);
		});

		it("clamps a request timeout below the minimum", async () => {
			const plugin = makePlugin({ requestTimeoutMs: 1 });
			await plugin.loadSettings();
			expect(plugin.settings.requestTimeoutMs).toBe(REQUEST_TIMEOUT_MIN);
		});

		it("drops keys that are not real settings", async () => {
			const plugin = makePlugin({ somethingRemoved: true, maxCardLength: 400 });
			await plugin.loadSettings();
			expect(plugin.settings).not.toHaveProperty("somethingRemoved");
			expect(plugin.settings.maxCardLength).toBe(400);
		});
	});
});
