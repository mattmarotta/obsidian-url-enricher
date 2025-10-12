import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type InlineLinkPreviewPlugin from "./main";

export interface InlineLinkPreviewSettings {
	autoPreviewOnPaste: boolean;
	includeDescription: boolean;
	maxDescriptionLength: number;
	requestTimeoutMs: number;
	showFavicon: boolean;
	keepEmoji: boolean;
}

export const DEFAULT_SETTINGS: InlineLinkPreviewSettings = {
	autoPreviewOnPaste: true,
	includeDescription: true,
	maxDescriptionLength: 60,
	requestTimeoutMs: 7000,
	showFavicon: true,
	keepEmoji: true,
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
		containerEl.createEl("h2", { text: "Inline link preview" });

		new Setting(containerEl)
			.setName("Convert links on paste")
			.setDesc("Automatically replace pasted URLs with inline link previews.")
			.addToggle((toggle) =>
				toggle
					.setValue(settings.autoPreviewOnPaste)
					.onChange(async (value) => {
						this.plugin.settings.autoPreviewOnPaste = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Include description")
			.setDesc("Add the page description (when available) after the page title.")
			.addToggle((toggle) =>
				toggle
					.setValue(settings.includeDescription)
					.onChange(async (value) => {
						this.plugin.settings.includeDescription = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Description length")
			.setDesc("Maximum number of characters to keep from the description.")
			.addText((text) => {
				text.setValue(String(settings.maxDescriptionLength));
				text.inputEl.type = "number";
				text.inputEl.min = "0";
				text.onChange(async (value) => {
					const parsed = Number(value);
					if (!Number.isFinite(parsed) || parsed < 0) {
						return;
					}
					this.plugin.settings.maxDescriptionLength = Math.round(parsed);
					await this.plugin.saveSettings();
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

		new Setting(containerEl)
			.setName("Clear cached previews")
			.setDesc("Remove stored metadata and favicons. Previews will be rebuilt on the next paste.")
			.addButton((button) =>
				button
					.setButtonText("Clear cache")
					.setWarning()
					.onClick(() => {
						this.plugin.linkPreviewService.clearCache();
						new Notice("Inline link preview cache cleared.");
					}),
			);
	}
}
