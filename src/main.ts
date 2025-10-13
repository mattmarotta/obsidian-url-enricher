import { Editor, Plugin } from "obsidian";
import { registerCommands } from "./commands";
import { PastePreviewHandler } from "./editor/pastePreviewHandler";
import { createFaviconDecorator, refreshDecorationsEffect as faviconRefreshEffect } from "./editor/faviconDecorator";
import { createUrlPreviewDecorator, refreshDecorationsEffect as urlPreviewRefreshEffect } from "./editor/urlPreviewDecorator";
import { LinkPreviewBuilder } from "./linkPreview/previewBuilder";
import { BulkLinkPreviewUpdater } from "./updater/bulkLinkPreviewUpdater";
import { DEFAULT_SETTINGS, InlineLinkPreviewSettingTab, InlineLinkPreviewSettings } from "./settings";
import { LinkPreviewService } from "./services/linkPreviewService";
import { FaviconCache } from "./services/faviconCache";
import { LinkProcessingStatusManager } from "./status/progressStatusManager";

export default class InlineLinkPreviewPlugin extends Plugin {
	settings: InlineLinkPreviewSettings = DEFAULT_SETTINGS;
	linkPreviewService!: LinkPreviewService;
	faviconCache!: FaviconCache;
	previewBuilder!: LinkPreviewBuilder;
	pasteHandler!: PastePreviewHandler;
	bulkUpdater!: BulkLinkPreviewUpdater;
	processingStatus!: LinkProcessingStatusManager;

	async onload(): Promise<void> {
		await this.loadSettings();
		await this.instantiateServices();

		// Apply bubble color CSS
		this.updateBubbleColorCSS();

		this.registerEvent(
			this.app.workspace.on("editor-paste", async (event: ClipboardEvent, editor: Editor, info) => {
				await this.pasteHandler.handlePaste(event, editor, info);
			}),
		);

		// Register the favicon decorator and URL preview decorator for Live Preview
		this.registerEditorExtension([
			createFaviconDecorator(this.linkPreviewService, () => this.settings),
			createUrlPreviewDecorator(this.linkPreviewService, () => this.settings)
		]);

		registerCommands(this);
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
	}

	updateBubbleColorCSS(): void {
		let color: string;

		switch (this.settings.bubbleColorMode) {
			case "none":
				color = "transparent";
				break;
			case "custom":
				color = this.settings.customBubbleColor;
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
					// Dispatch both refresh effects to trigger decoration rebuild
					cm.dispatch({
						effects: [
							faviconRefreshEffect.of(null),
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
		});
		this.linkPreviewService.setPersistentFaviconCache(this.faviconCache);

		this.previewBuilder = new LinkPreviewBuilder(this.linkPreviewService, () => this.settings);
		this.processingStatus = new LinkProcessingStatusManager(this);
		this.pasteHandler = new PastePreviewHandler(
			this.app,
			this.previewBuilder,
			() => this.settings,
			this.processingStatus,
		);
		this.bulkUpdater = new BulkLinkPreviewUpdater(this.app, this.previewBuilder);
	}

	private normalizeSettings(): void {
		const numericDescription = Number(this.settings.maxDescriptionLength);
		this.settings.maxDescriptionLength = Number.isFinite(numericDescription)
			? Math.max(0, Math.round(numericDescription))
			: DEFAULT_SETTINGS.maxDescriptionLength;

		const numericTimeout = Number(this.settings.requestTimeoutMs);
		this.settings.requestTimeoutMs = Number.isFinite(numericTimeout)
			? Math.max(500, Math.round(numericTimeout))
			: DEFAULT_SETTINGS.requestTimeoutMs;

		this.settings.showFavicon = Boolean(this.settings.showFavicon);
		this.settings.keepEmoji = Boolean(this.settings.keepEmoji);
	}
}
