import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type InlineLinkPreviewPlugin from "./main";

export type PreviewColorMode = "none" | "grey" | "custom";
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
	customInlineColor: string;
	customCardColor: string;
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
	inlineColorMode: "grey",
	cardColorMode: "none",
	customInlineColor: "#4a4a4a",
	customCardColor: "#4a4a4a",
	showHttpErrorWarnings: true,
	requireFrontmatter: false,
};

export class InlineLinkPreviewSettingTab extends PluginSettingTab {
	private readonly plugin: InlineLinkPreviewPlugin;

	constructor(app: App, plugin: InlineLinkPreviewPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private updatePreviewColorCSS(): void {
		const settings = this.plugin.settings;

		// Remove all color mode classes
		document.body.removeClass(
			'url-enricher-inline-none',
			'url-enricher-inline-grey',
			'url-enricher-inline-custom',
			'url-enricher-card-none',
			'url-enricher-card-grey',
			'url-enricher-card-custom'
		);

		// Add appropriate classes for each mode
		document.body.addClass(`url-enricher-inline-${settings.inlineColorMode}`);
		document.body.addClass(`url-enricher-card-${settings.cardColorMode}`);

		// Set CSS variables for custom colors
		if (settings.inlineColorMode === 'custom') {
			document.documentElement.style.setProperty('--url-enricher-custom-inline-color', settings.customInlineColor);
		}
		if (settings.cardColorMode === 'custom') {
			document.documentElement.style.setProperty('--url-enricher-custom-card-color', settings.customCardColor);
		}
	}

	display(): void {
		const { containerEl } = this;
		const settings = this.plugin.settings;

		containerEl.empty();
		containerEl.createEl("h2", { text: "URL Enricher" });

		// Apply preview color on display
		this.updatePreviewColorCSS();

		containerEl.createEl("h3", { text: "Plugin Activation" });

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

		containerEl.createEl("h3", { text: "Preview Appearance" });

		new Setting(containerEl)
			.setName("Preview style")
			.setDesc("Choose between compact inline style or prominent card style.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("inline", "Inline — Compact inline style")
					.addOption("card", "Card — Prominent card style with more details")
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
			.setDesc("Background color for compact inline-style previews.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("none", "None (transparent)")
					.addOption("grey", "Grey (default)")
					.addOption("custom", "Custom color")
					.setValue(settings.inlineColorMode)
					.onChange(async (value) => {
						this.plugin.settings.inlineColorMode = value as PreviewColorMode;
						await this.plugin.saveSettings();
						this.updatePreviewColorCSS();
						this.display(); // Refresh to show/hide color picker
					}),
			);

		new Setting(containerEl)
			.setName("Card preview background")
			.setDesc("Background color for prominent card-style previews.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("none", "None (transparent, default)")
					.addOption("grey", "Grey")
					.addOption("custom", "Custom color")
					.setValue(settings.cardColorMode)
					.onChange(async (value) => {
						this.plugin.settings.cardColorMode = value as PreviewColorMode;
						await this.plugin.saveSettings();
						this.updatePreviewColorCSS();
						this.display(); // Refresh to show/hide color picker
					}),
			);

		// Show color picker for inline if set to custom
		if (settings.inlineColorMode === "custom") {
			new Setting(containerEl)
				.setName("Custom inline preview color")
				.setDesc("Choose a custom background color for inline-style previews.")
				.addColorPicker((color) =>
					color
						.setValue(settings.customInlineColor)
						.onChange(async (value) => {
							this.plugin.settings.customInlineColor = value;
							await this.plugin.saveSettings();
							this.updatePreviewColorCSS();
						}),
				);
		}

		// Show color picker for card if set to custom
		if (settings.cardColorMode === "custom") {
			new Setting(containerEl)
				.setName("Custom card preview color")
				.setDesc("Choose a custom background color for card-style previews.")
				.addColorPicker((color) =>
					color
						.setValue(settings.customCardColor)
						.onChange(async (value) => {
							this.plugin.settings.customCardColor = value;
							await this.plugin.saveSettings();
							this.updatePreviewColorCSS();
						}),
				);
		}

		containerEl.createEl("h3", { text: "Preview Content" });

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
			.setDesc("Maximum total characters for card-style previews (title + description combined). Cards show more detailed information. Recommended: 100+, Max: 5000")
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
			.setDesc("Maximum total characters for inline-style previews (title + description combined). Inline previews are compact and flow with text. Recommended: 50+, Max: 5000")
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
			.setDesc("Show a warning indicator (⚠️) for URLs that return HTTP errors (403 Forbidden, 404 Not Found, soft 404s like 'Video Unavailable'). When disabled, only network failures will show warnings.")
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

		containerEl.createEl("h3", { text: "Cache Management" });

		// Cache stats
		const stats = this.plugin.faviconCache?.getStats();
		if (stats) {
			const statsEl = containerEl.createDiv({ cls: "url-enricher-cache-stats" });

			// Build stats content using DOM API
			const title = document.createElement('strong');
			title.textContent = 'Cache Statistics:';
			statsEl.appendChild(title);
			statsEl.appendChild(document.createElement('br'));

			const line1 = document.createTextNode(`• Cached domains: ${stats.entries}`);
			statsEl.appendChild(line1);
			statsEl.appendChild(document.createElement('br'));

			const oldestDate = stats.oldestTimestamp
				? new Date(stats.oldestTimestamp).toLocaleDateString()
				: 'N/A';
			const line2 = document.createTextNode(`• Oldest entry: ${oldestDate}`);
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
						new Notice("URL Enricher cache cleared.");
						// Trigger decoration refresh so previews update immediately
						this.plugin.refreshDecorations();
						// Refresh the display to update stats
						this.display();
					}),
			);
	}
}
