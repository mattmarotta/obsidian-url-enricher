import type { Editor, EditorPosition } from "obsidian";

export interface EditorTextRange {
	start: EditorPosition;
	end: EditorPosition;
}

export function getPrimarySelection(editor: Editor): EditorTextRange {
	const selections = editor.listSelections();
	if (!selections.length) {
		const cursor = editor.getCursor();
		return { start: cursor, end: cursor };
	}

	const selection = selections[0];
	return normalizeRange(selection.anchor, selection.head);
}

export function normalizeRange(a: EditorPosition, b: EditorPosition): EditorTextRange {
	if (comparePositions(a, b) <= 0) {
		return { start: a, end: b };
	}
	return { start: b, end: a };
}

export function comparePositions(a: EditorPosition, b: EditorPosition): number {
	if (a.line !== b.line) {
		return a.line - b.line;
	}
	return a.ch - b.ch;
}

export function isRangeMatching(editor: Editor, range: EditorTextRange, expected: string): boolean {
	return editor.getRange(range.start, range.end) === expected;
}
