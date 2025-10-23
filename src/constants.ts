/**
 * Application-wide constants
 */

// Cache settings
export const FAVICON_CACHE_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const FAVICON_CACHE_SAVE_DEBOUNCE_MS = 1000; // 1 second
export const FAVICON_CACHE_KEY = "favicon-cache";

// URL matching settings
export const URL_CONTEXT_SEARCH_BACKWARDS = 1000; // chars
export const URL_CONTEXT_SEARCH_FORWARDS = 100; // chars

// Length limits
export const MAX_CARD_LENGTH_MIN = 100;
export const MAX_CARD_LENGTH_MAX = 5000;
export const MAX_BUBBLE_LENGTH_MIN = 50;
export const MAX_BUBBLE_LENGTH_MAX = 5000;
export const REQUEST_TIMEOUT_MIN = 500;

// Default lengths
export const DEFAULT_CARD_LENGTH = 300;
export const DEFAULT_BUBBLE_LENGTH = 150;

// Favicon settings
export const FAVICON_SIZE = "128"; // pixels for high-DPI displays

// Text truncation
export const ELLIPSIS = "\u2026";

// Description truncation threshold
export const MIN_DESCRIPTION_LENGTH = 10;
export const TITLE_SEPARATOR_LENGTH = 3; // " — "

// Console log prefix
export const LOG_PREFIX = "[inline-link-preview]";

// Cache limits
export const METADATA_CACHE_MAX_SIZE = 1000; // Max URLs to cache
export const MAX_CONCURRENT_REQUESTS = 10; // Max parallel metadata fetches
