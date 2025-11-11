import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type InlineLinkPreviewPlugin from "./main";

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

export class InlineLinkPreviewSettingTab extends PluginSettingTab {
	private readonly plugin: InlineLinkPreviewPlugin;

	constructor(app: App, plugin: InlineLinkPreviewPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		const settings = this.plugin.settings;

		containerEl.empty();
		;

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
					if (Number.isFinite(parsed) && parsed >= 500) {
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
			const title = document.createElement('strong');
			title.textContent = 'Cache statistics:';
			statsEl.appendChild(title);
			statsEl.appendChild(document.createElement('br'));

			const line1 = document.createTextNode(`• cached domains: ${stats.entries}`);
			statsEl.appendChild(line1);
			statsEl.appendChild(document.createElement('br'));

			const oldestDate = stats.oldestTimestamp
				? new Date(stats.oldestTimestamp).toLocaleDateString()
				: 'N/A';
			const line2 = document.createTextNode(`• oldest entry: ${oldestDate}`);
			statsEl.appendChild(line2);
			statsEl.appendChild(document.createElement('br'));

			const line3 = document.createTextNode('• Cache expires after 30 days');
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
