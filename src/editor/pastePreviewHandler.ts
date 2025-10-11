import { Notice } from "obsidian";
import type { App, Editor, MarkdownFileInfo, MarkdownView, TFile } from "obsidian";
import type { LinkPreviewBuilder } from "../linkPreview/previewBuilder";
import type { InlineLinkPreviewSettings } from "../settings";
import { getPrimarySelection, isRangeMatching } from "../utils/editorHelpers";
import { extractUrlList } from "../utils/url";
import { replaceUrlsWithPreviews } from "./urlListConverter";
import type { ProgressReporter } from "../status/progressStatusManager";
import { LinkProcessingStatusManager } from "../status/progressStatusManager";

export class PastePreviewHandler {
	private readonly app: App;
	private readonly builder: LinkPreviewBuilder;
	private readonly getSettings: () => InlineLinkPreviewSettings;
	private readonly progressStatus: LinkProcessingStatusManager;

	constructor(
		app: App,
		builder: LinkPreviewBuilder,
		getSettings: () => InlineLinkPreviewSettings,
		progressStatus: LinkProcessingStatusManager,
	) {
		this.app = app;
		this.builder = builder;
		this.getSettings = getSettings;
		this.progressStatus = progressStatus;
	}

	async handlePaste(
		event: ClipboardEvent,
		editor: Editor,
		info: MarkdownView | MarkdownFileInfo,
	): Promise<void> {
		const settings = this.getSettings();
		if (!settings.autoPreviewOnPaste) {
			return;
		}

		const clipboardText = event.clipboardData?.getData("text/plain") ?? "";
		const urlEntries = extractUrlList(clipboardText);
		if (!urlEntries || urlEntries.length === 0) {
			return;
		}

		const file = this.resolveFile(info);

		let progress: ProgressReporter | null = null;
		if (urlEntries.length > 1) {
			progress = this.progressStatus.create("Pasting links", urlEntries.length);
		}

		event.preventDefault();

		const selection = getPrimarySelection(editor);
		const startOffset = editor.posToOffset(selection.start);

		editor.replaceSelection(clipboardText);

		const range = {
			start: editor.offsetToPos(startOffset),
			end: editor.offsetToPos(startOffset + clipboardText.length),
		};

		try {
			const { text: previewText, converted } = await replaceUrlsWithPreviews(
				this.builder,
				clipboardText,
				urlEntries,
				progress ?? undefined,
			);
			if (converted === 0) {
				return;
			}

			if (isRangeMatching(editor, range, clipboardText)) {
				editor.replaceRange(previewText, range.start, range.end);
				editor.setCursor(editor.offsetToPos(startOffset + previewText.length));
				return;
			}

			if (file) {
				const replaced = await this.replaceInFile(file, startOffset, clipboardText, previewText);
				if (!replaced) {
					console.warn("[inline-link-preview] Failed to apply link preview fallback update", {
						file: file.path,
					});
				}
				return;
			}

			console.warn("[inline-link-preview] Skipped link preview replacement; editor range changed");
		} catch (error) {
			console.warn("[inline-link-preview] Failed to build preview for pasted links", error);
			new Notice("Inline link preview failed; pasted URLs were left unchanged.");
		} finally {
			progress?.finish();
		}
	}

	private resolveFile(info: MarkdownView | MarkdownFileInfo): TFile | null {
		try {
			const file = info.file;
			return file ?? null;
		} catch {
			return null;
		}
	}

	private async replaceInFile(
		file: TFile,
		expectedOffset: number,
		originalText: string,
		replacement: string,
	): Promise<boolean> {
		try {
			const content = await this.app.vault.read(file);

			const directMatch = content.slice(expectedOffset, expectedOffset + originalText.length);
			let startIndex = -1;
			if (directMatch === originalText) {
				startIndex = expectedOffset;
			} else {
				const firstIndex = content.indexOf(originalText);
				if (firstIndex === -1) {
					return false;
				}
				const secondIndex = content.indexOf(originalText, firstIndex + 1);
				if (secondIndex !== -1) {
					return false;
				}
				startIndex = firstIndex;
			}

			const updated =
				content.slice(0, startIndex) + replacement + content.slice(startIndex + originalText.length);
			await this.app.vault.modify(file, updated);
			return true;
		} catch (error) {
			console.warn("[inline-link-preview] Failed to replace pasted links in file", file.path, error);
			return false;
		}
	}
}
