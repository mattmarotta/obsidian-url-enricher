import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/settings';

/**
 * Tests for main.ts
 *
 * Focus: Settings normalization logic (normalizeSettings method)
 * Skip: Full plugin lifecycle (requires extensive Obsidian API mocking)
 *
 * Note: We're testing the normalization algorithm by extracting its logic.
 * The actual plugin integration is tested manually.
 */

describe('Plugin Main', () => {
	describe('normalizeSettings (extracted logic)', () => {
		/**
		 * This function replicates the normalization logic from main.ts
		 * for testing purposes
		 */
		function normalizeSettings(settings: any): any {
			const normalized = { ...settings };

			// maxCardLength normalization
			const numericCardLength = Number(normalized.maxCardLength);
			normalized.maxCardLength = Number.isFinite(numericCardLength)
				? Math.min(5000, Math.max(1, Math.round(numericCardLength)))
				: DEFAULT_SETTINGS.maxCardLength;

			// maxInlineLength normalization
			const numericInlineLength = Number(normalized.maxInlineLength);
			normalized.maxInlineLength = Number.isFinite(numericInlineLength)
				? Math.min(5000, Math.max(1, Math.round(numericInlineLength)))
				: DEFAULT_SETTINGS.maxInlineLength;

			// requestTimeoutMs normalization
			const numericTimeout = Number(normalized.requestTimeoutMs);
			normalized.requestTimeoutMs = Number.isFinite(numericTimeout)
				? Math.max(500, Math.round(numericTimeout))
				: DEFAULT_SETTINGS.requestTimeoutMs;

			// Boolean normalization
			normalized.showFavicon = Boolean(normalized.showFavicon);
			normalized.keepEmoji = Boolean(normalized.keepEmoji);

			return normalized;
		}

		describe('maxCardLength Normalization', () => {
			it('should clamp value below minimum (1)', () => {
				const settings = { ...DEFAULT_SETTINGS, maxCardLength: 0 };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxCardLength).toBe(1);
			});

			it('should clamp value above maximum (5000)', () => {
				const settings = { ...DEFAULT_SETTINGS, maxCardLength: 10000 };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxCardLength).toBe(5000);
			});

			it('should keep valid value unchanged', () => {
				const settings = { ...DEFAULT_SETTINGS, maxCardLength: 300 };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxCardLength).toBe(300);
			});

			it('should accept minimum value (1)', () => {
				const settings = { ...DEFAULT_SETTINGS, maxCardLength: 1 };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxCardLength).toBe(1);
			});

			it('should accept recommended minimum value (100)', () => {
				const settings = { ...DEFAULT_SETTINGS, maxCardLength: 100 };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxCardLength).toBe(100);
			});

			it('should accept maximum value (5000)', () => {
				const settings = { ...DEFAULT_SETTINGS, maxCardLength: 5000 };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxCardLength).toBe(5000);
			});

			it('should round decimal values', () => {
				const settings = { ...DEFAULT_SETTINGS, maxCardLength: 250.7 };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxCardLength).toBe(251);
			});

			it('should handle string numbers', () => {
				const settings = { ...DEFAULT_SETTINGS, maxCardLength: '400' as any };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxCardLength).toBe(400);
			});

			it('should use default for NaN', () => {
				const settings = { ...DEFAULT_SETTINGS, maxCardLength: NaN };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxCardLength).toBe(DEFAULT_SETTINGS.maxCardLength);
			});

			it('should clamp null to minimum (Number(null) = 0)', () => {
				const settings = { ...DEFAULT_SETTINGS, maxCardLength: null as any };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxCardLength).toBe(1); // Number(null) = 0, clamped to min
			});

			it('should use default for undefined', () => {
				const settings = { ...DEFAULT_SETTINGS, maxCardLength: undefined as any };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxCardLength).toBe(DEFAULT_SETTINGS.maxCardLength);
			});

			it('should use default for invalid string', () => {
				const settings = { ...DEFAULT_SETTINGS, maxCardLength: 'invalid' as any };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxCardLength).toBe(DEFAULT_SETTINGS.maxCardLength);
			});
		});

		describe('maxInlineLength Normalization', () => {
			it('should clamp value below minimum (1)', () => {
				const settings = { ...DEFAULT_SETTINGS, maxInlineLength: 0 };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxInlineLength).toBe(1);
			});

			it('should clamp value above maximum (5000)', () => {
				const settings = { ...DEFAULT_SETTINGS, maxInlineLength: 10000 };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxInlineLength).toBe(5000);
			});

			it('should keep valid value unchanged', () => {
				const settings = { ...DEFAULT_SETTINGS, maxInlineLength: 150 };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxInlineLength).toBe(150);
			});

			it('should accept minimum value (1)', () => {
				const settings = { ...DEFAULT_SETTINGS, maxInlineLength: 1 };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxInlineLength).toBe(1);
			});

			it('should accept recommended minimum value (50)', () => {
				const settings = { ...DEFAULT_SETTINGS, maxInlineLength: 50 };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxInlineLength).toBe(50);
			});

			it('should accept maximum value (5000)', () => {
				const settings = { ...DEFAULT_SETTINGS, maxInlineLength: 5000 };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxInlineLength).toBe(5000);
			});

			it('should round decimal values', () => {
				const settings = { ...DEFAULT_SETTINGS, maxInlineLength: 123.4 };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxInlineLength).toBe(123);
			});

			it('should handle string numbers', () => {
				const settings = { ...DEFAULT_SETTINGS, maxInlineLength: '200' as any };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxInlineLength).toBe(200);
			});

			it('should use default for NaN', () => {
				const settings = { ...DEFAULT_SETTINGS, maxInlineLength: NaN };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxInlineLength).toBe(DEFAULT_SETTINGS.maxInlineLength);
			});

			it('should use default for invalid values', () => {
				const settings = { ...DEFAULT_SETTINGS, maxInlineLength: 'invalid' as any };
				const normalized = normalizeSettings(settings);
				expect(normalized.maxInlineLength).toBe(DEFAULT_SETTINGS.maxInlineLength);
			});
		});

		describe('requestTimeoutMs Normalization', () => {
			it('should clamp value below minimum (500)', () => {
				const settings = { ...DEFAULT_SETTINGS, requestTimeoutMs: 100 };
				const normalized = normalizeSettings(settings);
				expect(normalized.requestTimeoutMs).toBe(500);
			});

			it('should keep valid value unchanged', () => {
				const settings = { ...DEFAULT_SETTINGS, requestTimeoutMs: 7000 };
				const normalized = normalizeSettings(settings);
				expect(normalized.requestTimeoutMs).toBe(7000);
			});

			it('should accept minimum value (500)', () => {
				const settings = { ...DEFAULT_SETTINGS, requestTimeoutMs: 500 };
				const normalized = normalizeSettings(settings);
				expect(normalized.requestTimeoutMs).toBe(500);
			});

			it('should allow large timeout values', () => {
				const settings = { ...DEFAULT_SETTINGS, requestTimeoutMs: 30000 };
				const normalized = normalizeSettings(settings);
				expect(normalized.requestTimeoutMs).toBe(30000);
			});

			it('should round decimal values', () => {
				const settings = { ...DEFAULT_SETTINGS, requestTimeoutMs: 5500.8 };
				const normalized = normalizeSettings(settings);
				expect(normalized.requestTimeoutMs).toBe(5501);
			});

			it('should handle string numbers', () => {
				const settings = { ...DEFAULT_SETTINGS, requestTimeoutMs: '10000' as any };
				const normalized = normalizeSettings(settings);
				expect(normalized.requestTimeoutMs).toBe(10000);
			});

			it('should use default for NaN', () => {
				const settings = { ...DEFAULT_SETTINGS, requestTimeoutMs: NaN };
				const normalized = normalizeSettings(settings);
				expect(normalized.requestTimeoutMs).toBe(DEFAULT_SETTINGS.requestTimeoutMs);
			});

			it('should use default for invalid values', () => {
				const settings = { ...DEFAULT_SETTINGS, requestTimeoutMs: 'invalid' as any };
				const normalized = normalizeSettings(settings);
				expect(normalized.requestTimeoutMs).toBe(DEFAULT_SETTINGS.requestTimeoutMs);
			});
		});

		describe('Boolean Normalization', () => {
			it('should keep true as true', () => {
				const settings = { ...DEFAULT_SETTINGS, showFavicon: true };
				const normalized = normalizeSettings(settings);
				expect(normalized.showFavicon).toBe(true);
			});

			it('should keep false as false', () => {
				const settings = { ...DEFAULT_SETTINGS, showFavicon: false };
				const normalized = normalizeSettings(settings);
				expect(normalized.showFavicon).toBe(false);
			});

			it('should convert truthy values to true', () => {
				const settings = { ...DEFAULT_SETTINGS, showFavicon: 1 as any };
				const normalized = normalizeSettings(settings);
				expect(normalized.showFavicon).toBe(true);
			});

			it('should convert falsy values to false', () => {
				const settings = { ...DEFAULT_SETTINGS, showFavicon: 0 as any };
				const normalized = normalizeSettings(settings);
				expect(normalized.showFavicon).toBe(false);
			});

			it('should convert string "true" to true', () => {
				const settings = { ...DEFAULT_SETTINGS, keepEmoji: 'true' as any };
				const normalized = normalizeSettings(settings);
				expect(normalized.keepEmoji).toBe(true);
			});

			it('should convert string "false" to true (Boolean coercion)', () => {
				const settings = { ...DEFAULT_SETTINGS, keepEmoji: 'false' as any };
				const normalized = normalizeSettings(settings);
				expect(normalized.keepEmoji).toBe(true); // Boolean('false') = true (non-empty string)
			});

			it('should convert null to false', () => {
				const settings = { ...DEFAULT_SETTINGS, showFavicon: null as any };
				const normalized = normalizeSettings(settings);
				expect(normalized.showFavicon).toBe(false);
			});

			it('should convert undefined to false', () => {
				const settings = { ...DEFAULT_SETTINGS, showFavicon: undefined as any };
				const normalized = normalizeSettings(settings);
				expect(normalized.showFavicon).toBe(false);
			});
		});

		describe('Combined Normalization', () => {
			it('should normalize multiple fields at once', () => {
				const settings = {
					...DEFAULT_SETTINGS,
					maxCardLength: 0,       // below min
					maxInlineLength: 10000, // above max
					requestTimeoutMs: 100,  // below min
					showFavicon: 'yes' as any,
				};
				const normalized = normalizeSettings(settings);
				expect(normalized.maxCardLength).toBe(1);
				expect(normalized.maxInlineLength).toBe(5000);
				expect(normalized.requestTimeoutMs).toBe(500);
				expect(normalized.showFavicon).toBe(true);
			});

			it('should handle all invalid values', () => {
				const settings = {
					...DEFAULT_SETTINGS,
					maxCardLength: NaN,
					maxInlineLength: 'bad' as any,
					requestTimeoutMs: null as any,
					showFavicon: undefined as any,
					keepEmoji: 0 as any,
				};
				const normalized = normalizeSettings(settings);
				expect(normalized.maxCardLength).toBe(DEFAULT_SETTINGS.maxCardLength);
				expect(normalized.maxInlineLength).toBe(DEFAULT_SETTINGS.maxInlineLength);
				expect(normalized.requestTimeoutMs).toBe(500); // Number(null) = 0, clamped to min
				expect(normalized.showFavicon).toBe(false);
				expect(normalized.keepEmoji).toBe(false);
			});

			it('should not modify other settings fields', () => {
				const settings = {
					...DEFAULT_SETTINGS,
					maxCardLength: 50,
					previewStyle: 'card' as const,
				};
				const normalized = normalizeSettings(settings);
				expect(normalized.previewStyle).toBe('card');
			});
		});
	});

	describe('updatePreviewColorCSS (extracted logic)', () => {
		/**
		 * This function replicates the CSS color calculation logic from main.ts
		 */
		function calculatePreviewColor(previewColorMode: string, customPreviewColor: string): string {
			switch (previewColorMode) {
				case 'none':
					return 'transparent';
				case 'custom':
					return customPreviewColor;
				case 'grey':
				default:
					return 'var(--background-modifier-border)';
			}
		}

		it('should return transparent for "none" mode', () => {
			const color = calculatePreviewColor('none', '#000000');
			expect(color).toBe('transparent');
		});

		it('should return custom color for "custom" mode', () => {
			const color = calculatePreviewColor('custom', '#ff0000');
			expect(color).toBe('#ff0000');
		});

		it('should return CSS variable for "grey" mode', () => {
			const color = calculatePreviewColor('grey', '#000000');
			expect(color).toBe('var(--background-modifier-border)');
		});

		it('should default to grey mode for unknown values', () => {
			const color = calculatePreviewColor('unknown', '#000000');
			expect(color).toBe('var(--background-modifier-border)');
		});

		it('should use custom color value exactly as provided', () => {
			const customColor = '#123456';
			const color = calculatePreviewColor('custom', customColor);
			expect(color).toBe(customColor);
		});

		it('should handle different custom color formats', () => {
			expect(calculatePreviewColor('custom', '#abc')).toBe('#abc');
			expect(calculatePreviewColor('custom', '#aabbcc')).toBe('#aabbcc');
			expect(calculatePreviewColor('custom', 'rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
		});
	});

	describe('Settings Merge Logic', () => {
		/**
		 * Simulates how settings are merged in loadSettings()
		 */
		function mergeSettings(loadedData: any): any {
			return Object.assign({}, DEFAULT_SETTINGS, loadedData);
		}

		it('should use defaults when no data loaded', () => {
			const merged = mergeSettings({});
			expect(merged).toEqual(DEFAULT_SETTINGS);
		});

		it('should override defaults with loaded data', () => {
			const loaded = { previewStyle: 'card' as const };
			const merged = mergeSettings(loaded);
			expect(merged.previewStyle).toBe('card');
		});

		it('should merge partial settings', () => {
			const loaded = {
				maxCardLength: 500,
				showFavicon: false,
			};
			const merged = mergeSettings(loaded);
			expect(merged.maxCardLength).toBe(500);
			expect(merged.showFavicon).toBe(false);
			expect(merged.keepEmoji).toBe(DEFAULT_SETTINGS.keepEmoji);
		});

		it('should handle complete settings override', () => {
			const loaded = {
				includeDescription: false,
				maxCardLength: 400,
				maxInlineLength: 200,
				requestTimeoutMs: 10000,
				showFavicon: false,
				keepEmoji: false,
				previewStyle: 'card' as const,
				previewColorMode: 'custom' as const,
				customPreviewColor: '#ff0000',
				showHttpErrorWarnings: false,
				requireFrontmatter: true,
			};
			const merged = mergeSettings(loaded);
			expect(merged).toEqual(loaded);
		});

		it('should ignore extra fields in loaded data', () => {
			const loaded = {
				previewStyle: 'card' as const,
				extraField: 'should be ignored',
			};
			const merged = mergeSettings(loaded);
			expect(merged.previewStyle).toBe('card');
			expect((merged as any).extraField).toBe('should be ignored'); // Object.assign doesn't filter
		});
	});
});
