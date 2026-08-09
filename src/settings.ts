import { App, Notice, PluginSettingTab } from "obsidian";
import type { SettingDefinition, SettingDefinitionItem } from "obsidian";
import type InlineLinkPreviewPlugin from "./main";
import { REQUEST_TIMEOUT_MIN } from "./constants";

export type PreviewColorMode = "none" | "subtle";
export type PreviewStyle = "inline" | "card";

export interface InlineLinkPreviewSettings {
	includeDescription: boolean;
	maxCardLength: number;
	maxInlineLength: number;
	requestTimeoutMs: number;
	showFavicon: boolean;
	keepEmoji: boolean;
	previewStyle: PreviewStyle;
	inlineColorMode: PreviewColorMode;
	cardColorMode: PreviewColorMode;
	showHttpErrorWarnings: boolean;
	requireFrontmatter: boolean;
}

export const DEFAULT_SETTINGS: InlineLinkPreviewSettings = {
	includeDescription: true,
	maxCardLength: 300,
	maxInlineLength: 150,
	requestTimeoutMs: 7000,
	showFavicon: true,
	keepEmoji: true,
	previewStyle: "inline",
	inlineColorMode: "subtle",
	cardColorMode: "none",
	showHttpErrorWarnings: true,
	requireFrontmatter: false,
};

type SettingKey = keyof InlineLinkPreviewSettings;

export class InlineLinkPreviewSettingTab extends PluginSettingTab {
	private readonly plugin: InlineLinkPreviewPlugin;

