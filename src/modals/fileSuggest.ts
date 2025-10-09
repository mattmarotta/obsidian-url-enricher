import { App, FuzzyMatch, FuzzySuggestModal, TFile, TFolder } from "obsidian";

export class MarkdownFileSuggestModal extends FuzzySuggestModal<TFile> {
	private readonly getFiles: () => TFile[];
	private readonly onChoose: (file: TFile) => void;

	constructor(app: App, getFiles: () => TFile[], onChoose: (file: TFile) => void) {
		super(app);
		this.getFiles = getFiles;
		this.onChoose = onChoose;
		this.setPlaceholder("Choose a note");
	}

	getItems(): TFile[] {
		return this.getFiles();
	}

	getItemText(item: TFile): string {
		return item.path;
	}

	onChooseItem(item: TFile): void {
		this.onChoose(item);
	}

	renderSuggestion(match: FuzzyMatch<TFile>, el: HTMLElement): void {
		super.renderSuggestion(match, el);
		el.createEl("small", { text: match.item.parent?.path ?? "/" });
	}
}

export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
	private readonly getFolders: () => TFolder[];
	private readonly onChoose: (folder: TFolder) => void;

	constructor(app: App, getFolders: () => TFolder[], onChoose: (folder: TFolder) => void) {
		super(app);
		this.getFolders = getFolders;
		this.onChoose = onChoose;
		this.setPlaceholder("Choose a folder");
	}

	getItems(): TFolder[] {
		return this.getFolders();
	}

	getItemText(item: TFolder): string {
		return item.path || "/";
	}

	onChooseItem(item: TFolder): void {
		this.onChoose(item);
	}
}
