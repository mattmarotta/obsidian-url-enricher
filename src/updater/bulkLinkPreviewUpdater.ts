import { App, TFile, TFolder } from "obsidian";
import type { LinkPreviewBuilder } from "../linkPreview/previewBuilder";
import { URL_IN_TEXT_REGEX } from "../utils/url";
import { applyReplacements, TextReplacement } from "../utils/stringReplace";
import { collectMarkdownFiles } from "../utils/vault";
import { findMarkdownLinkRange } from "../utils/markdown";

export interface BulkUpdateStats {
	filesProcessed: number;
	filesUpdated: number;
	linksConverted: number;
}

export class BulkLinkPreviewUpdater {
	private readonly app: App;
	private readonly builder: LinkPreviewBuilder;

	constructor(app: App, builder: LinkPreviewBuilder) {
		this.app = app;
		this.builder = builder;
	}

	async convertFile(file: TFile): Promise<number> {
		const original = await this.app.vault.read(file);
		const codeBlockRanges = findCodeBlockRanges(original);

		const replacements: TextReplacement[] = [];
		let match: RegExpExecArray | null;
		const seenInFile = new Map<string, string>();

		URL_IN_TEXT_REGEX.lastIndex = 0;
		// eslint-disable-next-line no-cond-assign
		while ((match = URL_IN_TEXT_REGEX.exec(original)) !== null) {
			const rawMatch = match[0];
			const start = match.index ?? 0;
			const { clean, trailing } = splitUrlMatch(rawMatch);
			if (!clean) {
				continue;
			}

			const checkEnd = start + clean.length;
			const replaceEnd = start + rawMatch.length;

			if (shouldSkipMatch(original, start, checkEnd, codeBlockRanges)) {
				continue;
			}

			const cached = seenInFile.get(clean) ?? (await this.builder.build(clean));
			seenInFile.set(clean, cached);

			if (cached === clean) {
				continue;
			}

			const markdownRange = findMarkdownLinkRange(original, start, checkEnd);
			if (markdownRange) {
				replacements.push({ start: markdownRange.start, end: markdownRange.end, value: cached });
			} else {
				replacements.push({ start, end: replaceEnd, value: cached + trailing });
			}
		}

		if (!replacements.length) {
			return 0;
		}

		const updated = applyReplacements(original, replacements);
		if (updated !== original) {
			await this.app.vault.modify(file, updated);
		}

		return replacements.length;
	}

	async convertFiles(files: TFile[]): Promise<BulkUpdateStats> {
		let linksConverted = 0;
		let filesUpdated = 0;

		for (const file of files) {
			const converted = await this.convertFile(file);
			if (converted > 0) {
				linksConverted += converted;
				filesUpdated += 1;
			}
		}

		return {
			filesProcessed: files.length,
			filesUpdated,
			linksConverted,
		};
	}

	async convertFolder(folder: TFolder): Promise<BulkUpdateStats> {
		const files = collectMarkdownFiles(folder);
		return this.convertFiles(files);
	}

	async convertVault(): Promise<BulkUpdateStats> {
		const files = this.app.vault.getMarkdownFiles();
		return this.convertFiles(files);
	}
}

function shouldSkipMatch(
	content: string,
	start: number,
	end: number,
	codeBlocks: Array<{ start: number; end: number }>,
): boolean {
	const preceding = start > 0 ? content[start - 1] : "";
	if (preceding === "(" || preceding === "<") {
		return true;
	}

	if (isWithinRanges(start, codeBlocks)) {
		return true;
	}

	if (isInsideInlineCode(content, start)) {
		return true;
	}

	const nextChar = end < content.length ? content[end] : "";
	if (nextChar === ")") {
		// Likely already part of a markdown link.
		return true;
	}

	return false;
}

function isWithinRanges(position: number, ranges: Array<{ start: number; end: number }>): boolean {
	return ranges.some((range) => range.start <= position && position < range.end);
}

function findCodeBlockRanges(content: string): Array<{ start: number; end: number }> {
	const ranges: Array<{ start: number; end: number }> = [];
	const lines = content.split("\n");
	let offset = 0;
	let fenceStart: number | null = null;

	for (const line of lines) {
		const trimmed = line.trimStart();
		if (trimmed.startsWith("```")) {
			if (fenceStart === null) {
				fenceStart = offset;
			} else {
				ranges.push({ start: fenceStart, end: offset + line.length });
				fenceStart = null;
			}
		}

		offset += line.length + 1; // +1 for the newline we split on
	}

	if (fenceStart !== null) {
		ranges.push({ start: fenceStart, end: content.length });
	}

	return ranges;
}

function isInsideInlineCode(content: string, position: number): boolean {
	const lineStart = content.lastIndexOf("\n", position - 1) + 1;
	const lineEnd = content.indexOf("\n", position);
	const sliceEnd = lineEnd === -1 ? content.length : lineEnd;
	const linePrefix = content.slice(lineStart, position);
	const backtickCount = (linePrefix.match(/`/g) ?? []).length;
	return backtickCount % 2 === 1;
}

function splitUrlMatch(match: string): { clean: string; trailing: string } {
	let clean = match;
	let trailing = "";

	while (clean.length > 0 && /[.,!?]/.test(clean[clean.length - 1])) {
		trailing = clean[clean.length - 1] + trailing;
		clean = clean.slice(0, -1);
	}

	return { clean, trailing };
}
