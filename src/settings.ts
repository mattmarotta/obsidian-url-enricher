import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type InlineLinkPreviewPlugin from "./main";

export type UrlDisplayMode = "url-and-preview" | "preview-only" | "small-url-and-preview";
export type BubbleColorMode = "none" | "grey" | "custom";
export type PreviewStyle = "bubble" | "card";
export type DisplayMode = "inline" | "block";

export interface InlineLinkPreviewSettings {
	includeDescription: boolean;
	cardDescriptionLength: number;
	bubbleDescriptionLength: number;
	requestTimeoutMs: number;
	showFavicon: boolean;
	keepEmoji: boolean;
	previewStyle: PreviewStyle;
	displayMode: DisplayMode;
	urlDisplayMode: UrlDisplayMode;
	bubbleColorMode: BubbleColorMode;
	customBubbleColor: string;
}

export const DEFAULT_SETTINGS: InlineLinkPreviewSettings = {
	includeDescription: true,
	cardDescriptionLength: 200,
	bubbleDescriptionLength: 100,
	requestTimeoutMs: 7000,
	showFavicon: true,
	keepEmoji: true,
	previewStyle: "bubble",
	displayMode: "block",
	urlDisplayMode: "small-url-and-preview",
	bubbleColorMode: "grey",
	customBubbleColor: "#4a4a4a",
};

export class InlineLinkPreviewSettingTab extends PluginSettingTab {
	private readonly plugin: InlineLinkPreviewPlugin;

	constructor(app: App, plugin: InlineLinkPreviewPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private updateBubbleColorCSS(): void {
		const settings = this.plugin.settings;
		let color: string;

		switch (settings.bubbleColorMode) {
			case "none":
				color = "transparent";
				break;
			case "custom":
				color = settings.customBubbleColor;
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
		containerEl.createEl("h2", { text: "Inline link preview" });

		// Apply bubble color on display
		this.updateBubbleColorCSS();

		containerEl.createEl("h3", { text: "Preview Appearance" });

		new Setting(containerEl)
			.setName("Preview style")
			.setDesc("Choose between compact bubble style or prominent card style.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("bubble", "Bubble — Compact inline style")
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
			.setName("Display mode")
			.setDesc("Choose whether previews appear inline with text or on a new line. Can be overridden per-page using frontmatter: 'preview-display: inline' or 'preview-display: block'.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("inline", "Inline — Flows with surrounding text")
					.addOption("block", "New line — Appears on its own line")
					.setValue(settings.displayMode)
					.onChange(async (value) => {
						this.plugin.settings.displayMode = value as DisplayMode;
						await this.plugin.saveSettings();
						// Trigger decoration refresh
						this.plugin.refreshDecorations();
					}),
			);

		new Setting(containerEl)
			.setName("URL display mode")
			.setDesc("Choose how URLs are displayed in dynamic preview mode.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("url-and-preview", "URL + Preview — Show full-sized URL with preview bubble")
					.addOption("preview-only", "Preview Only — Hide URL, show only the preview")
					.addOption("small-url-and-preview", "Small URL + Preview — Show subtle, non-intrusive URL with preview")
					.setValue(settings.urlDisplayMode)
					.onChange(async (value) => {
						this.plugin.settings.urlDisplayMode = value as UrlDisplayMode;
						await this.plugin.saveSettings();
						// Trigger decoration refresh
						this.plugin.refreshDecorations();
					}),
			);

		new Setting(containerEl)
			.setName("Preview bubble background")
			.setDesc("Choose the background color for preview bubbles.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("none", "None (transparent)")
					.addOption("grey", "Grey (default)")
					.addOption("custom", "Custom color")
					.setValue(settings.bubbleColorMode)
					.onChange(async (value) => {
						this.plugin.settings.bubbleColorMode = value as BubbleColorMode;
						await this.plugin.saveSettings();
						this.updateBubbleColorCSS();
						this.display(); // Refresh to show/hide color picker
					}),
			);

		// Show color picker only if custom mode is selected
		if (settings.bubbleColorMode === "custom") {
			new Setting(containerEl)
				.setName("Custom bubble color")
				.setDesc("Choose a custom background color for preview bubbles.")
				.addColorPicker((color) =>
					color
						.setValue(settings.customBubbleColor)
						.onChange(async (value) => {
							this.plugin.settings.customBubbleColor = value;
							await this.plugin.saveSettings();
							this.updateBubbleColorCSS();
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
			.setName("Card description length")
			.setDesc("Maximum characters for descriptions in card-style previews. Cards have more space for context.")
			.addText((text) => {
				text.setValue(String(settings.cardDescriptionLength));
				text.inputEl.type = "number";
				text.inputEl.min = "50";
				text.inputEl.max = "500";
				text.onChange(async (value) => {
					const parsed = Number(value);
					if (!Number.isFinite(parsed) || parsed < 50) {
						return;
					}
					this.plugin.settings.cardDescriptionLength = Math.round(parsed);
					await this.plugin.saveSettings();
					// Trigger decoration refresh
					this.plugin.refreshDecorations();
				});
			});

		new Setting(containerEl)
			.setName("Bubble description length")
			.setDesc("Maximum characters for descriptions in bubble-style previews. Bubbles are compact and inline.")
			.addText((text) => {
				text.setValue(String(settings.bubbleDescriptionLength));
				text.inputEl.type = "number";
				text.inputEl.min = "30";
				text.inputEl.max = "200";
				text.onChange(async (value) => {
					const parsed = Number(value);
					if (!Number.isFinite(parsed) || parsed < 30) {
						return;
					}
					this.plugin.settings.bubbleDescriptionLength = Math.round(parsed);
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
						new Notice("Inline link preview cache cleared.");
						// Refresh the display to update stats
						this.display();
					}),
			);
	}
}
