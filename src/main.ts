import { Editor, Plugin } from "obsidian";
import { registerCommands } from "./commands";
import { PastePreviewHandler } from "./editor/pastePreviewHandler";
import { LinkPreviewBuilder } from "./linkPreview/previewBuilder";
import { BulkLinkPreviewUpdater } from "./updater/bulkLinkPreviewUpdater";
import { DEFAULT_SETTINGS, InlineLinkPreviewSettingTab, InlineLinkPreviewSettings } from "./settings";
import { LinkPreviewService } from "./services/linkPreviewService";
import { RateLimitStatusManager } from "./status/rateLimitStatusManager";
import { LinkProcessingStatusManager } from "./status/progressStatusManager";

export default class InlineLinkPreviewPlugin extends Plugin {
	settings: InlineLinkPreviewSettings = DEFAULT_SETTINGS;
	linkPreviewService!: LinkPreviewService;
	previewBuilder!: LinkPreviewBuilder;
	pasteHandler!: PastePreviewHandler;
	bulkUpdater!: BulkLinkPreviewUpdater;
	rateLimitStatus!: RateLimitStatusManager;
	processingStatus!: LinkProcessingStatusManager;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.instantiateServices();

		this.registerEvent(
			this.app.workspace.on("editor-paste", async (event: ClipboardEvent, editor: Editor, info) => {
				await this.pasteHandler.handlePaste(event, editor, info);
			}),
		);

		registerCommands(this);
		this.addSettingTab(new InlineLinkPreviewSettingTab(this.app, this));
	}

	onunload(): void {
		// Nothing to clean up yet.
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
			useLinkPreviewApi: this.settings.useLinkPreviewApi && Boolean(this.settings.linkPreviewApiKey),
			linkPreviewApiKey: this.settings.linkPreviewApiKey || null,
		});
		this.rateLimitStatus.setEnabled(this.settings.showRateLimitTimer);
		if (this.settings.showRateLimitTimer) {
			this.rateLimitStatus.update(this.linkPreviewService.getRateLimitResetAt());
		}
	}

	private instantiateServices(): void {
		this.linkPreviewService = new LinkPreviewService({
			requestTimeoutMs: this.settings.requestTimeoutMs,
			useLinkPreviewApi: this.settings.useLinkPreviewApi && Boolean(this.settings.linkPreviewApiKey),
			linkPreviewApiKey: this.settings.linkPreviewApiKey || null,
		});
		this.previewBuilder = new LinkPreviewBuilder(this.linkPreviewService, () => this.settings);
		this.processingStatus = new LinkProcessingStatusManager(this);
		this.pasteHandler = new PastePreviewHandler(
			this.app,
			this.previewBuilder,
			() => this.settings,
			this.processingStatus,
		);
		this.bulkUpdater = new BulkLinkPreviewUpdater(this.app, this.previewBuilder);
		this.rateLimitStatus = new RateLimitStatusManager(this);
		this.rateLimitStatus.setEnabled(this.settings.showRateLimitTimer);
		this.linkPreviewService.setRateLimitListener((resetAt) => {
			this.rateLimitStatus.update(resetAt);
		});
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
		this.settings.useLinkPreviewApi = Boolean(this.settings.useLinkPreviewApi);
		this.settings.showRateLimitTimer = Boolean(this.settings.showRateLimitTimer);
		if (typeof this.settings.linkPreviewApiKey !== "string") {
			this.settings.linkPreviewApiKey = "";
		}
	}
}
