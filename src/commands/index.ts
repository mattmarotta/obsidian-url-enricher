import { Editor, MarkdownFileInfo, MarkdownView, Notice, TFile, TFolder } from "obsidian";
import type InlineLinkPreviewPlugin from "../main";
import { BulkConversionModal, BulkConversionScope } from "../modals/bulkConversionModal";
import { getPrimarySelection } from "../utils/editorHelpers";
import { listAllFolders } from "../utils/vault";
import { extractSingleUrl } from "../utils/url";

export function registerCommands(plugin: InlineLinkPreviewPlugin): void {
	registerConvertSelectionCommand(plugin);
	registerBulkConversionCommand(plugin);
}

function registerConvertSelectionCommand(plugin: InlineLinkPreviewPlugin): void {
	plugin.addCommand({
		id: "inline-link-preview-convert-selection",
		name: "Convert selection to inline preview",
		editorCheckCallback: (checking, editor: Editor, _context: MarkdownView | MarkdownFileInfo) => {
			const selection = editor.getSelection();
			const url = extractSingleUrl(selection);
			if (!url) {
				return false;
			}

			if (checking) {
				return true;
			}

			convertSelection(editor, url, plugin).catch((error) => {
				console.error("[inline-link-preview] Selection conversion failed", error);
				new Notice("Inline link preview failed. See console for details.");
			});

			return true;
		},
	});
}

function registerBulkConversionCommand(plugin: InlineLinkPreviewPlugin): void {
	plugin.addCommand({
		id: "inline-link-preview-bulk-convert",
		name: "Convert existing links to inline previews…",
		callback: () => {
			const modal = new BulkConversionModal(plugin.app, {
				activeFile: plugin.app.workspace.getActiveFile(),
				getMarkdownFiles: () => plugin.app.vault.getMarkdownFiles(),
				getFolders: () => listAllFolders(plugin.app.vault),
				onScopeSelected: async (scope) => {
					await performBulkConversion(plugin, scope);
				},
			});
			modal.open();
		},
	});
}

async function convertSelection(editor: Editor, url: string, plugin: InlineLinkPreviewPlugin): Promise<void> {
	const range = getPrimarySelection(editor);
	const startOffset = editor.posToOffset(range.start);
	const preview = await plugin.previewBuilder.build(url);
	editor.replaceRange(preview, range.start, range.end);
	const endPos = editor.offsetToPos(startOffset + preview.length);
	editor.setCursor(endPos);
}

async function performBulkConversion(
	plugin: InlineLinkPreviewPlugin,
	scope: BulkConversionScope,
): Promise<void> {
	const progress = plugin.processingStatus.create("Converting links");
	try {
		const { bulkUpdater } = plugin;
		let stats;

		if (scope.type === "file") {
			const converted = await bulkUpdater.convertFile(scope.file, progress);
			stats = {
				filesProcessed: 1,
				filesUpdated: converted > 0 ? 1 : 0,
				linksConverted: converted,
			};
		} else if (scope.type === "folder") {
			stats = await bulkUpdater.convertFolder(scope.folder, progress);
		} else {
			stats = await bulkUpdater.convertVault(progress);
		}

		if (stats.linksConverted === 0) {
			new Notice("No plain links were found to convert.");
			return;
		}

		new Notice(
			`Converted ${stats.linksConverted} link${stats.linksConverted === 1 ? "" : "s"} across ${stats.filesUpdated} note${stats.filesUpdated === 1 ? "" : "s"}.`,
		);
	} catch (error) {
		console.error("[inline-link-preview] Bulk conversion failed", error);
		new Notice("Failed to convert links. Check the developer console for details.");
	} finally {
		progress.finish();
	}
}
