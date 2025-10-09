import { Editor, Plugin } from "obsidian";
import { registerCommands } from "./commands";
import { PastePreviewHandler } from "./editor/pastePreviewHandler";
import { LinkPreviewBuilder } from "./linkPreview/previewBuilder";
import { BulkLinkPreviewUpdater } from "./updater/bulkLinkPreviewUpdater";
import { DEFAULT_SETTINGS, InlineLinkPreviewSettingTab, InlineLinkPreviewSettings } from "./settings";
import { LinkPreviewService } from "./services/linkPreviewService";
import { RateLimitStatusManager } from "./status/rateLimitStatusManager";

export default class InlineLinkPreviewPlugin extends Plugin {
	settings: InlineLinkPreviewSettings = DEFAULT_SETTINGS;
	linkPreviewService!: LinkPreviewService;
	previewBuilder!: LinkPreviewBuilder;
	pasteHandler!: PastePreviewHandler;
	bulkUpdater!: BulkLinkPreviewUpdater;
	rateLimitStatus!: RateLimitStatusManager;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.instantiateServices();

		this.registerEvent(
			this.app.workspace.on("editor-paste", async (event: ClipboardEvent, editor: Editor) => {
				await this.pasteHandler.handlePaste(event, editor);
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
	}

	async saveSettings(): Promise<void> {
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
		this.pasteHandler = new PastePreviewHandler(this.previewBuilder, () => this.settings);
		this.bulkUpdater = new BulkLinkPreviewUpdater(this.app, this.previewBuilder);
		this.rateLimitStatus = new RateLimitStatusManager(this);
		this.rateLimitStatus.setEnabled(this.settings.showRateLimitTimer);
		this.linkPreviewService.setRateLimitListener((resetAt) => {
			this.rateLimitStatus.update(resetAt);
		});
	}
}
