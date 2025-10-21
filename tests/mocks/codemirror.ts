/**
 * Minimal CodeMirror 6 mocks for testing editor integration
 *
 * Strategy: Mock just enough to test business logic, not widget rendering
 */

import { vi } from 'vitest';

/**
 * Mock EditorView with minimal state
 */
export class MockEditorView {
	state: any;

	constructor(state?: any) {
		this.state = state || new MockEditorState('');
	}

	dispatch() {
		// Stub
	}
}

/**
 * Mock EditorState with document text
 */
export class MockEditorState {
	doc: MockText;

	constructor(text: string) {
		this.doc = new MockText(text);
	}

	field() {
		return null;
	}

	sliceDoc(from?: number, to?: number): string {
		if (from === undefined) return this.doc.toString();
		if (to === undefined) to = this.doc.length;
		return this.doc.toString().slice(from, to);
	}
}

/**
 * Mock Text (document content)
 */
export class MockText {
	private content: string;

	constructor(text: string) {
		this.content = text;
	}

	get length(): number {
		return this.content.length;
	}

	toString(): string {
		return this.content;
	}

	slice(from: number, to?: number): MockText {
		return new MockText(this.content.slice(from, to));
	}

	line(n: number) {
		const lines = this.content.split('\n');
		const lineText = lines[n - 1] || '';
		const offset = lines.slice(0, n - 1).reduce((acc, line) => acc + line.length + 1, 0);

		return {
			from: offset,
			to: offset + lineText.length,
			text: lineText,
		};
	}
}

/**
 * Mock Decoration (stub)
 */
export class MockDecoration {
	static widget(config: any) {
		return new MockDecoration('widget', config);
	}

	static replace(config: any) {
		return new MockDecoration('replace', config);
	}

	static mark(config: any) {
		return new MockDecoration('mark', config);
	}

	constructor(public type: string, public config: any) {}
}

/**
 * Mock RangeSetBuilder (stub)
 */
export class MockRangeSetBuilder {
	decorations: Array<{ from: number; to: number; decoration: MockDecoration }> = [];

	add(from: number, to: number, decoration: MockDecoration) {
		this.decorations.push({ from, to, decoration });
	}

	finish() {
		return this.decorations;
	}
}

/**
 * Mock ViewPlugin
 */
export const MockViewPlugin = {
	fromClass: vi.fn((cls: any) => cls),
	define: vi.fn((fn: any) => fn),
};

/**
 * Mock StateEffect
 */
export const MockStateEffect = {
	define: vi.fn(() => ({
		of: vi.fn((value: any) => ({ value })),
	})),
};

/**
 * Create a mock editor state with specific text
 */
export function createMockState(text: string): MockEditorState {
	return new MockEditorState(text);
}

/**
 * Create a mock editor view with specific text
 */
export function createMockView(text: string): MockEditorView {
	return new MockEditorView(createMockState(text));
}
