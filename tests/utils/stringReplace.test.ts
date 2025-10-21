import { describe, it, expect } from 'vitest';
import { applyReplacements } from '../../src/utils/stringReplace';
import type { TextReplacement } from '../../src/utils/stringReplace';

describe('String Replace Utilities', () => {
	describe('applyReplacements', () => {
		it('should return original string when no replacements', () => {
			const source = 'Hello world';
			const result = applyReplacements(source, []);

			expect(result).toBe('Hello world');
		});

		it('should apply single replacement', () => {
			const source = 'Hello world';
			const replacements: TextReplacement[] = [
				{ start: 6, end: 11, value: 'universe' },
			];

			const result = applyReplacements(source, replacements);

			expect(result).toBe('Hello universe');
		});

		it('should apply multiple non-overlapping replacements', () => {
			const source = 'The quick brown fox';
			const replacements: TextReplacement[] = [
				{ start: 4, end: 9, value: 'slow' },
				{ start: 10, end: 15, value: 'red' },
			];

			const result = applyReplacements(source, replacements);

			expect(result).toBe('The slow red fox');
		});

		it('should apply replacements in reverse order (end to start)', () => {
			const source = 'abc def ghi';
			const replacements: TextReplacement[] = [
				{ start: 0, end: 3, value: 'AAA' }, // First in source, but applied last
				{ start: 8, end: 11, value: 'III' }, // Last in source, but applied first
			];

			const result = applyReplacements(source, replacements);

			expect(result).toBe('AAA def III');
		});

		it('should handle replacement with empty string (deletion)', () => {
			const source = 'Hello, world!';
			const replacements: TextReplacement[] = [
				{ start: 5, end: 6, value: '' },
			];

			const result = applyReplacements(source, replacements);

			expect(result).toBe('Hello world!');
		});

		it('should handle replacement with longer text', () => {
			const source = 'Hi';
			const replacements: TextReplacement[] = [
				{ start: 0, end: 2, value: 'Hello, world!' },
			];

			const result = applyReplacements(source, replacements);

			expect(result).toBe('Hello, world!');
		});

		it('should handle insertion (zero-length range)', () => {
			const source = 'Hello world';
			const replacements: TextReplacement[] = [
				{ start: 5, end: 5, value: ' beautiful' },
			];

			const result = applyReplacements(source, replacements);

			expect(result).toBe('Hello beautiful world');
		});

		it('should handle replacement at start of string', () => {
			const source = 'Hello world';
			const replacements: TextReplacement[] = [
				{ start: 0, end: 5, value: 'Goodbye' },
			];

			const result = applyReplacements(source, replacements);

			expect(result).toBe('Goodbye world');
		});

		it('should handle replacement at end of string', () => {
			const source = 'Hello world';
			const replacements: TextReplacement[] = [
				{ start: 6, end: 11, value: 'everyone' },
			];

			const result = applyReplacements(source, replacements);

			expect(result).toBe('Hello everyone');
		});

		it('should handle replacing entire string', () => {
			const source = 'Hello';
			const replacements: TextReplacement[] = [
				{ start: 0, end: 5, value: 'Goodbye' },
			];

			const result = applyReplacements(source, replacements);

			expect(result).toBe('Goodbye');
		});

		it('should handle multiple replacements without sorting', () => {
			const source = '0123456789';
			const replacements: TextReplacement[] = [
				{ start: 7, end: 8, value: 'X' }, // Later position
				{ start: 2, end: 3, value: 'Y' }, // Earlier position
				{ start: 5, end: 6, value: 'Z' }, // Middle position
			];

			const result = applyReplacements(source, replacements);

			expect(result).toBe('01Y34Z6X89');
		});

		it('should handle consecutive replacements', () => {
			const source = 'abcdef';
			const replacements: TextReplacement[] = [
				{ start: 2, end: 3, value: 'C' },
				{ start: 3, end: 4, value: 'D' },
			];

			const result = applyReplacements(source, replacements);

			expect(result).toBe('abCDef');
		});

		it('should not mutate original replacements array', () => {
			const source = 'abc def';
			const replacements: TextReplacement[] = [
				{ start: 0, end: 3, value: 'AAA' },
				{ start: 4, end: 7, value: 'BBB' },
			];
			const originalOrder = [...replacements];

			applyReplacements(source, replacements);

			expect(replacements).toEqual(originalOrder);
		});

		it('should handle empty source string', () => {
			const source = '';
			const replacements: TextReplacement[] = [
				{ start: 0, end: 0, value: 'Hello' },
			];

			const result = applyReplacements(source, replacements);

			expect(result).toBe('Hello');
		});

		it('should handle many replacements', () => {
			const source = '0 1 2 3 4 5 6 7 8 9';
			const replacements: TextReplacement[] = [
				{ start: 0, end: 1, value: 'A' },
				{ start: 2, end: 3, value: 'B' },
				{ start: 4, end: 5, value: 'C' },
				{ start: 6, end: 7, value: 'D' },
				{ start: 8, end: 9, value: 'E' },
			];

			const result = applyReplacements(source, replacements);

			expect(result).toBe('A B C D E 5 6 7 8 9');
		});

		it('should handle special characters in replacement text', () => {
			const source = 'Hello world';
			const replacements: TextReplacement[] = [
				{ start: 6, end: 11, value: '<world & "universe">' },
			];

			const result = applyReplacements(source, replacements);

			expect(result).toBe('Hello <world & "universe">');
		});

		it('should handle unicode characters', () => {
			const source = 'Hello 世界';
			const replacements: TextReplacement[] = [
				{ start: 6, end: 8, value: '🌍' },
			];

			const result = applyReplacements(source, replacements);

			expect(result).toBe('Hello 🌍');
		});
	});
});
