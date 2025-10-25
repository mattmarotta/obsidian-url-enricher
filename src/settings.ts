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
	previewColorMode: PreviewColorMode;
	customPreviewColor: string;
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
	previewColorMode: "grey",
	customPreviewColor: "#4a4a4a",
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
		let color: string;

		switch (settings.previewColorMode) {
			case "none":
				color = "transparent";
				break;
			case "custom":
				color = settings.customPreviewColor;
				break;
			case "grey":
			default:
				color = "var(--background-modifier-border)";
				break;
		}

		// Update CSS variable
		document.documentElement.style.setProperty("--inline-preview-bg", color);
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
			.setName("Preview background color")
			.setDesc("Choose the background color for inline and card previews.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("none", "None (transparent)")
					.addOption("grey", "Grey (default)")
					.addOption("custom", "Custom color")
					.setValue(settings.previewColorMode)
					.onChange(async (value) => {
						this.plugin.settings.previewColorMode = value as PreviewColorMode;
						await this.plugin.saveSettings();
						this.updatePreviewColorCSS();
						this.display(); // Refresh to show/hide color picker
					}),
			);

		// Show color picker only if custom mode is selected
		if (settings.previewColorMode === "custom") {
			new Setting(containerEl)
				.setName("Custom preview color")
				.setDesc("Choose a custom background color for inline and card previews.")
				.addColorPicker((color) =>
					color
						.setValue(settings.customPreviewColor)
						.onChange(async (value) => {
							this.plugin.settings.customPreviewColor = value;
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
			.setDesc("Maximum total characters for card-style previews (title + description combined). Cards show more detailed information. Min: 100, Max: 5000")
			.addText((text) => {
				text.setValue(String(settings.maxCardLength));
				text.inputEl.type = "number";
				text.inputEl.min = "100";
				text.inputEl.max = "5000";
				text.onChange(async (value) => {
					const parsed = Number(value);
					if (!Number.isFinite(parsed) || parsed < 100) {
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
			.setDesc("Maximum total characters for inline-style previews (title + description combined). Inline previews are compact and flow with text. Min: 50, Max: 5000")
			.addText((text) => {
				text.setValue(String(settings.maxInlineLength));
				text.inputEl.type = "number";
				text.inputEl.min = "50";
				text.inputEl.max = "5000";
				text.onChange(async (value) => {
					const parsed = Number(value);
					if (!Number.isFinite(parsed) || parsed < 50) {
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
			const statsEl = containerEl.createDiv({ cls: "setting-item-description" });
			statsEl.style.marginBottom = "1em";
			statsEl.style.padding = "0.5em";
			statsEl.style.background = "var(--background-secondary)";
			statsEl.style.borderRadius = "4px";
			
			statsEl.innerHTML = `
				<strong>Cache Statistics:</strong><br>
				• Cached domains: ${stats.entries}<br>
				• Oldest entry: ${stats.oldestTimestamp ? new Date(stats.oldestTimestamp).toLocaleDateString() : 'N/A'}<br>
				• Cache expires after 30 days
			`;
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
