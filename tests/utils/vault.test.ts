import { describe, it, expect, vi } from 'vitest';
import { collectMarkdownFiles, listAllFolders } from '../../src/utils/vault';
import { TFile, TFolder, Vault } from '../mocks/obsidian';

describe('Vault Utilities', () => {
	describe('collectMarkdownFiles', () => {
		it('should return markdown file in array', () => {
			const file = new TFile('md');

			const result = collectMarkdownFiles(file);

			expect(result).toHaveLength(1);
			expect(result[0]).toBe(file);
		});

		it('should return empty array for non-markdown file', () => {
			const file = new TFile('txt');

			const result = collectMarkdownFiles(file);

			expect(result).toEqual([]);
		});

		it('should handle .MD extension (case insensitive)', () => {
			const file = new TFile('MD');

			const result = collectMarkdownFiles(file);

			expect(result).toHaveLength(1);
		});

		it('should collect markdown files from folder', () => {
			const mdFile1 = new TFile('md');
			const mdFile2 = new TFile('md');
			const txtFile = new TFile('txt');

			const folder = new TFolder([mdFile1, txtFile, mdFile2]);

			const result = collectMarkdownFiles(folder);

			expect(result).toHaveLength(2);
			expect(result).toContain(mdFile1);
			expect(result).toContain(mdFile2);
		});

		it('should recursively collect from nested folders', () => {
			const mdFile1 = new TFile('md');
			const mdFile2 = new TFile('md');
			const mdFile3 = new TFile('md');

			const nestedFolder = new TFolder([mdFile3]);
			const parentFolder = new TFolder([mdFile1, nestedFolder, mdFile2]);

			const result = collectMarkdownFiles(parentFolder);

			expect(result).toHaveLength(3);
			expect(result).toContain(mdFile1);
			expect(result).toContain(mdFile2);
			expect(result).toContain(mdFile3);
		});

		it('should handle empty folder', () => {
			const folder = new TFolder([]);

			const result = collectMarkdownFiles(folder);

			expect(result).toEqual([]);
		});

		it('should handle deeply nested structure', () => {
			const mdFile1 = new TFile('md');
			const mdFile2 = new TFile('md');

			const deepFolder = new TFolder([mdFile2]);
			const middleFolder = new TFolder([deepFolder]);
			const topFolder = new TFolder([mdFile1, middleFolder]);

			const result = collectMarkdownFiles(topFolder);

			expect(result).toHaveLength(2);
		});

		it('should return empty array for unknown entry type', () => {
			const unknownEntry = {} as any;

			const result = collectMarkdownFiles(unknownEntry);

			expect(result).toEqual([]);
		});
	});

	describe('listAllFolders', () => {
		it('should collect all folders including root', () => {
			const subFolder1 = new TFolder([]);
			const subFolder2 = new TFolder([]);
			const rootFolder = new TFolder([subFolder1, subFolder2]);

			const vault = {
				getRoot: vi.fn(() => rootFolder),
			} as unknown as Vault;

			const result = listAllFolders(vault);

			expect(result).toHaveLength(3);
			expect(result).toContain(rootFolder);
			expect(result).toContain(subFolder1);
			expect(result).toContain(subFolder2);
		});

		it('should collect nested folders', () => {
			const deepFolder = new TFolder([]);
			const middleFolder = new TFolder([deepFolder]);
			const rootFolder = new TFolder([middleFolder]);

			const vault = {
				getRoot: vi.fn(() => rootFolder),
			} as unknown as Vault;

			const result = listAllFolders(vault);

			expect(result).toHaveLength(3);
			expect(result[0]).toBe(rootFolder);
			expect(result[1]).toBe(middleFolder);
			expect(result[2]).toBe(deepFolder);
		});

		it('should handle vault with only root folder', () => {
			const rootFolder = new TFolder([]);

			const vault = {
				getRoot: vi.fn(() => rootFolder),
			} as unknown as Vault;

			const result = listAllFolders(vault);

			expect(result).toHaveLength(1);
			expect(result[0]).toBe(rootFolder);
		});

		it('should ignore files in folder children', () => {
			const file = new TFile('md');
			const subFolder = new TFolder([]);
			const rootFolder = new TFolder([file, subFolder]);

			const vault = {
				getRoot: vi.fn(() => rootFolder),
			} as unknown as Vault;

			const result = listAllFolders(vault);

			expect(result).toHaveLength(2);
			expect(result).toContain(rootFolder);
			expect(result).toContain(subFolder);
			expect(result).not.toContain(file as any);
		});

		it('should handle complex folder structure', () => {
			const folder1 = new TFolder([]);
			const folder2 = new TFolder([]);
			const folder3 = new TFolder([folder1]);
			const folder4 = new TFolder([]);
			const folder5 = new TFolder([folder3, folder4]);
			const rootFolder = new TFolder([folder2, folder5]);

			const vault = {
				getRoot: vi.fn(() => rootFolder),
			} as unknown as Vault;

			const result = listAllFolders(vault);

			// Root + 5 subfolders = 6 total
			expect(result).toHaveLength(6);
			expect(result).toContain(rootFolder);
			expect(result).toContain(folder1);
			expect(result).toContain(folder2);
			expect(result).toContain(folder3);
			expect(result).toContain(folder4);
			expect(result).toContain(folder5);
		});
	});
});
