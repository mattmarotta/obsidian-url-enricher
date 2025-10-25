# URL Enricher

URL Enricher adds rich, non-destructive link previews for URLs in Obsidian. This plugin is **completely non-destructive** — your markdown source stays unchanged while URLs are enhanced with metadata previews in Live Preview mode.

When you have a bare URL in your notes like `https://trello.com`, the plugin automatically fetches the page title, description, and favicon, displaying them as an inline preview or prominent card right in your editor — all without modifying your source markdown.

## Features

- **100% Non-Destructive**: URLs remain as plain text in your markdown. All previews are rendered dynamically in Live Preview mode only.
- **Two Preview Styles**:
  - **Inline**: Compact, subtle inline preview that flows with your text (hides the URL)
  - **Card**: Prominent card-style preview with more visual weight and detail (shows small editable URL)
- **Automatic URL Display**:
  - **Cards**: Show a small, subtle URL (editable) with the card preview
  - **Inline**: Hide the URL completely and replace it with the inline preview
- **Page-Level Configuration**: Override global settings using frontmatter:
  ```yaml
  ---
  preview-style: card    # or inline
  ---
  ```
- **Rich Metadata Display**:
  - Site favicons displayed at high resolution (128px) for crisp quality
  - Page titles and descriptions with styled hashtags (#tag) and mentions (@user)
  - Site name labels in card footers (e.g., "WIKIPEDIA", "REDDIT", "OPENAI")
  - Emoji preservation (optional)
  - Customizable description length with natural word-wrapping
  - Domain-aware enrichments for Wikipedia, Google Search, Reddit, Twitter/X, and LinkedIn links
- **Real-Time Updates**: Settings changes apply immediately without page navigation
- **Clickable Previews**: All inline previews and cards are clickable to open URLs
- **Cursor-Aware Previews**: Previews instantly hide when cursor is inside a URL, preventing accidental edits and providing clear visual feedback during editing
- **Smart Context Detection**: Automatically generates previews for:
  - Bare URLs: `https://example.com`
  - Markdown links: `[custom text](https://example.com)`, `[](https://example.com)`, or `[https://example.com](https://example.com)`
  - Wikilinks with URLs: `[[https://example.com]]` (URL only, not page names like `[[My Page]]`)

  And skips URLs in:
  - Image embeds `![alt](url)`
  - Code blocks and inline code
- **Persistent Caching**: Favicons cached for 30 days to minimize network requests
- **YouTube-Friendly**: Treats YouTube links as standard previews, avoiding unwanted embeds

## Usage

### Supported URL Formats
The plugin automatically generates previews for URLs in these formats:

1. **Bare URLs**: `https://example.com`
2. **Markdown links**:
   - `[custom text](https://example.com)` - displays fetched page title in preview (custom text visible in source mode)
   - `[](https://example.com)` - empty link text, displays fetched page title
   - `[https://example.com](https://example.com)` - displays fetched page title
3. **Wikilinks with URLs**: `[[https://example.com]]`
   - ⚠️ **Important**: Only URLs are supported, not Obsidian page names
   - ✅ Works: `[[https://github.com]]` (actual URL)
   - ❌ Doesn't work: `[[My Page]]` (page name - normal wikilink behavior)

### Basic Usage
1. Paste or type a bare URL in your note: `https://github.com`
2. In Live Preview mode, the URL automatically gains a rich preview showing the page title, description, and favicon
3. Click the preview bubble/card to open the URL in a new tab
4. Your markdown source remains untouched — the URL is still just plain text

### Per-Page Configuration
Add frontmatter to your note to customize preview appearance:

```yaml
---
preview-style: card              # Use prominent card style instead of inline
max-card-length: 400             # Maximum characters for card previews
show-favicon: true               # Show/hide favicons
include-description: true        # Include/exclude descriptions
---
```

**Note**: URL display is automatic based on preview style—cards show a small editable URL, inline previews hide the URL entirely.

These settings override your global preferences for that specific page only. For a complete list of available frontmatter properties and examples, see [FRONTMATTER-SUPPORT.md](docs/features/FRONTMATTER-SUPPORT.md).

## Settings

Open **Settings → Community plugins → URL Enricher** to configure:

### Core Settings
- **Dynamic preview mode** – Enable or disable the plugin entirely. When enabled, bare URLs show rich previews in Live Preview mode.

### Preview Appearance
- **Preview style** – Choose between:
  - **Inline**: Compact, subtle inline style (default)
  - **Card**: Prominent card style with more visual weight and site name footer
- **Preview background color** – Customize background color for both inline previews and cards (none, grey, or custom)

**Note**:
- URL display is automatic—cards show a small editable URL, inline previews hide the URL entirely.
- Cards display a site name footer (e.g., "WIKIPEDIA", "ANTHROPIC") extracted from page metadata or URL.

### Preview Content
- **Include description** – Show page description after the title
- **Description length** – Maximum characters for descriptions (default: 60)
- **Show favicons** – Display site icons before preview text
- **Keep emoji** – Preserve emoji from page titles and descriptions
- **Request timeout** – Network timeout in milliseconds (default: 7000)

### Cache Management
- View cache statistics (cached domains, oldest entry)
- Clear favicon cache if needed

### Per-Page Overrides
Global settings can be overridden per-page using frontmatter. Supported properties include:

```yaml
---
preview-style: card              # or inline
max-card-length: 400             # 100-5000
max-inline-length: 200           # 50-5000
show-favicon: true               # or false
include-description: true        # or false
preview-color-mode: grey         # or none, custom
custom-preview-color: "#4a4a4a"  # hex color when using custom mode
---
```

**Notes**:
- Minimum values (100 for cards, 50 for inline) prevent unusably short previews. Maximum value (5000) prevents performance issues with extremely long descriptions.
- URL display is automatic: Cards show a small editable URL, inline previews hide the URL entirely.

For detailed documentation and examples, see [FRONTMATTER-SUPPORT.md](docs/features/FRONTMATTER-SUPPORT.md).

Changes apply immediately to future previews and when you navigate between notes.

## Cursor-Aware Previews

One of the plugin's most powerful UX features is **cursor-aware preview rendering**. Previews automatically hide when you position your cursor inside a URL, giving you instant visual feedback that you're editing the raw URL.

### How It Works

**When cursor is outside a URL:**
- URL shows rich preview with title, description, and favicon
- `https://github.com` → 🎨 **GitHub Preview Card**

**When cursor is inside a URL:**
- Preview instantly disappears, showing raw URL
- `https://github.com|` ← Raw URL visible, ready to edit

**When cursor moves away:**
- Preview automatically returns
- `https://github.com` → 🎨 **GitHub Preview Card**

### Why This Matters for UX

1. **Prevents Accidental Edits**
   - You can't accidentally modify a URL without seeing it first
   - Clear visual distinction between "viewing" and "editing" states

2. **No URL Corruption**
   - When cursor is at the end of a URL, you immediately see the raw URL
   - Prevents typing text that accidentally becomes part of the URL
   - No need to guess if you're about to edit the URL or type after it

3. **Familiar Editing Pattern**
   - Works like inline code, LaTeX, or other "expandable" elements in many editors
   - Click to edit, click away to see preview
   - Intuitive for users familiar with modern editing tools

4. **Uninterrupted Typing**
   - Type `[[https://www.amaz` without previews appearing mid-typing
   - Preview only appears when you move cursor away
   - No jarring visual changes while composing

5. **Easy URL Corrections**
   - Click anywhere in a preview to instantly see and edit the raw URL
   - Make changes, move cursor away → preview updates automatically
   - Fast iteration when fixing typos or updating links

This behavior applies to all URL formats: bare URLs, markdown links `[text](url)`, and wikilinks `[[url]]`.

## URL Error Detection

The plugin detects and flags broken URLs with a small warning indicator (⚠️). URLs with errors remain fully visible and editable—they are not replaced with previews.

**Types of errors detected:**

1. **HTTP Errors** (controllable via "HTTP Error Warnings" setting):
   - **403 Forbidden** - Site blocks automated requests (common for e-commerce sites with bot protection)
   - **404 Not Found** - Page doesn't exist or URL is incorrect
   - **500+ Server Error** - Website server encountered an error
   - **Soft 404s** - Page returns 200 OK but shows error content:
     - Reddit: "page not found", "this community doesn't exist"
     - YouTube: "video unavailable", "video has been removed"
     - Generic pages with titles like "404 Not Found"

2. **Network Errors** (always shown):
   - **DNS resolution failure** - Domain doesn't exist
   - **Connection timeout** - Can't reach the server
   - **SSL/TLS errors** - Certificate problems
   - **No internet connection** - You're offline

**Controlling error warnings:**

Go to **Settings → URL Enricher → Preview Content → HTTP Error Warnings**:
- **Enabled (default)**: Show ⚠️ for both HTTP errors and network failures
- **Disabled**: Only show ⚠️ for network failures; HTTP errors will show fallback previews without warnings

**Error indicator tooltips:**
- **HTTP errors**: "HTTP error (403/404). Disable warnings in settings."
- **Network errors**: "Network error at URL. Cannot generate preview."

**When to disable HTTP error warnings:**
- Sites that block bots (403 Forbidden) but you know the URL is valid
- You prefer to see fallback previews even for potentially broken pages
- You want to reduce visual clutter and manually verify broken URLs yourself

## Card Design

Card-style previews follow **Material Design** principles for a clean, professional appearance:

### Visual Features
- **Clean layout**: Generous padding and spacing for readability
- **Site branding**: Favicon and site name footer (e.g., "WIKIPEDIA", "REDDIT", "OPENAI")
- **Visual hierarchy**: Title (1.05em, bold) → Description (0.94em, muted) → Site name (0.68em, uppercase)
- **Subtle elevation**: Soft shadows that increase on hover for depth
- **Smooth transitions**: 200ms animations using Material's cubic-bezier easing
- **High-quality favicons**: 128px resolution for crisp display on retina screens

### Layout Structure
```
┌─────────────────────────────────────────┐
│  [Favicon] Site Title                    │  ← Header (favicon + title)
│                                          │
│  Description text with proper line       │  ← Description (muted)
│  height and spacing for readability...   │
│                                          │
│  ─────────────────────────────────────  │  ← Border separator
│  SITE NAME                               │  ← Footer (uppercase, subtle)
└─────────────────────────────────────────┘
https://example.com                          ← Editable URL below card
```

### Site Name Intelligence
- **Metadata-first**: Extracts from `og:site_name` or `application-name` meta tags
- **Smart fallback**: Parses domain if metadata unavailable (e.g., "github.com" → "GITHUB")
- **Special handling**: Wikipedia always shows "WIKIPEDIA" instead of language codes
- **Automatic branding**: Respects how sites identify themselves

## Domain-Aware Metadata Enrichment

The plugin includes specialized handlers for specific websites to provide richer, more accurate previews:

### Wikipedia
- Fetches article descriptions via Wikipedia API
- Extracts introductory section text (truncated based on user's max-card-length or max-inline-length settings)
- Always displays "WIKIPEDIA" as site name (not language codes like "EN")
- Provides comprehensive context for encyclopedia articles

### Reddit
- Custom formatting optimized for Reddit posts
- **Card view**: Subreddit name beside favicon → Post title (bold) → Content preview
- **Inline view**: Shows `r/Subreddit — Post Title` format
- Separate length limits: 200 chars for cards, 100 chars for inline previews
- Fetches actual post titles and content (not just page meta tags)

### Google Search
- Extracts search query from URL parameters
- Displays as "Google Search — [your query]" for clearer context
- More useful than generic "Google" title

### Twitter/X
- Fetches tweet content via Twitter's oEmbed API (no authentication required)
- **Profile URLs**: Shows `@username` as title (e.g., `@ThePrimeagen`)
- **Tweet URLs**: Shows `@username` as title + tweet text as description
- Handles both `x.com` and `twitter.com` domains
- Gracefully degrades when oEmbed fails (network errors, unavailable tweets)

### Extensible Handler System
The metadata enrichment pipeline is extensible—additional domain-specific handlers can be registered to provide custom formatting for other websites.

## Debugging & Advanced Features

The plugin includes powerful debugging tools accessible via the browser console (open with `Ctrl+Shift+I` or `Cmd+Option+I`).

### Developer Console API

All debugging commands are available under `window.inlineLinkPreview`:

```javascript
// Show help and available commands
window.inlineLinkPreview.help()

// Cache Management
window.inlineLinkPreview.getCacheStats()        // View cache statistics
window.inlineLinkPreview.clearAllCaches()       // Clear all caches

// Logging Control
window.inlineLinkPreview.setLogLevel("debug")   // Set log level: error, warn, info, debug
window.inlineLinkPreview.setLogLevel("error")   // Reduce logging to errors only

// Performance Tracking (optional - disabled by default)
window.inlineLinkPreview.enablePerformanceTracking()   // Start tracking performance
window.inlineLinkPreview.getPerformanceMetrics()       // View metrics table
window.inlineLinkPreview.resetPerformanceMetrics()     // Reset all metrics
window.inlineLinkPreview.disablePerformanceTracking()  // Stop tracking

// Utilities
window.inlineLinkPreview.refreshDecorations()   // Force refresh all previews
```

### Cache Statistics

View detailed cache performance:

```javascript
window.inlineLinkPreview.getCacheStats()
```

**Example output:**
```
=== Metadata Cache Stats ===
Size: 342 / 1000 items
Hits: 1,234
Misses: 156
Evictions: 12
Hit Rate: 88.79%

=== Favicon Cache Stats ===
Cached Domains: 89
Oldest Entry: reddit.com (cached 2024-01-15)
Cache Age: 7 days
```

### Log Levels

Control logging verbosity:

- **`error`** - Only critical errors (quietest)
- **`warn`** - Warnings and errors
- **`info`** - General information (default)
- **`debug`** - Detailed debugging info (most verbose)

```javascript
// Enable detailed debugging
window.inlineLinkPreview.setLogLevel("debug")

// Reduce noise
window.inlineLinkPreview.setLogLevel("warn")
```

### Performance Tracking

Track operation timing and identify bottlenecks:

```javascript
// Enable tracking
window.inlineLinkPreview.enablePerformanceTracking()

// Use the plugin normally...

// View metrics
window.inlineLinkPreview.getPerformanceMetrics()
```

**Example output:**
```
=== Performance Metrics ===
Operation                Count   Avg Time   Min Time   Max Time   Total Time
────────────────────────────────────────────────────────────────────────────
fetchMetadata           45      234.5ms    120ms      890ms      10,552ms
parseHtml               45      12.3ms     8ms        45ms       553ms
resolveFavicon          38      156.7ms    90ms       450ms      5,954ms
buildDecorations        12      3.2ms      2ms        8ms        38ms
```

**Note:** Performance tracking is disabled by default to avoid overhead. Enable it only when troubleshooting performance issues.

### Common Debugging Scenarios

**Problem: Previews not loading**
```javascript
// Check if metadata is being fetched
window.inlineLinkPreview.setLogLevel("debug")
// Watch console for fetch errors
```

**Problem: Slow performance**
```javascript
// Enable performance tracking
window.inlineLinkPreview.enablePerformanceTracking()
// Use the plugin for a minute
window.inlineLinkPreview.getPerformanceMetrics()
// Look for operations with high average time
```

**Problem: Stale or incorrect previews**
```javascript
// Clear all caches
window.inlineLinkPreview.clearAllCaches()
// Force refresh
window.inlineLinkPreview.refreshDecorations()
```

## Troubleshooting

### Common Issues

**⚠️ Frontmatter must start on line 1**

The #1 reason frontmatter doesn't work:

```yaml
# ❌ WRONG - Will not work!
# My Note Title

---
preview-style: card
---

# ✅ CORRECT - Frontmatter first!
---
preview-style: card
---

# My Note Title
```

**⚠️ Clear cache when testing changes**

If you don't see changes after updating the plugin or modifying metadata:

1. Open browser console: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows)
2. Run: `window.inlineLinkPreview.clearAllCaches()`
3. Run: `window.inlineLinkPreview.refreshDecorations()`

The plugin caches metadata and favicons for 30 days for performance.

**⚠️ Must be in Live Preview mode**

Previews only appear in **Live Preview mode**, not in Source mode or Reading view.

### Previews Not Appearing
- Ensure you're in **Live Preview mode** (not Source mode or Reading view)
- Check that URLs are on their own line or properly formatted as markdown links
- The plugin is non-destructive: URLs must remain as plain text URLs in your markdown

### Previews Show Wrong Content
- Clear metadata cache: `window.inlineLinkPreview.clearAllCaches()` in browser console
- Check if the website blocks automated requests (403 Forbidden errors)
- Some sites may not provide OpenGraph or meta tag metadata

### Favicons Not Loading
- Favicon cache is persistent with 30-day expiration
- Clear favicon cache: `window.inlineLinkPreview.clearAllCaches()` in browser console
- Some domains may not have favicons available via Google's favicon service

### Frontmatter Not Working
- Frontmatter properties MUST start on **line 1** with `---`
- Check property names are spelled correctly (case-insensitive)
- Verify values are valid (e.g., max-card-length: 100-5000)
- See [FRONTMATTER-TROUBLESHOOTING.md](docs/features/FRONTMATTER-TROUBLESHOOTING.md) for detailed debugging steps

### Performance Issues
- Reduce `max-card-length` or `max-inline-length` settings to limit preview size
- Disable descriptions: Set `include-description` to false
- Increase `request timeout` if on slow connection
- Consider using inline style instead of card style for more compact previews
- Check performance metrics: `window.inlineLinkPreview.getPerformanceMetrics()`

### Error Warnings (⚠️)
- **HTTP errors** (403, 404, 500+): Enable/disable warnings in Settings → HTTP Error Warnings
- **Network errors**: Always shown for DNS failures, timeouts, SSL errors
- Hover over warning indicator to see error details

## Privacy and network usage

To build a preview, the plugin requests the linked page and parses its HTML locally. Favicons are fetched from Google's public favicon service at 128px resolution for consistent, high-quality icons across all sites. URLs are sent directly to their target domains; no additional third-party metadata service is used.

Favicon URLs are cached on disk for 30 days to improve performance and reduce network requests. The cache stores only the mapping between domains and their favicon URLs (e.g., `reddit.com → https://www.google.com/s2/favicons?sz=128&domain=reddit.com`), not the actual images or page content. If a site is private or requires authentication, the plugin will not be able to fetch metadata.

**The plugin is completely non-destructive**: It never modifies your markdown source files. All previews are rendered dynamically in Live Preview mode only.

## Installation

Manual installation for testing:

1. Clone this repository into `<Vault>/.obsidian/plugins/obsidian-inline-link-preview/`.
2. Run `npm install`.
3. Run `npm run build` to generate `main.js`.
4. Enable **URL Enricher** inside **Settings → Community plugins**.

The release bundle consists of `manifest.json`, `main.js`, and optionally `styles.css`.

## Development

- `npm install` – install dependencies.
- `npm run dev` – watch mode with incremental builds.
- `npm run build` – type-check and create a production bundle.
- `npm test` – run unit tests.
- `npm run set-version <x.y.z>` – update version across all files (package.json, manifest.json, versions.json, AGENTS.md, CHANGELOG.md). See [VERSION-MANAGEMENT.md](docs/developer/VERSION-MANAGEMENT.md) for details.

For detailed contributing guidelines, coding standards, and testing documentation, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Testing

The plugin uses [Vitest](https://vitest.dev/) for testing with comprehensive test coverage of core functionality.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI dashboard
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Current Test Coverage

**558 tests across 12 test files** covering:

- **Utilities** (210 tests, 91% coverage):
  - URL extraction, validation, and markdown link handling ([url.test.ts](tests/utils/url.test.ts) - 67 tests, 98% coverage)
  - Text sanitization and HTML entity decoding ([text.test.ts](tests/utils/text.test.ts) - 45 tests, 67% coverage)
  - Editor position utilities ([editorHelpers.test.ts](tests/utils/editorHelpers.test.ts) - 15 tests, 100% coverage)
  - Markdown link detection ([markdown.test.ts](tests/utils/markdown.test.ts) - 27 tests, 95% coverage)
  - String replacement utilities ([stringReplace.test.ts](tests/utils/stringReplace.test.ts) - 17 tests, 100% coverage)
  - Vault file/folder traversal ([vault.test.ts](tests/utils/vault.test.ts) - 13 tests, 100% coverage)

- **Services** (185 tests, 73% coverage):
  - Link preview metadata fetching and caching ([linkPreviewService.test.ts](tests/services/linkPreviewService.test.ts) - 52 tests, 69% coverage)
  - Favicon caching with memory/disk persistence ([faviconCache.test.ts](tests/services/faviconCache.test.ts) - 41 tests, 97% coverage)
  - Metadata handlers for Wikipedia, Reddit, Google Search, and Twitter/X ([metadataHandlers.test.ts](tests/services/metadataHandlers.test.ts) - 86 tests, 92% coverage)

- **Editor** (85 tests, business logic only):
  - Frontmatter parsing and settings ([urlPreviewDecorator.test.ts](tests/editor/urlPreviewDecorator.test.ts) - 85 tests)
  - Text processing helpers (truncate, stripEmoji, deriveTitleFromUrl, etc.)
  - Note: Widget rendering intentionally not tested (UI/DOM code)

- **Plugin Lifecycle** (110 tests):
  - Settings structure validation ([settings.test.ts](tests/settings.test.ts) - 60 tests)
  - Settings normalization and defaults ([main.test.ts](tests/main.test.ts) - 50 tests)
  - Type conversion, clamping, and validation

For comprehensive testing documentation, see [TESTING.md](docs/developer/TESTING.md).

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Coding standards and TypeScript guidelines
- Testing requirements
- Git workflow and commit conventions
- Pull request process

### Adding Custom Metadata Handlers

The plugin uses an extensible metadata handler system to provide site-specific enhancements. To add support for a new site:

1. **Create a handler** in `src/services/metadataHandlers/`:

```typescript
import type { MetadataHandler, MetadataHandlerContext } from "./metadataHandler";

export class CustomSiteHandler implements MetadataHandler {
  matches({ url }: MetadataHandlerContext): boolean {
    // Return true if this handler should process the URL
    return url.hostname.includes('example.com');
  }

  async enrich(context: MetadataHandlerContext): Promise<void> {
    const { url, metadata, request } = context;

    // Fetch additional metadata from the site's API or HTML
    // Example: Call a REST API, parse custom meta tags, etc.

    // Update the metadata object
    metadata.title = "Custom Title";
    metadata.description = "Custom Description";
    metadata.siteName = "EXAMPLE SITE";
  }
}
```

2. **Register the handler** in `src/services/metadataHandlers/index.ts`:

```typescript
import { CustomSiteHandler } from './customSiteHandler';

export function getMetadataHandlers(): MetadataHandler[] {
  return [
    new CustomSiteHandler(),
    new WikipediaMetadataHandler(),
    new RedditMetadataHandler(),
    new GoogleSearchMetadataHandler(),
  ];
}
```

3. **Test your handler**:
   - Run `npm run dev` to start watch mode
   - Add a URL from your custom site to a test note
   - Verify the custom metadata appears in the preview

For architecture details and advanced patterns, see [ARCHITECTURE.md](docs/developer/ARCHITECTURE.md).

## License

MIT
