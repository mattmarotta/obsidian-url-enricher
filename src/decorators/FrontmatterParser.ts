import { getFrontMatterInfo, parseYaml } from "obsidian";
import type { PreviewStyle, PreviewColorMode } from "../settings";
import {
	CARD_LENGTH_MIN,
	CARD_LENGTH_MAX,
	INLINE_LENGTH_MIN,
	INLINE_LENGTH_MAX,
} from "../constants";

/**
 * Page-level configuration that can override global settings via frontmatter
 */
export interface PageConfig {
	previewStyle?: PreviewStyle;
	maxCardLength?: number;
	maxInlineLength?: number;
	showFavicon?: boolean;
	includeDescription?: boolean;
	inlineColorMode?: PreviewColorMode;
	cardColorMode?: PreviewColorMode;
}

/**
 * Read the frontmatter block as a plain object with lowercased keys.
 * Returns null when there is no frontmatter, or it isn't valid YAML
 * (which is common while the user is still typing it).
 */
function readFrontmatter(text: string): Record<string, unknown> | null {
	const info = getFrontMatterInfo(text);
	if (!info.exists) {
		return null;
	}

	let parsed: unknown;
	try {
		parsed = parseYaml(info.frontmatter);
	} catch {
		return null;
	}

	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		return null;
	}

	const data: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(parsed)) {
		data[key.toLowerCase()] = value;
	}
	return data;
}

function asLowercaseString(value: unknown): string | undefined {
	return typeof value === "string" ? value.trim().toLowerCase() : undefined;
}

function asOneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
	const normalized = asLowercaseString(value);
	return allowed.find((option) => option === normalized);
}

/** Accept a YAML boolean, or the strings "true" / "false". */
function asBoolean(value: unknown): boolean | undefined {
	if (typeof value === "boolean") {
		return value;
	}
	const normalized = asLowercaseString(value);
	if (normalized === "true" || normalized === "false") {
		return normalized === "true";
	}
	return undefined;
}

/** Accept an integer, or a string of digits, within [min, max]. */
function asLength(value: unknown, min: number, max: number): number | undefined {
	let parsed: number | undefined;
	if (typeof value === "number" && Number.isInteger(value)) {
		parsed = value;
	} else if (typeof value === "string" && /^\d+$/.test(value.trim())) {
		parsed = Number(value.trim());
	}
	return parsed !== undefined && parsed >= min && parsed <= max ? parsed : undefined;
}

function setIfDefined<K extends keyof PageConfig>(config: PageConfig, key: K, value: PageConfig[K]): void {
	if (value !== undefined) {
		config[key] = value;
	}
}

/**
 * Parse frontmatter from the document to extract page-level preview configuration
 * Frontmatter must start on line 1 with --- and end with ---
 */
export function parsePageConfig(text: string): PageConfig {
	const data = readFrontmatter(text);
	if (!data) {
		return {};
	}

	// Only keys that resolved to a value are set, so hasFrontmatter can count them
	const config: PageConfig = {};
	setIfDefined(config, "previewStyle", asOneOf<PreviewStyle>(data["preview-style"], ["inline", "card"]));
	setIfDefined(config, "maxCardLength", asLength(data["max-card-length"], CARD_LENGTH_MIN, CARD_LENGTH_MAX));
	setIfDefined(config, "maxInlineLength", asLength(data["max-inline-length"], INLINE_LENGTH_MIN, INLINE_LENGTH_MAX));
	setIfDefined(config, "showFavicon", asBoolean(data["show-favicon"]));
	setIfDefined(config, "includeDescription", asBoolean(data["include-description"]));
	setIfDefined(config, "inlineColorMode", asOneOf<PreviewColorMode>(data["inline-color-mode"], ["none", "subtle"]));
	setIfDefined(config, "cardColorMode", asOneOf<PreviewColorMode>(data["card-color-mode"], ["none", "subtle"]));
	return config;
}

/**
 * Check if the document's frontmatter sets any URL Enricher property.
 * Other frontmatter (tags, aliases, ...) doesn't count.
 * @param text - Document text to check for frontmatter
 * @returns true if at least one recognized property has a valid value, false otherwise
 */
export function hasFrontmatter(text: string): boolean {
	const config = parsePageConfig(text);
	return Object.keys(config).length > 0;
}
