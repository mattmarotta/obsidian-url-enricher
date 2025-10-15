import { Plugin } from "obsidian";
import { createUrlPreviewDecorator, refreshDecorationsEffect as urlPreviewRefreshEffect } from "./editor/urlPreviewDecorator";
import { DEFAULT_SETTINGS, InlineLinkPreviewSettingTab, InlineLinkPreviewSettings } from "./settings";
import { LinkPreviewService } from "./services/linkPreviewService";
import { FaviconCache } from "./services/faviconCache";

export default class InlineLinkPreviewPlugin extends Plugin {
	settings: InlineLinkPreviewSettings = DEFAULT_SETTINGS;
	linkPreviewService!: LinkPreviewService;
	faviconCache!: FaviconCache;

	async onload(): Promise<void> {
		await this.loadSettings();
		await this.instantiateServices();

		// Apply bubble color CSS
		this.updateBubbleColorCSS();

		// Register the URL preview decorator for Live Preview (favicon decorator removed - non-destructive mode only)
		this.registerEditorExtension([
			createUrlPreviewDecorator(this.linkPreviewService, () => this.settings)
		]);

		this.addSettingTab(new InlineLinkPreviewSettingTab(this.app, this));
	}

	async onunload(): Promise<void> {
		// Flush favicon cache to disk before unloading
		if (this.faviconCache) {
			await this.faviconCache.flush();
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.normalizeSettings();
	}

	async saveSettings(): Promise<void> {
		this.normalizeSettings();
		await this.saveData(this.settings);
		this.linkPreviewService.updateOptions({
			requestTimeoutMs: this.settings.requestTimeoutMs,
		});
		this.linkPreviewService.updateSettings(this.settings);
	}

	updateBubbleColorCSS(): void {
		let color: string;

		switch (this.settings.previewColorMode) {
			case "none":
				color = "transparent";
				break;
			case "custom":
				color = this.settings.customPreviewColor;
				break;
			case "grey":
			default:
				color = "var(--background-modifier-border)";
				break;
		}

		// Update CSS variable
		document.documentElement.style.setProperty("--inline-preview-bg", color);
	}

	refreshDecorations(): void {
		// Dispatch the refresh StateEffect to all markdown editors
		// This properly triggers the ViewPlugin update cycle
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view.getViewType() === "markdown") {
				const view = leaf.view as any;
				const cm = view.editor?.cm;
				
				if (cm) {
					// Dispatch refresh effect to trigger decoration rebuild
					cm.dispatch({
						effects: [
							urlPreviewRefreshEffect.of(null)
						]
					});
				}
			}
		});
	}

	private async instantiateServices(): Promise<void> {
		// Initialize favicon cache
		this.faviconCache = new FaviconCache(
			() => this.loadData(),
			(data) => this.saveData(data)
		);
		await this.faviconCache.load();

		// Initialize link preview service
		this.linkPreviewService = new LinkPreviewService({
			requestTimeoutMs: this.settings.requestTimeoutMs,
		}, this.settings);
		this.linkPreviewService.setPersistentFaviconCache(this.faviconCache);
	}

	private normalizeSettings(): void {
		const numericCardLength = Number(this.settings.maxCardLength);
		this.settings.maxCardLength = Number.isFinite(numericCardLength)
			? Math.min(5000, Math.max(100, Math.round(numericCardLength)))
			: DEFAULT_SETTINGS.maxCardLength;

		const numericBubbleLength = Number(this.settings.maxBubbleLength);
		this.settings.maxBubbleLength = Number.isFinite(numericBubbleLength)
			? Math.min(5000, Math.max(50, Math.round(numericBubbleLength)))
			: DEFAULT_SETTINGS.maxBubbleLength;

		const numericTimeout = Number(this.settings.requestTimeoutMs);
		this.settings.requestTimeoutMs = Number.isFinite(numericTimeout)
			? Math.max(500, Math.round(numericTimeout))
			: DEFAULT_SETTINGS.requestTimeoutMs;

		this.settings.showFavicon = Boolean(this.settings.showFavicon);
		this.settings.keepEmoji = Boolean(this.settings.keepEmoji);
	}
}
