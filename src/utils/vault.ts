import { TAbstractFile, TFile, TFolder, Vault } from "obsidian";

export function collectMarkdownFiles(entry: TAbstractFile): TFile[] {
	if (entry instanceof TFile) {
		return isMarkdown(entry) ? [entry] : [];
	}

	if (entry instanceof TFolder) {
		const results: TFile[] = [];
		for (const child of entry.children) {
			results.push(...collectMarkdownFiles(child));
		}
		return results;
	}

	return [];
}

export function listAllFolders(vault: Vault): TFolder[] {
	const root = vault.getRoot();
	const folders: TFolder[] = [];
	collectFolders(root, folders);
	return folders;
}

function collectFolders(folder: TFolder, output: TFolder[]): void {
	output.push(folder);
	for (const child of folder.children) {
		if (child instanceof TFolder) {
			collectFolders(child, output);
		}
	}
}

function isMarkdown(file: TFile): boolean {
	return file.extension.toLowerCase() === "md";
}
