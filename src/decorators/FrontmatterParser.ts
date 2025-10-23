import type { PreviewStyle, DisplayMode, PreviewColorMode } from "../settings";

/**
 * Page-level configuration that can override global settings via frontmatter
 */
export interface PageConfig {
	previewStyle?: PreviewStyle;
	displayMode?: DisplayMode;
	maxCardLength?: number;
	maxBubbleLength?: number;
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
	console.log('[Inline Link Preview] Parsing frontmatter:', frontmatter);

	for (const line of frontmatter) {
		// Preview style
		const styleMatch = line.match(/^preview-style:\s*(.+)$/i);
		if (styleMatch) {
			const value = styleMatch[1].trim().toLowerCase();
			if (value === 'bubble' || value === 'card') {
				config.previewStyle = value;
			}
		}

		// Display mode
		const displayMatch = line.match(/^preview-display:\s*(.+)$/i);
		if (displayMatch) {
			const value = displayMatch[1].trim().toLowerCase();
			if (value === 'inline' || value === 'block') {
				config.displayMode = value;
			}
		}

		// Max card length
		const maxCardMatch = line.match(/^max-card-length:\s*(\d+)$/i);
		if (maxCardMatch) {
			const value = parseInt(maxCardMatch[1], 10);
			if (value >= 100 && value <= 5000) {
				config.maxCardLength = value;
			}
		}

		// Max bubble length
		const maxBubbleMatch = line.match(/^max-bubble-length:\s*(\d+)$/i);
		if (maxBubbleMatch) {
			const value = parseInt(maxBubbleMatch[1], 10);
			if (value >= 50 && value <= 5000) {
				config.maxBubbleLength = value;
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
	console.log('[Inline Link Preview] Parsed config:', config);

	return config;
}
