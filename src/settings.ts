import { App, Notice, PluginSettingTab, Setting } from "obsidian";
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
									// setDestructive() and SettingTab.update() both require Obsidian
									// 1.13+; this stays on setWarning() (deprecated but supported since
									// 0.11.0) and skips a forced re-render so the plugin's declared
									// minAppVersion (0.15.0) still holds statically, even though this
									// render callback itself only ever runs on 1.13+ hosts.
									.setWarning()
									.onClick(async () => {
										this.plugin.linkPreviewService.clearCache();
										if (this.plugin.faviconCache) {
											this.plugin.faviconCache.clear();
											await this.plugin.faviconCache.flush();
										}
										new Notice("Cache cleared.");
										// Trigger decoration refresh so previews update immediately
										this.plugin.refreshDecorations();
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

	/**
	 * Fallback for Obsidian versions older than 1.13.0, which don't call
	 * getSettingDefinitions(). Kept in sync with the definitions above.
	 */
	display(): void {
		const { containerEl } = this;
		const settings = this.plugin.settings;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Plugin activation")
			.setHeading();

		new Setting(containerEl)
			.setName("Require frontmatter to activate")
			.setDesc("Only show previews on pages with frontmatter properties. When enabled, the plugin is opt-in per page.")
			.addToggle((toggle) =>
				toggle
					.setValue(settings.requireFrontmatter)
					.onChange(async (value) => {
						this.plugin.settings.requireFrontmatter = value;
						await this.plugin.saveSettings();
						// Trigger decoration refresh
						this.plugin.refreshDecorations();
					}),
			);

		new Setting(containerEl)
			.setName("Preview appearance")
			.setHeading();

		new Setting(containerEl)
			.setName("Preview style")
			.setDesc("Choose between compact inline style or prominent card style.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("inline", "Inline — compact inline style")
					.addOption("card", "Card — prominent card style with more details")
					.setValue(settings.previewStyle)
					.onChange(async (value) => {
						this.plugin.settings.previewStyle = value as PreviewStyle;
						await this.plugin.saveSettings();
						// Trigger decoration refresh
						this.plugin.refreshDecorations();
					}),
			);

		new Setting(containerEl)
			.setName("Inline preview background")
			.setDesc("Background color for compact inline-style previews. Uses your theme's default background modifier color. For custom colors, use CSS snippets.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("none", "Transparent")
					.addOption("subtle", "Subtle background (default)")
					.setValue(settings.inlineColorMode)
					.onChange(async (value) => {
						this.plugin.settings.inlineColorMode = value as PreviewColorMode;
						await this.plugin.saveSettings();
						// Trigger decoration refresh
						this.plugin.refreshDecorations();
					}),
			);

		new Setting(containerEl)
			.setName("Card preview background")
			.setDesc("Background color for prominent card-style previews. Uses your theme's default background modifier color. For custom colors, use CSS snippets.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("none", "Transparent (default)")
					.addOption("subtle", "Subtle background")
					.setValue(settings.cardColorMode)
					.onChange(async (value) => {
						this.plugin.settings.cardColorMode = value as PreviewColorMode;
						await this.plugin.saveSettings();
						// Trigger decoration refresh
						this.plugin.refreshDecorations();
					}),
			);

		new Setting(containerEl)
			.setName("Preview content")
			.setHeading();

		new Setting(containerEl)
			.setName("Include description")
			.setDesc("Add the page description (when available) after the page title.")
			.addToggle((toggle) =>
				toggle
					.setValue(settings.includeDescription)
					.onChange(async (value) => {
						this.plugin.settings.includeDescription = value;
						await this.plugin.saveSettings();
						// Trigger decoration refresh
						this.plugin.refreshDecorations();
					}),
			);

		new Setting(containerEl)
			.setName("Maximum card length")
			.setDesc("Maximum total characters for card-style previews (title + description combined). Cards show more detailed information. Recommended: 100+, max: 5000")
			.addText((text) => {
				text.setValue(String(settings.maxCardLength));
				text.inputEl.type = "number";
				text.inputEl.min = "1";
				text.inputEl.max = "5000";
				text.onChange(async (value) => {
					const parsed = Number(value);
					if (!Number.isFinite(parsed) || parsed < 1) {
						return;
					}
					this.plugin.settings.maxCardLength = Math.round(parsed);
					await this.plugin.saveSettings();
					// Trigger decoration refresh
					this.plugin.refreshDecorations();
				});
			});

		new Setting(containerEl)
			.setName("Maximum inline length")
			.setDesc("Maximum total characters for inline-style previews (title + description combined). Inline previews are compact and flow with text. Recommended: 50+, max: 5000")
			.addText((text) => {
				text.setValue(String(settings.maxInlineLength));
				text.inputEl.type = "number";
				text.inputEl.min = "1";
				text.inputEl.max = "5000";
				text.onChange(async (value) => {
					const parsed = Number(value);
					if (!Number.isFinite(parsed) || parsed < 1) {
						return;
					}
					this.plugin.settings.maxInlineLength = Math.round(parsed);
					await this.plugin.saveSettings();
					// Trigger decoration refresh
					this.plugin.refreshDecorations();
				});
			});

		new Setting(containerEl)
			.setName("Show favicons")
			.setDesc("Include the site favicon before the preview text.")
			.addToggle((toggle) =>
				toggle
					.setValue(settings.showFavicon)
					.onChange(async (value) => {
						this.plugin.settings.showFavicon = value;
						await this.plugin.saveSettings();
						// Trigger decoration refresh
						this.plugin.refreshDecorations();
					}),
			);

		new Setting(containerEl)
			.setName("Keep emoji")
			.setDesc("Preserve emoji characters pulled from the page title or description.")
			.addToggle((toggle) =>
				toggle
					.setValue(settings.keepEmoji)
					.onChange(async (value) => {
						this.plugin.settings.keepEmoji = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("HTTP error warnings")
			.setDesc("Show a warning indicator (⚠️) for urls that return HTTP errors (e.g., 403, 404). When disabled, only network failures will show warnings")
			.addToggle((toggle) =>
				toggle
					.setValue(settings.showHttpErrorWarnings)
					.onChange(async (value) => {
						this.plugin.settings.showHttpErrorWarnings = value;
						await this.plugin.saveSettings();
						// Clear cache so detection changes apply immediately
						this.plugin.linkPreviewService.clearCache();
						// Trigger decoration refresh
						this.plugin.refreshDecorations();
					}),
			);

		new Setting(containerEl)
			.setName("Request timeout")
			.setDesc("Stop fetching metadata if the request takes too long (milliseconds).")
			.addText((text) => {
				text.setValue(String(settings.requestTimeoutMs));
				text.inputEl.type = "number";
				text.inputEl.min = "1000";
				text.inputEl.step = "500";
				text.onChange(async (value) => {
					const parsed = Number(value);
					if (Number.isFinite(parsed) && parsed >= REQUEST_TIMEOUT_MIN) {
						this.plugin.settings.requestTimeoutMs = Math.round(parsed);
						await this.plugin.saveSettings();
					}
				});
			});

		new Setting(containerEl)
			.setName("Cache management")
			.setHeading();

		// Cache stats
		const stats = this.plugin.faviconCache?.getStats();
		if (stats) {
			const statsEl = containerEl.createDiv({ cls: "url-enricher-cache-stats" });

			// Build stats content using DOM API
			const title = createEl('strong');
			title.textContent = 'Cache statistics:';
			statsEl.appendChild(title);
			statsEl.appendChild(createEl('br'));

			const line1 = activeDocument.createTextNode(`• cached domains: ${stats.entries}`);
			statsEl.appendChild(line1);
			statsEl.appendChild(createEl('br'));

			const oldestDate = stats.oldestTimestamp
				? new Date(stats.oldestTimestamp).toLocaleDateString()
				: 'N/A';
			const line2 = activeDocument.createTextNode(`• oldest entry: ${oldestDate}`);
			statsEl.appendChild(line2);
			statsEl.appendChild(createEl('br'));

			const line3 = activeDocument.createTextNode('• Cache expires after 30 days');
			statsEl.appendChild(line3);
		}

		new Setting(containerEl)
			.setName("Clear cached previews")
			.setDesc("Remove all stored metadata and favicons from memory and disk. Previews will be rebuilt on the next paste or view. Use this if you're not seeing updated previews after changes.")
			.addButton((button) =>
				button
					.setButtonText("Clear cache")
					.setWarning()
					.onClick(async () => {
						this.plugin.linkPreviewService.clearCache();
						if (this.plugin.faviconCache) {
							this.plugin.faviconCache.clear();
							await this.plugin.faviconCache.flush();
						}
						new Notice("Cache cleared.");
						// Trigger decoration refresh so previews update immediately
						this.plugin.refreshDecorations();
						// Refresh the display to update stats
						this.display();
					}),
			);
	}
}
