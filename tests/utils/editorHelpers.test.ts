import { describe, it, expect, vi } from 'vitest';
import { getPrimarySelection, normalizeRange, comparePositions, isRangeMatching } from '../../src/utils/editorHelpers';
import type { Editor, EditorPosition } from 'obsidian';

describe('Editor Helpers', () => {
	describe('comparePositions', () => {
		it('should return 0 for identical positions', () => {
			const pos: EditorPosition = { line: 5, ch: 10 };
			expect(comparePositions(pos, pos)).toBe(0);
		});

		it('should return negative when first position is before second', () => {
			const a: EditorPosition = { line: 5, ch: 10 };
			const b: EditorPosition = { line: 5, ch: 15 };
			expect(comparePositions(a, b)).toBeLessThan(0);
		});

		it('should return positive when first position is after second', () => {
			const a: EditorPosition = { line: 5, ch: 15 };
			const b: EditorPosition = { line: 5, ch: 10 };
			expect(comparePositions(a, b)).toBeGreaterThan(0);
		});

		it('should compare by line first', () => {
			const a: EditorPosition = { line: 4, ch: 100 };
			const b: EditorPosition = { line: 5, ch: 0 };
			expect(comparePositions(a, b)).toBeLessThan(0);
		});

		it('should compare by character when lines are equal', () => {
			const a: EditorPosition = { line: 5, ch: 10 };
			const b: EditorPosition = { line: 5, ch: 20 };
			expect(comparePositions(a, b)).toBe(-10);
		});
	});

	describe('normalizeRange', () => {
		it('should keep range in order when start is before end', () => {
			const start: EditorPosition = { line: 1, ch: 5 };
			const end: EditorPosition = { line: 1, ch: 10 };

			const result = normalizeRange(start, end);

			expect(result.start).toEqual(start);
			expect(result.end).toEqual(end);
		});

		it('should swap positions when start is after end', () => {
			const start: EditorPosition = { line: 1, ch: 10 };
			const end: EditorPosition = { line: 1, ch: 5 };

			const result = normalizeRange(start, end);

			expect(result.start).toEqual(end);
			expect(result.end).toEqual(start);
		});

		it('should handle same position', () => {
			const pos: EditorPosition = { line: 1, ch: 5 };

			const result = normalizeRange(pos, pos);

			expect(result.start).toEqual(pos);
			expect(result.end).toEqual(pos);
		});

		it('should normalize across lines', () => {
			const a: EditorPosition = { line: 3, ch: 5 };
			const b: EditorPosition = { line: 1, ch: 10 };

			const result = normalizeRange(a, b);

			expect(result.start).toEqual(b);
			expect(result.end).toEqual(a);
		});
	});

	describe('getPrimarySelection', () => {
		it('should return cursor position when no selection', () => {
			const cursor: EditorPosition = { line: 5, ch: 10 };
			const mockEditor = {
				listSelections: vi.fn(() => []),
				getCursor: vi.fn(() => cursor),
			} as unknown as Editor;

			const result = getPrimarySelection(mockEditor);

			expect(result.start).toEqual(cursor);
			expect(result.end).toEqual(cursor);
			expect(mockEditor.getCursor).toHaveBeenCalled();
		});

		it('should return first selection when selections exist', () => {
			const anchor: EditorPosition = { line: 1, ch: 5 };
			const head: EditorPosition = { line: 1, ch: 10 };
			const mockEditor = {
				listSelections: vi.fn(() => [
					{ anchor, head },
					{ anchor: { line: 2, ch: 0 }, head: { line: 2, ch: 5 } },
				]),
				getCursor: vi.fn(),
			} as unknown as Editor;

			const result = getPrimarySelection(mockEditor);

			expect(result.start).toEqual(anchor);
			expect(result.end).toEqual(head);
			expect(mockEditor.getCursor).not.toHaveBeenCalled();
		});

		it('should normalize selection range', () => {
			const anchor: EditorPosition = { line: 1, ch: 10 };
			const head: EditorPosition = { line: 1, ch: 5 };
			const mockEditor = {
				listSelections: vi.fn(() => [{ anchor, head }]),
				getCursor: vi.fn(),
			} as unknown as Editor;

			const result = getPrimarySelection(mockEditor);

			expect(result.start).toEqual(head);
			expect(result.end).toEqual(anchor);
		});
	});

	describe('isRangeMatching', () => {
		it('should return true when range matches expected text', () => {
			const start: EditorPosition = { line: 0, ch: 5 };
			const end: EditorPosition = { line: 0, ch: 10 };
			const mockEditor = {
				getRange: vi.fn((s, e) => {
					if (s === start && e === end) return 'hello';
					return '';
				}),
			} as unknown as Editor;

			const result = isRangeMatching(mockEditor, { start, end }, 'hello');

			expect(result).toBe(true);
			expect(mockEditor.getRange).toHaveBeenCalledWith(start, end);
		});

		it('should return false when range does not match', () => {
			const start: EditorPosition = { line: 0, ch: 5 };
			const end: EditorPosition = { line: 0, ch: 10 };
			const mockEditor = {
				getRange: vi.fn(() => 'hello'),
			} as unknown as Editor;

			const result = isRangeMatching(mockEditor, { start, end }, 'world');

			expect(result).toBe(false);
		});

		it('should handle empty ranges', () => {
			const pos: EditorPosition = { line: 0, ch: 5 };
			const mockEditor = {
				getRange: vi.fn(() => ''),
			} as unknown as Editor;

			const result = isRangeMatching(mockEditor, { start: pos, end: pos }, '');

			expect(result).toBe(true);
		});
	});
});
