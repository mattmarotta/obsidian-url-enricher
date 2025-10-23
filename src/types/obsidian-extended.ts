import type { EditorView } from "@codemirror/view";

/**
 * Extended types for Obsidian internals that aren't in the official API
 */

/**
 * Extended Editor interface with internal CodeMirror view
 */
export interface EditorWithCM {
	cm?: EditorView;
}

/**
 * Extended MarkdownView interface with internal editor property
 */
export interface MarkdownViewWithEditor {
	editor?: EditorWithCM;
}
