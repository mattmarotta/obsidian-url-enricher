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
	onunload(): void {
		// Flush favicon cache to disk before unloading
		if (this.faviconCache) {
			void this.faviconCache.flush();
		}

		// Clean up developer commands
		this.unregisterDeveloperCommands();
	}

	/**
	 * Load plugin settings from disk and normalize them
	 */
	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	/**
	 * Save plugin settings to disk and update all services
	 */
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.linkPreviewService.updateOptions({
			requestTimeoutMs: this.settings.requestTimeoutMs,
		});
		this.linkPreviewService.updateSettings(this.settings);
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
				return { metadata, favicon };
			},

			// Clear all caches
			clearAllCaches: () => {
				this.linkPreviewService.clearCache();
				this.faviconCache.clear();
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
				},

			// Performance tracking
			enablePerformanceTracking: () => {
				enablePerformanceTracking();
				},

			disablePerformanceTracking: () => {
				disablePerformanceTracking();
				},

			getPerformanceMetrics: () => {
				const metrics = getAllPerformanceMetrics();
					return metrics;
			},

			resetPerformanceMetrics: () => {
				resetPerformanceMetrics();
				},

			isPerformanceTrackingEnabled: () => {
				const enabled = isPerformanceTrackingEnabled();
					return enabled;
			},

			// Refresh decorations
			refreshDecorations: () => {
				this.refreshDecorations();
				},

			// Help
			help: () => {
				return(`
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
		window.urlEnricher = api;
		window.inlineLinkPreview = api;

	}

	/**
	 * Clean up developer commands
	 */
	private unregisterDeveloperCommands(): void {
		delete window.urlEnricher;
		delete window.inlineLinkPreview;
	}
}
