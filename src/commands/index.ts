import { Editor, MarkdownFileInfo, MarkdownView, Notice, TFile, TFolder } from "obsidian";
import type InlineLinkPreviewPlugin from "../main";
import { BulkConversionModal, BulkConversionScope } from "../modals/bulkConversionModal";
import { getPrimarySelection } from "../utils/editorHelpers";
import { collectMarkdownFiles, listAllFolders } from "../utils/vault";
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
	const { bulkUpdater } = plugin;
	let targetFiles: TFile[] = [];

	if (scope.type === "file") {
		targetFiles = [scope.file];
	} else if (scope.type === "folder") {
		targetFiles = collectMarkdownFiles(scope.folder);
	} else {
		targetFiles = plugin.app.vault.getMarkdownFiles();
	}

	if (targetFiles.length === 0) {
		new Notice("No Markdown notes were found to convert.");
		return;
	}

	const progressLabel = targetFiles.length === 1 ? "Converting note" : "Converting notes";
	const progress = plugin.processingStatus.create(progressLabel, targetFiles.length);
	const activePath = plugin.app.workspace.getActiveFile()?.path ?? null;
	let warnedActiveFile = false;

	let linksConverted = 0;
	let filesUpdated = 0;

	try {
		for (let index = 0; index < targetFiles.length; index += 1) {
			const file = targetFiles[index];
			const isActiveFile = activePath !== null && file.path === activePath;
			const label = isActiveFile
				? `Converting "${file.basename}" - avoid editing this note while processing.`
				: `Converting "${file.basename}"`;
			progress.setLabel(label);

			if (isActiveFile && !warnedActiveFile) {
				new Notice(
					`Inline link preview is updating "${file.basename}". Avoid editing it until the conversion completes.`,
				);
				warnedActiveFile = true;
			}

			const converted = await bulkUpdater.convertFile(file);
			if (converted > 0) {
				linksConverted += converted;
				filesUpdated += 1;
			}

			progress.increment();
		}

		if (linksConverted === 0) {
			new Notice("No plain links were found to convert.");
			return;
		}

		new Notice(
			`Converted ${linksConverted} link${linksConverted === 1 ? "" : "s"} across ${filesUpdated} note${filesUpdated === 1 ? "" : "s"}.`,
		);
	} catch (error) {
		console.error("[inline-link-preview] Bulk conversion failed", error);
		new Notice("Failed to convert links. Check the developer console for details.");
	} finally {
		progress.finish();
	}
}
