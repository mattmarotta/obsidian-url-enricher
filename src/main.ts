/**
 * Inline Link Preview Plugin for Obsidian
 *
 * Adds rich, dynamic link previews to Obsidian notes in Live Preview mode.
 * All previews are rendered dynamically without modifying markdown source files.
 *
 * @see https://github.com/your-repo/obsidian-inline-link-preview
 */

import { Plugin } from "obsidian";
import { createUrlPreviewDecorator, refreshDecorationsEffect as urlPreviewRefreshEffect } from "./editor/urlPreviewDecorator";
import { DEFAULT_SETTINGS, InlineLinkPreviewSettingTab, InlineLinkPreviewSettings } from "./settings";
import { LinkPreviewService } from "./services/linkPreviewService";
import { FaviconCache } from "./services/faviconCache";
import type { MarkdownViewWithEditor } from "./types/obsidian-extended";
import type { PreviewColorMode } from "./settings";

/**
 * Lookup table for preview color modes
 */
const COLOR_MODE_MAP: Record<PreviewColorMode, string> = {
	none: "transparent",
	custom: "", // Will be replaced with customPreviewColor
	grey: "var(--background-modifier-border)"
};

export default class InlineLinkPreviewPlugin extends Plugin {
	settings: InlineLinkPreviewSettings = DEFAULT_SETTINGS;
	linkPreviewService!: LinkPreviewService;
	faviconCache!: FaviconCache;

	/**
	 * Plugin initialization - called when the plugin is loaded
	 */
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

	/**
	 * Plugin cleanup - called when the plugin is unloaded
	 */
	async onunload(): Promise<void> {
		// Flush favicon cache to disk before unloading
		if (this.faviconCache) {
			await this.faviconCache.flush();
		}
	}

	/**
	 * Load plugin settings from disk and normalize them
	 */
	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.normalizeSettings();
	}

	/**
	 * Save plugin settings to disk and update all services
	 */
	async saveSettings(): Promise<void> {
		this.normalizeSettings();
		await this.saveData(this.settings);
		this.linkPreviewService.updateOptions({
			requestTimeoutMs: this.settings.requestTimeoutMs,
		});
		this.linkPreviewService.updateSettings(this.settings);
	}

	/**
	 * Update the CSS variable for preview bubble background color
	 */
	updateBubbleColorCSS(): void {
		const mode = this.settings.previewColorMode;
		const color = mode === "custom"
			? this.settings.customPreviewColor
			: COLOR_MODE_MAP[mode];

		// Update CSS variable
		document.documentElement.style.setProperty("--inline-preview-bg", color);
	}

	/**
	 * Refresh all preview decorations across all open markdown editors
	 * Called when settings change to update all visible previews
	 */
	refreshDecorations(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			// Only process markdown views
			if (leaf.view.getViewType() !== "markdown") {
				return;
			}

			const view = leaf.view as MarkdownViewWithEditor;
			const cm = view.editor?.cm;

			// Early return if no CodeMirror instance
			if (!cm) {
				return;
			}

			// Dispatch refresh effect to trigger decoration rebuild
			cm.dispatch({
				effects: [urlPreviewRefreshEffect.of(null)]
			});
		});
	}

	/**
	 * Initialize all plugin services (favicon cache and link preview service)
	 */
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

	/**
	 * Normalize and validate settings to ensure they're within acceptable ranges
	 * Converts string values to numbers and enforces min/max bounds
	 */
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
