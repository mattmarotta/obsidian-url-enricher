/**
 * URL Enricher Plugin for Obsidian
 *
 * Adds rich, non-destructive link previews to Obsidian notes in Live Preview mode.
 * All previews are rendered dynamically without modifying markdown source files.
 *
 * @see https://github.com/mattmarotta/obsidian-url-enricher
 */

import { Plugin } from "obsidian";
import { createUrlPreviewDecorator, refreshDecorationsEffect as urlPreviewRefreshEffect } from "./editor/urlPreviewDecorator";
import { DEFAULT_SETTINGS, InlineLinkPreviewSettingTab, InlineLinkPreviewSettings } from "./settings";
import { LinkPreviewService } from "./services/linkPreviewService";
import { FaviconCache } from "./services/faviconCache";
import type { MarkdownViewWithEditor } from "./types/obsidian-extended";
import { Logger, LogLevel } from "./utils/logger";
import {
	enablePerformanceTracking,
	disablePerformanceTracking,
	getAllPerformanceMetrics,
	resetPerformanceMetrics,
	isPerformanceTrackingEnabled
} from "./utils/performance";

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

		// Apply preview color CSS
		this.updatePreviewColorCSS();

		// Register the URL preview decorator for Live Preview (favicon decorator removed - non-destructive mode only)
		this.registerEditorExtension([
			createUrlPreviewDecorator(this.linkPreviewService, () => this.settings)
		]);

		this.addSettingTab(new InlineLinkPreviewSettingTab(this.app, this));

		// Register developer console commands
		this.registerDeveloperCommands();
	}

	/**
	 * Plugin cleanup - called when the plugin is unloaded
	 */
	async onunload(): Promise<void> {
		// Flush favicon cache to disk before unloading
		if (this.faviconCache) {
			await this.faviconCache.flush();
		}

		// Clean up color mode classes
		document.body.removeClass(
			'url-enricher-inline-none',
			'url-enricher-inline-grey',
			'url-enricher-inline-custom',
			'url-enricher-card-none',
			'url-enricher-card-grey',
			'url-enricher-card-custom'
		);

		// Clean up CSS variable
		document.documentElement.style.removeProperty('--url-enricher-custom-color');

		// Clean up developer commands
		this.unregisterDeveloperCommands();
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
	 * Update the preview background color using body classes
	 */
	updatePreviewColorCSS(): void {
		const settings = this.settings;

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
	 * Also handles migration from old settings (v0.8.0 -> v0.9.0)
	 */
	private normalizeSettings(): void {
		const numericCardLength = Number(this.settings.maxCardLength);
		this.settings.maxCardLength = Number.isFinite(numericCardLength)
			? Math.min(5000, Math.max(1, Math.round(numericCardLength)))
			: DEFAULT_SETTINGS.maxCardLength;

		// Migration: maxBubbleLength -> maxInlineLength (v0.9.0)
		const settings = this.settings as any;
		if (settings.maxBubbleLength !== undefined && settings.maxInlineLength === undefined) {
			settings.maxInlineLength = settings.maxBubbleLength;
			delete settings.maxBubbleLength;
		}

		const numericInlineLength = Number(this.settings.maxInlineLength);
		this.settings.maxInlineLength = Number.isFinite(numericInlineLength)
			? Math.min(5000, Math.max(1, Math.round(numericInlineLength)))
			: DEFAULT_SETTINGS.maxInlineLength;

		// Migration: Remove deprecated displayMode (v0.9.0)
		if (settings.displayMode !== undefined) {
			delete settings.displayMode;
		}

		// Migration: previewColorMode -> inlineColorMode + cardColorMode (v1.0.2)
		if (settings.previewColorMode !== undefined) {
			// Migrate to new defaults: grey inline, transparent cards
			if (settings.previewColorMode === 'grey') {
				// Old default was grey for both - split into grey inline + transparent cards
				settings.inlineColorMode = 'grey';
				settings.cardColorMode = 'none';
			} else {
				// If they chose none/custom, apply to both for backwards compat
				settings.inlineColorMode = settings.previewColorMode;
				settings.cardColorMode = settings.previewColorMode;
			}
			delete settings.previewColorMode;
		}

		// Migration: customPreviewColor -> customInlineColor + customCardColor (v1.0.2)
		if (settings.customPreviewColor !== undefined) {
			// Migrate single custom color to both inline and card
			if (!settings.customInlineColor) {
				settings.customInlineColor = settings.customPreviewColor;
			}
			if (!settings.customCardColor) {
				settings.customCardColor = settings.customPreviewColor;
			}
			delete settings.customPreviewColor;
		}

		// Ensure color modes are set
		if (!settings.inlineColorMode) {
			settings.inlineColorMode = DEFAULT_SETTINGS.inlineColorMode;
		}
		if (!settings.cardColorMode) {
			settings.cardColorMode = DEFAULT_SETTINGS.cardColorMode;
		}

		// Ensure custom colors are set
		if (!settings.customInlineColor) {
			settings.customInlineColor = DEFAULT_SETTINGS.customInlineColor;
		}
		if (!settings.customCardColor) {
			settings.customCardColor = DEFAULT_SETTINGS.customCardColor;
		}

		const numericTimeout = Number(this.settings.requestTimeoutMs);
		this.settings.requestTimeoutMs = Number.isFinite(numericTimeout)
			? Math.max(500, Math.round(numericTimeout))
			: DEFAULT_SETTINGS.requestTimeoutMs;

		this.settings.showFavicon = Boolean(this.settings.showFavicon);
		this.settings.keepEmoji = Boolean(this.settings.keepEmoji);
		this.settings.requireFrontmatter = Boolean(this.settings.requireFrontmatter);
	}

	/**
	 * Register developer console commands for debugging
	 * Access via: window.urlEnricher.*
	 */
	private registerDeveloperCommands(): void {
		// Expose debugging API on window object (maintain backwards compatibility with old name)
		const api = {
			// Cache inspection
			getCacheStats: () => {
				const metadata = this.linkPreviewService.getCacheStats();
				const favicon = this.faviconCache.getStats();
				console.log("Metadata Cache:", metadata);
				console.log("Favicon Cache:", favicon);
				return { metadata, favicon };
			},

			// Clear all caches
			clearAllCaches: () => {
				this.linkPreviewService.clearCache();
				this.faviconCache.clear();
				console.log("All caches cleared");
			},

			// Logging control
			setLogLevel: (level: "error" | "warn" | "info" | "debug") => {
				const levelMap = {
					error: LogLevel.ERROR,
					warn: LogLevel.WARN,
					info: LogLevel.INFO,
					debug: LogLevel.DEBUG
				};
				Logger.setGlobalLevel(levelMap[level] ?? LogLevel.WARN);
				console.log(`Log level set to: ${level}`);
			},

			// Performance tracking
			enablePerformanceTracking: () => {
				enablePerformanceTracking();
				console.log("Performance tracking enabled");
			},

			disablePerformanceTracking: () => {
				disablePerformanceTracking();
				console.log("Performance tracking disabled");
			},

			getPerformanceMetrics: () => {
				const metrics = getAllPerformanceMetrics();
				console.table(metrics);
				return metrics;
			},

			resetPerformanceMetrics: () => {
				resetPerformanceMetrics();
				console.log("Performance metrics reset");
			},

			isPerformanceTrackingEnabled: () => {
				const enabled = isPerformanceTrackingEnabled();
				console.log(`Performance tracking: ${enabled ? "enabled" : "disabled"}`);
				return enabled;
			},

			// Refresh decorations
			refreshDecorations: () => {
				this.refreshDecorations();
				console.log("Decorations refreshed");
			},

			// Help
			help: () => {
				console.log(`
URL Enricher - Developer Commands
==================================

Cache Management:
  .getCacheStats()              - View cache statistics
  .clearAllCaches()             - Clear all caches

Logging:
  .setLogLevel(level)           - Set log level: "error", "warn", "info", "debug"

Performance:
  .enablePerformanceTracking()  - Enable performance tracking
  .disablePerformanceTracking() - Disable performance tracking
  .getPerformanceMetrics()      - View performance metrics
  .resetPerformanceMetrics()    - Reset performance metrics
  .isPerformanceTrackingEnabled() - Check if tracking is enabled

Other:
  .refreshDecorations()         - Refresh all preview decorations
  .help()                       - Show this help message

Example:
  window.urlEnricher.setLogLevel("debug")
  window.urlEnricher.enablePerformanceTracking()
  window.urlEnricher.getCacheStats()
				`);
			}
		};

		// Set both new and old names for backwards compatibility
		(window as any).urlEnricher = api;
		(window as any).inlineLinkPreview = api;

		console.log("URL Enricher: Developer commands available at window.urlEnricher (also window.inlineLinkPreview for backwards compatibility)");
		console.log("Type window.urlEnricher.help() for more info");
	}

	/**
	 * Clean up developer commands
	 */
	private unregisterDeveloperCommands(): void {
		delete (window as any).urlEnricher;
		delete (window as any).inlineLinkPreview;
	}
}
