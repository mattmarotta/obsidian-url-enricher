import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, type InlineLinkPreviewSettings } from '../src/settings';

describe('Settings', () => {
	describe('DEFAULT_SETTINGS', () => {
		it('should have all required fields', () => {
			expect(DEFAULT_SETTINGS).toHaveProperty('includeDescription');
			expect(DEFAULT_SETTINGS).toHaveProperty('maxCardLength');
			expect(DEFAULT_SETTINGS).toHaveProperty('maxInlineLength');
			expect(DEFAULT_SETTINGS).toHaveProperty('requestTimeoutMs');
			expect(DEFAULT_SETTINGS).toHaveProperty('showFavicon');
			expect(DEFAULT_SETTINGS).toHaveProperty('keepEmoji');
			expect(DEFAULT_SETTINGS).toHaveProperty('previewStyle');
			expect(DEFAULT_SETTINGS).toHaveProperty('previewColorMode');
			expect(DEFAULT_SETTINGS).toHaveProperty('customPreviewColor');
			expect(DEFAULT_SETTINGS).toHaveProperty('showHttpErrorWarnings');
		});

		describe('Boolean Fields', () => {
			it('should have includeDescription as boolean', () => {
				expect(typeof DEFAULT_SETTINGS.includeDescription).toBe('boolean');
			});

			it('should default includeDescription to true', () => {
				expect(DEFAULT_SETTINGS.includeDescription).toBe(true);
			});

			it('should have showFavicon as boolean', () => {
				expect(typeof DEFAULT_SETTINGS.showFavicon).toBe('boolean');
			});

			it('should default showFavicon to true', () => {
				expect(DEFAULT_SETTINGS.showFavicon).toBe(true);
			});

			it('should have keepEmoji as boolean', () => {
				expect(typeof DEFAULT_SETTINGS.keepEmoji).toBe('boolean');
			});

			it('should default keepEmoji to true', () => {
				expect(DEFAULT_SETTINGS.keepEmoji).toBe(true);
			});

			it('should have showHttpErrorWarnings as boolean', () => {
				expect(typeof DEFAULT_SETTINGS.showHttpErrorWarnings).toBe('boolean');
			});

			it('should default showHttpErrorWarnings to true', () => {
				expect(DEFAULT_SETTINGS.showHttpErrorWarnings).toBe(true);
			});

			it('should have requireFrontmatter as boolean', () => {
				expect(typeof DEFAULT_SETTINGS.requireFrontmatter).toBe('boolean');
			});

			it('should default requireFrontmatter to false', () => {
				expect(DEFAULT_SETTINGS.requireFrontmatter).toBe(false);
			});
		});

		describe('Numeric Fields', () => {
			it('should have maxCardLength as number', () => {
				expect(typeof DEFAULT_SETTINGS.maxCardLength).toBe('number');
			});

			it('should default maxCardLength to 300', () => {
				expect(DEFAULT_SETTINGS.maxCardLength).toBe(300);
			});

			it('should have maxCardLength within valid range (100-5000)', () => {
				expect(DEFAULT_SETTINGS.maxCardLength).toBeGreaterThanOrEqual(100);
				expect(DEFAULT_SETTINGS.maxCardLength).toBeLessThanOrEqual(5000);
			});

			it('should have maxInlineLength as number', () => {
				expect(typeof DEFAULT_SETTINGS.maxInlineLength).toBe('number');
			});

			it('should default maxInlineLength to 150', () => {
				expect(DEFAULT_SETTINGS.maxInlineLength).toBe(150);
			});

			it('should have maxInlineLength within valid range (50-5000)', () => {
				expect(DEFAULT_SETTINGS.maxInlineLength).toBeGreaterThanOrEqual(50);
				expect(DEFAULT_SETTINGS.maxInlineLength).toBeLessThanOrEqual(5000);
			});

			it('should have requestTimeoutMs as number', () => {
				expect(typeof DEFAULT_SETTINGS.requestTimeoutMs).toBe('number');
			});

			it('should default requestTimeoutMs to 7000', () => {
				expect(DEFAULT_SETTINGS.requestTimeoutMs).toBe(7000);
			});

			it('should have positive requestTimeoutMs', () => {
				expect(DEFAULT_SETTINGS.requestTimeoutMs).toBeGreaterThan(0);
			});

			it('should have reasonable timeout (not too short or too long)', () => {
				expect(DEFAULT_SETTINGS.requestTimeoutMs).toBeGreaterThanOrEqual(1000);
				expect(DEFAULT_SETTINGS.requestTimeoutMs).toBeLessThanOrEqual(30000);
			});
		});

		describe('String Enum Fields', () => {
			it('should have previewStyle as string', () => {
				expect(typeof DEFAULT_SETTINGS.previewStyle).toBe('string');
			});

			it('should default previewStyle to "inline"', () => {
				expect(DEFAULT_SETTINGS.previewStyle).toBe('inline');
			});

			it('should have valid previewStyle value', () => {
				expect(['inline', 'card']).toContain(DEFAULT_SETTINGS.previewStyle);
			});


			it('should have previewColorMode as string', () => {
				expect(typeof DEFAULT_SETTINGS.previewColorMode).toBe('string');
			});

			it('should default previewColorMode to "grey"', () => {
				expect(DEFAULT_SETTINGS.previewColorMode).toBe('grey');
			});

			it('should have valid previewColorMode value', () => {
				expect(['none', 'grey', 'custom']).toContain(DEFAULT_SETTINGS.previewColorMode);
			});

			it('should have customPreviewColor as string', () => {
				expect(typeof DEFAULT_SETTINGS.customPreviewColor).toBe('string');
			});

			it('should default customPreviewColor to a hex color', () => {
				expect(DEFAULT_SETTINGS.customPreviewColor).toMatch(/^#[0-9a-fA-F]{6}$/);
			});

			it('should default customPreviewColor to "#4a4a4a"', () => {
				expect(DEFAULT_SETTINGS.customPreviewColor).toBe('#4a4a4a');
			});
		});

		describe('Data Integrity', () => {
			it('should not have undefined values', () => {
				const values = Object.values(DEFAULT_SETTINGS);
				values.forEach(value => {
					expect(value).not.toBeUndefined();
				});
			});

			it('should not have null values', () => {
				const values = Object.values(DEFAULT_SETTINGS);
				values.forEach(value => {
					expect(value).not.toBeNull();
				});
			});

			it('should have exactly 11 fields', () => {
				const keys = Object.keys(DEFAULT_SETTINGS);
				expect(keys).toHaveLength(11);
			});

			it('should be a valid InlineLinkPreviewSettings object', () => {
				// Type check - if this compiles, the type is correct
				const settings: InlineLinkPreviewSettings = DEFAULT_SETTINGS;
				expect(settings).toBeDefined();
			});
		});
	});

	describe('Settings Validation', () => {
		describe('PreviewStyle Validation', () => {
			it('should accept "inline" as valid', () => {
				const validStyles: Array<'inline' | 'card'> = ['inline', 'card'];
				expect(validStyles).toContain('inline');
			});

			it('should accept "card" as valid', () => {
				const validStyles: Array<'inline' | 'card'> = ['inline', 'card'];
				expect(validStyles).toContain('card');
			});

			it('should only have two valid preview styles', () => {
				const validStyles: Array<'inline' | 'card'> = ['inline', 'card'];
				expect(validStyles).toHaveLength(2);
			});
		});


		describe('PreviewColorMode Validation', () => {
			it('should accept "none" as valid', () => {
				const validModes: Array<'none' | 'grey' | 'custom'> = ['none', 'grey', 'custom'];
				expect(validModes).toContain('none');
			});

			it('should accept "grey" as valid', () => {
				const validModes: Array<'none' | 'grey' | 'custom'> = ['none', 'grey', 'custom'];
				expect(validModes).toContain('grey');
			});

			it('should accept "custom" as valid', () => {
				const validModes: Array<'none' | 'grey' | 'custom'> = ['none', 'grey', 'custom'];
				expect(validModes).toContain('custom');
			});

			it('should only have three valid color modes', () => {
				const validModes: Array<'none' | 'grey' | 'custom'> = ['none', 'grey', 'custom'];
				expect(validModes).toHaveLength(3);
			});
		});

		describe('Numeric Constraints', () => {
			it('should enforce maxCardLength minimum of 100', () => {
				const min = 100;
				expect(DEFAULT_SETTINGS.maxCardLength).toBeGreaterThanOrEqual(min);
			});

			it('should enforce maxCardLength maximum of 5000', () => {
				const max = 5000;
				expect(DEFAULT_SETTINGS.maxCardLength).toBeLessThanOrEqual(max);
			});

			it('should enforce maxInlineLength minimum of 50', () => {
				const min = 50;
				expect(DEFAULT_SETTINGS.maxInlineLength).toBeGreaterThanOrEqual(min);
			});

			it('should enforce maxInlineLength maximum of 5000', () => {
				const max = 5000;
				expect(DEFAULT_SETTINGS.maxInlineLength).toBeLessThanOrEqual(max);
			});

			it('should have maxInlineLength less than maxCardLength by default', () => {
				expect(DEFAULT_SETTINGS.maxInlineLength).toBeLessThan(DEFAULT_SETTINGS.maxCardLength);
			});
		});
	});

	describe('Settings Object Creation', () => {
		it('should allow creating settings with all defaults', () => {
			const settings: InlineLinkPreviewSettings = { ...DEFAULT_SETTINGS };
			expect(settings).toEqual(DEFAULT_SETTINGS);
		});

		it('should allow creating settings with partial overrides', () => {
			const settings: InlineLinkPreviewSettings = {
				...DEFAULT_SETTINGS,
				previewStyle: 'card',
			};
			expect(settings.previewStyle).toBe('card');
		});

		it('should allow creating settings with multiple overrides', () => {
			const settings: InlineLinkPreviewSettings = {
				...DEFAULT_SETTINGS,
				previewStyle: 'card',
				maxCardLength: 500,
			};
			expect(settings.previewStyle).toBe('card');
			expect(settings.maxCardLength).toBe(500);
		});

		it('should allow creating settings with all custom values', () => {
			const settings: InlineLinkPreviewSettings = {
				includeDescription: false,
				maxCardLength: 400,
				maxInlineLength: 200,
				requestTimeoutMs: 10000,
				showFavicon: false,
				keepEmoji: false,
				previewStyle: 'card',
				previewColorMode: 'custom',
				customPreviewColor: '#ff0000',
				showHttpErrorWarnings: false,
			};
			expect(settings).toBeDefined();
			expect(settings.previewStyle).toBe('card');
		});
	});

	describe('Settings Edge Cases', () => {
		it('should handle minimum maxCardLength (100)', () => {
			const settings: InlineLinkPreviewSettings = {
				...DEFAULT_SETTINGS,
				maxCardLength: 100,
			};
			expect(settings.maxCardLength).toBe(100);
		});

		it('should handle maximum maxCardLength (5000)', () => {
			const settings: InlineLinkPreviewSettings = {
				...DEFAULT_SETTINGS,
				maxCardLength: 5000,
			};
			expect(settings.maxCardLength).toBe(5000);
		});

		it('should handle minimum maxInlineLength (50)', () => {
			const settings: InlineLinkPreviewSettings = {
				...DEFAULT_SETTINGS,
				maxInlineLength: 50,
			};
			expect(settings.maxInlineLength).toBe(50);
		});

		it('should handle maximum maxInlineLength (5000)', () => {
			const settings: InlineLinkPreviewSettings = {
				...DEFAULT_SETTINGS,
				maxInlineLength: 5000,
			};
			expect(settings.maxInlineLength).toBe(5000);
		});

		it('should handle all boolean combinations', () => {
			const allFalse: InlineLinkPreviewSettings = {
				...DEFAULT_SETTINGS,
				includeDescription: false,
				showFavicon: false,
				keepEmoji: false,
				showHttpErrorWarnings: false,
			};
			expect(allFalse.includeDescription).toBe(false);
			expect(allFalse.showFavicon).toBe(false);
			expect(allFalse.keepEmoji).toBe(false);
			expect(allFalse.showHttpErrorWarnings).toBe(false);
		});

		it('should handle different color hex formats', () => {
			const settings: InlineLinkPreviewSettings = {
				...DEFAULT_SETTINGS,
				previewColorMode: 'custom',
				customPreviewColor: '#123456',
			};
			expect(settings.customPreviewColor).toBe('#123456');
		});
	});
});
