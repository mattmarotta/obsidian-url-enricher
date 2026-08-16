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

// Length limits.
// These are the hard bounds, enforced in three places that must agree:
// the settings UI, frontmatter overrides, and settings loaded from disk.
export const CARD_LENGTH_MIN = 1;
export const CARD_LENGTH_MAX = 5000;
export const INLINE_LENGTH_MIN = 1;
export const INLINE_LENGTH_MAX = 5000;
export const REQUEST_TIMEOUT_MIN = 500;

// Guidance shown in the settings UI. Not enforced - shorter values are legal,
// they just tend to truncate the title before the description ever shows.
export const CARD_LENGTH_RECOMMENDED_MIN = 100;
export const INLINE_LENGTH_RECOMMENDED_MIN = 50;

// Default lengths
export const DEFAULT_CARD_LENGTH = 300;
export const DEFAULT_INLINE_LENGTH = 150;

// Favicon settings
export const FAVICON_SIZE = "128"; // pixels for high-DPI displays

// Text truncation
export const ELLIPSIS = "\u2026";

// Description truncation threshold
export const MIN_DESCRIPTION_LENGTH = 10;
export const TITLE_SEPARATOR_LENGTH = 3; // " — "

// Console log prefix
export const LOG_PREFIX = "[url-enricher]";

// Cache limits
export const METADATA_CACHE_MAX_SIZE = 1000; // Max URLs to cache
export const MAX_CONCURRENT_REQUESTS = 10; // Max parallel metadata fetches
