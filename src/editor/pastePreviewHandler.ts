import { Notice } from "obsidian";
import type { Editor } from "obsidian";
import type { LinkPreviewBuilder } from "../linkPreview/previewBuilder";
import type { InlineLinkPreviewSettings } from "../settings";
import { getPrimarySelection, isRangeMatching } from "../utils/editorHelpers";
import { extractUrlList } from "../utils/url";
import { replaceUrlsWithPreviews } from "./urlListConverter";

export class PastePreviewHandler {
	private readonly builder: LinkPreviewBuilder;
	private readonly getSettings: () => InlineLinkPreviewSettings;

	constructor(builder: LinkPreviewBuilder, getSettings: () => InlineLinkPreviewSettings) {
		this.builder = builder;
		this.getSettings = getSettings;
	}

	async handlePaste(event: ClipboardEvent, editor: Editor): Promise<void> {
		const settings = this.getSettings();
		if (!settings.autoPreviewOnPaste) {
			return;
		}

		const clipboardText = event.clipboardData?.getData("text/plain") ?? "";
		const urlEntries = extractUrlList(clipboardText);
		if (!urlEntries || urlEntries.length === 0) {
			return;
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
			const { text: previewText, converted } = await replaceUrlsWithPreviews(this.builder, clipboardText, urlEntries);
			if (converted === 0) {
				return;
			}

			if (!isRangeMatching(editor, range, clipboardText)) {
				return;
			}

			editor.replaceRange(previewText, range.start, range.end);
			editor.setCursor(editor.offsetToPos(startOffset + previewText.length));
		} catch (error) {
			console.warn("[inline-link-preview] Failed to build preview for pasted links", error);
			new Notice("Inline link preview failed; pasted URLs were left unchanged.");
		}
	}
}