	constructor(app: App, plugin: InlineLinkPreviewPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem<SettingKey>[] {
		return [
			{
				type: "group",
				heading: "Plugin activation",
				items: [
					{
						name: "Require frontmatter to activate",
						desc: "Only show previews on pages with frontmatter properties. When enabled, the plugin is opt-in per page.",
						control: { type: "toggle", key: "requireFrontmatter" },
					},
				],
			},
			{
				type: "group",
				heading: "Preview appearance",
				items: [
					{
						name: "Preview style",
						desc: "Choose between compact inline style or prominent card style.",
						control: {
							type: "dropdown",
							key: "previewStyle",
							options: {
								inline: "Inline — compact inline style",
								card: "Card — prominent card style with more details",
							},
						},
					},
					{
						name: "Inline preview background",
						desc: "Background color for compact inline-style previews. Uses your theme's default background modifier color. For custom colors, use CSS snippets.",
						control: {
							type: "dropdown",
							key: "inlineColorMode",
							options: {
								none: "Transparent",
								subtle: "Subtle background (default)",
							},
						},
					},
					{
						name: "Card preview background",
						desc: "Background color for prominent card-style previews. Uses your theme's default background modifier color. For custom colors, use CSS snippets.",
						control: {
							type: "dropdown",
							key: "cardColorMode",
							options: {
								none: "Transparent (default)",
								subtle: "Subtle background",
							},
						},
					},
				],
			},
			{
				type: "group",
				heading: "Preview content",
				items: [
					{
						name: "Include description",
						desc: "Add the page description (when available) after the page title.",
						control: { type: "toggle", key: "includeDescription" },
					},
					{
						name: "Maximum card length",
						desc: "Maximum total characters for card-style previews (title + description combined). Cards show more detailed information. Recommended: 100+, max: 5000",
						control: {
							type: "number",
							key: "maxCardLength",
							min: 1,
							max: 5000,
							validate: (value) => (Number.isFinite(value) && value >= 1 ? undefined : "Must be at least 1"),
						},
					},
					{
						name: "Maximum inline length",
						desc: "Maximum total characters for inline-style previews (title + description combined). Inline previews are compact and flow with text. Recommended: 50+, max: 5000",
						control: {
							type: "number",
							key: "maxInlineLength",
							min: 1,
							max: 5000,
							validate: (value) => (Number.isFinite(value) && value >= 1 ? undefined : "Must be at least 1"),
						},
					},
					{
						name: "Show favicons",
						desc: "Include the site favicon before the preview text.",
						control: { type: "toggle", key: "showFavicon" },
					},
					{
						name: "Keep emoji",
						desc: "Preserve emoji characters pulled from the page title or description.",
						control: { type: "toggle", key: "keepEmoji" },
					},
					{
						name: "HTTP error warnings",
						desc: "Show a warning indicator (⚠️) for urls that return HTTP errors (e.g., 403, 404). When disabled, only network failures will show warnings",
						control: { type: "toggle", key: "showHttpErrorWarnings" },
					},
					{
						name: "Request timeout",
						desc: "Stop fetching metadata if the request takes too long (milliseconds).",
						control: {
							type: "number",
							key: "requestTimeoutMs",
							min: 1000,
							step: 500,
							validate: (value) =>
								Number.isFinite(value) && value >= REQUEST_TIMEOUT_MIN
									? undefined
									: `Must be at least ${REQUEST_TIMEOUT_MIN}`,
						},
					},
				],
			},
			{
				type: "group",
				heading: "Cache management",
				items: [
					...this.buildCacheStatsDefinition(),
					{
						name: "Clear cached previews",
						desc: "Remove all stored metadata and favicons from memory and disk. Previews will be rebuilt on the next paste or view. Use this if you're not seeing updated previews after changes.",
						render: (setting) => {
							setting.addButton((button) =>
								button
									.setButtonText("Clear cache")
									.setDestructive()
									.onClick(async () => {
										this.plugin.linkPreviewService.clearCache();
										if (this.plugin.faviconCache) {
											this.plugin.faviconCache.clear();
											await this.plugin.faviconCache.flush();
										}
										new Notice("Cache cleared.");
										// Trigger decoration refresh so previews update immediately
										this.plugin.refreshDecorations();
										// Re-render the tab so the cache statistics above refresh
										this.update();
									}),
							);
						},
					},
				],
			},
		];
	}

	/**
	 * Cache stats are informational only (not a control), so this returns
	 * a `render`-type definition — omitted entirely if there's no cache yet.
	 */
	private buildCacheStatsDefinition(): SettingDefinition<SettingKey>[] {
		const stats = this.plugin.faviconCache?.getStats();
		if (!stats) {
			return [];
		}

		return [
			{
				name: "Cache statistics",
				render: (setting) => {
					setting.settingEl.addClass("url-enricher-cache-stats");

					const title = createEl('strong');
					title.textContent = 'Cache statistics:';
					setting.descEl.appendChild(title);
					setting.descEl.appendChild(createEl('br'));

					const line1 = activeDocument.createTextNode(`• cached domains: ${stats.entries}`);
					setting.descEl.appendChild(line1);
					setting.descEl.appendChild(createEl('br'));

					const oldestDate = stats.oldestTimestamp
						? new Date(stats.oldestTimestamp).toLocaleDateString()
						: 'N/A';
					const line2 = activeDocument.createTextNode(`• oldest entry: ${oldestDate}`);
					setting.descEl.appendChild(line2);
					setting.descEl.appendChild(createEl('br'));

					const line3 = activeDocument.createTextNode('• Cache expires after 30 days');
					setting.descEl.appendChild(line3);
				},
			},
		];
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as SettingKey];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const settings = this.plugin.settings as unknown as Record<SettingKey, unknown>;
		settings[key as SettingKey] = value;
		await this.plugin.saveSettings();

		switch (key as SettingKey) {
			case "showHttpErrorWarnings":
				// Clear cache so detection changes apply immediately
				this.plugin.linkPreviewService.clearCache();
				this.plugin.refreshDecorations();
				break;
			case "keepEmoji":
			case "requestTimeoutMs":
				// saveSettings() already propagates these to the link preview
				// service (and clears its cache for the timeout), so no
				// explicit decoration refresh is needed here.
				break;
			default:
				this.plugin.refreshDecorations();
				break;
		}
	}
}
