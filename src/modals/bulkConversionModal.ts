import { App, Modal, Setting, TFile, TFolder } from "obsidian";
import { MarkdownFileSuggestModal, FolderSuggestModal } from "./fileSuggest";

export type BulkConversionScope =
	| { type: "file"; file: TFile }
	| { type: "folder"; folder: TFolder }
	| { type: "vault" };

interface BulkConversionModalOptions {
	activeFile: TFile | null;
	getMarkdownFiles: () => TFile[];
	getFolders: () => TFolder[];
	onScopeSelected: (scope: BulkConversionScope) => void;
}

export class BulkConversionModal extends Modal {
	private readonly options: BulkConversionModalOptions;

	constructor(app: App, options: BulkConversionModalOptions) {
		super(app);
		this.options = options;
	}

	onOpen(): void {
		const { contentEl } = this;
		const { activeFile } = this.options;

		contentEl.empty();
		contentEl.createEl("h2", { text: "Convert existing links" });
		contentEl.createEl("p", {
			text: "Choose where the plugin should scan for plain URLs to upgrade to inline previews.",
		});

		new Setting(contentEl)
			.setName("Active note")
			.setDesc("Convert plain links in the currently open note.")
			.addButton((button) =>
				button
					.setButtonText("Convert")
					.setDisabled(!activeFile)
					.onClick(() => {
						if (!activeFile) {
							return;
						}
						this.options.onScopeSelected({ type: "file", file: activeFile });
						this.close();
					}),
			);

		new Setting(contentEl)
			.setName("Select note…")
			.setDesc("Pick a single note to convert.")
			.addButton((button) =>
				button.setButtonText("Choose").onClick(() => {
					const modal = new MarkdownFileSuggestModal(
						this.app,
						this.options.getMarkdownFiles,
						(file) => {
							this.options.onScopeSelected({ type: "file", file });
						},
					);
					modal.open();
					this.close();
				}),
			);

		new Setting(contentEl)
			.setName("Folder…")
			.setDesc("Scan every Markdown file in a folder (recursively).")
			.addButton((button) =>
				button.setButtonText("Choose").onClick(() => {
					const modal = new FolderSuggestModal(this.app, this.options.getFolders, (folder) => {
						this.options.onScopeSelected({ type: "folder", folder });
					});
					modal.open();
					this.close();
				}),
			);

		new Setting(contentEl)
			.setName("Entire vault")
			.setDesc("Convert plain links across all notes.")
			.addButton((button) =>
				button.setButtonText("Convert").onClick(() => {
					this.options.onScopeSelected({ type: "vault" });
					this.close();
				}),
			);
	}
}
