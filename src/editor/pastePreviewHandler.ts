import { Editor, Notice } from "obsidian";
import type { LinkPreviewBuilder } from "../linkPreview/previewBuilder";
import type { InlineLinkPreviewSettings } from "../settings";
import { getPrimarySelection, isRangeMatching } from "../utils/editorHelpers";
import { extractSingleUrl } from "../utils/url";

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
		const url = extractSingleUrl(clipboardText);
		if (!url) {
			return;
		}

		event.preventDefault();

		const selection = getPrimarySelection(editor);
		const startOffset = editor.posToOffset(selection.start);

		editor.replaceSelection(url);

		const range = {
			start: editor.offsetToPos(startOffset),
			end: editor.offsetToPos(startOffset + url.length),
		};

		try {
			const preview = await this.builder.build(url);
			if (!preview) {
				return;
			}

			if (!isRangeMatching(editor, range, url)) {
				return;
			}

			editor.replaceRange(preview, range.start, range.end);
			editor.setCursor(editor.offsetToPos(startOffset + preview.length));
		} catch (error) {
			console.warn("[inline-link-preview] Failed to build preview for pasted link", error);
			new Notice("Inline link preview failed; pasted URL was left unchanged.");
		}
	}
}
