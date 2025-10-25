import type { PreviewStyle, PreviewColorMode } from "../settings";

/**
 * Page-level configuration that can override global settings via frontmatter
 */
export interface PageConfig {
	previewStyle?: PreviewStyle;
	maxCardLength?: number;
	maxInlineLength?: number;
	showFavicon?: boolean;
	includeDescription?: boolean;
	previewColorMode?: PreviewColorMode;
	customPreviewColor?: string;
}

/**
 * Parse frontmatter from the document to extract page-level preview configuration
 * Frontmatter must start on line 1 with --- and end with ---
 */
export function parsePageConfig(text: string): PageConfig {
	const config: PageConfig = {};

	// Check if document starts with frontmatter
	if (!text.startsWith('---')) {
		return config;
	}

	// Find the closing ---
	const lines = text.split('\n');
	let endIndex = -1;
	for (let i = 1; i < lines.length; i++) {
		if (lines[i].trim() === '---') {
			endIndex = i;
			break;
		}
	}

	if (endIndex === -1) {
		return config;
	}

	// Parse frontmatter lines
	const frontmatter = lines.slice(1, endIndex);

	// Debug: Log frontmatter parsing
	console.log('[URL Enricher] Parsing frontmatter:', frontmatter);

	for (const line of frontmatter) {
		// Preview style
		const styleMatch = line.match(/^preview-style:\s*(.+)$/i);
		if (styleMatch) {
			const value = styleMatch[1].trim().toLowerCase();
			if (value === 'inline' || value === 'card') {
				config.previewStyle = value;
			}
		}

		// Max card length
		const maxCardMatch = line.match(/^max-card-length:\s*(\d+)$/i);
		if (maxCardMatch) {
			const value = parseInt(maxCardMatch[1], 10);
			if (value >= 1 && value <= 5000) {
				config.maxCardLength = value;
			}
		}

		// Max inline length
		const maxInlineMatch = line.match(/^max-inline-length:\s*(\d+)$/i);
		if (maxInlineMatch) {
			const value = parseInt(maxInlineMatch[1], 10);
			if (value >= 1 && value <= 5000) {
				config.maxInlineLength = value;
			}
		}

		// Show favicon
		const faviconMatch = line.match(/^show-favicon:\s*(.+)$/i);
		if (faviconMatch) {
			const value = faviconMatch[1].trim().toLowerCase();
			if (value === 'true' || value === 'false') {
				config.showFavicon = value === 'true';
			}
		}

		// Include description
		const descMatch = line.match(/^include-description:\s*(.+)$/i);
		if (descMatch) {
			const value = descMatch[1].trim().toLowerCase();
			if (value === 'true' || value === 'false') {
				config.includeDescription = value === 'true';
			}
		}

		// Preview color mode
		const colorModeMatch = line.match(/^preview-color-mode:\s*(.+)$/i);
		if (colorModeMatch) {
			const value = colorModeMatch[1].trim().toLowerCase();
			if (value === 'none' || value === 'grey' || value === 'custom') {
				config.previewColorMode = value;
			}
		}

		// Custom preview color
		const customColorMatch = line.match(/^custom-preview-color:\s*(.+)$/i);
		if (customColorMatch) {
			const value = customColorMatch[1].trim();
			// Basic hex color validation
			if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
				config.customPreviewColor = value;
			}
		}
	}

	// Debug: Log parsed config
	console.log('[URL Enricher] Parsed config:', config);

	return config;
}

/**
 * Check if document has any frontmatter properties defined
 * @param text - Document text to check for frontmatter
 * @returns true if page has frontmatter with at least one property, false otherwise
 */
export function hasFrontmatter(text: string): boolean {
	const config = parsePageConfig(text);
	return Object.keys(config).length > 0;
}
