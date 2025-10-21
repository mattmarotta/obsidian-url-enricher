# Changelog

All notable changes to the Inline Link Preview plugin will be documented in this file.

## [0.7.0] - 2025-10-17

### Added
- **Site name footer in cards** - Cards now display the site name (e.g., "WIKIPEDIA", "OPENAI", "REDDIT") at the bottom with a subtle top border separator
- **Metadata-based site names** - Extracts site names from `og:site_name` or `application-name` meta tags for accurate branding
- **Fallback site name extraction** - If metadata doesn't provide site name, extracts from URL hostname (e.g., "anthropic.com" → "ANTHROPIC")
- **Wikipedia site name override** - Wikipedia pages now show "WIKIPEDIA" instead of language codes (e.g., "EN", "ES")
- DOMParser extraction for `og:site_name` and `application-name` meta tags
- Regex parser fallback for site name extraction

### Changed
- **Refined card design** - Cleaner, more polished appearance:
  - Increased padding: `1em 1.25em` (was `0.875em 1em`)
  - Larger border radius: `10px` (was `8px`)
  - More subtle shadows for cleaner look
  - Better hover effects with `-2px` lift
- **Better typography**:
  - Title slightly larger: `1.05em` with improved letter-spacing `-0.015em`
  - Description more readable: `0.94em` with `line-height: 1.6` and `opacity: 0.95`
- **Smaller favicons** - Reduced from `2em` to `1.75em` for better proportions
- **Improved spacing** - More breathing room between all card elements
- **Refined footer** - Site name footer styling:
  - Smaller text: `0.68em` with `font-weight: 500`
  - Lower opacity: `0.45` for less visual competition
  - More letter-spacing: `0.1em` for cleaner uppercase
  - Top border separator for clear visual boundary
  - More spacing: `margin-top: 0.9em` with `padding-top: 0.8em`

### Fixed
- Wikipedia pages now correctly show "WIKIPEDIA" as site name instead of language code ("EN")

## [0.5.0] - Unreleased

### Breaking Changes
- **Removed all conversion/paste functionality** - The plugin is now 100% non-destructive
- **Removed favicon decorator** - No longer adds favicons to `[text](url)` markdown links (only decorates bare URLs)
- **Removed URL display mode setting** - URL display is now automatic: cards show small editable URLs below the card, bubbles hide URLs entirely
- **Card layout change** - URLs now appear below the card preview as editable text, not inside the card footer
- Removed "Convert links on paste" setting
- Removed command palette commands:
  - "Convert selection to inline preview"
  - "Convert existing links to inline previews…"
- Changed default `dynamicPreviewMode` from `false` to `true`

### Added
- **Card-style previews** - New "card" style option for more prominent, detailed previews with Material Design principles
- **Material Design aesthetics** - Cards use elevation shadows, smooth transitions, and clean typography
- **Enhanced Reddit post previews**:
  - Bubble: Shows `r/Subreddit — Post Title` (subreddit first)
  - Card: Subreddit beside favicon, post title below, content preview beneath
  - Separate description lengths: 200 chars for cards, 100 chars for bubbles
- **Card header layout** - Favicon and title displayed side-by-side in a flex row
- **Wikipedia support** - New Wikipedia metadata handler extracts 3-sentence article descriptions via Wikipedia API
- **High-resolution favicons** - Requests 128px icons from Google for crisp display on retina screens and in cards
- **Flexible display modes**:
  - "Inline" - Previews flow with surrounding text, can wrap across multiple lines
  - "Block" - Previews appear on their own line (default)
- **Per-page configuration** via frontmatter:
  - `preview-style: card` or `preview-style: bubble`
  - `preview-display: inline` or `preview-display: block`
- New settings in UI:
  - Preview style dropdown (bubble/card)
  - Display mode dropdown (inline/block)
- Card-specific CSS styling with hover effects, larger favicons, and better visual hierarchy

### Changed
- Renamed internal `displayMode` parameter to `urlDisplayMode` for clarity
- Updated all documentation to reflect non-destructive-only approach
- Reorganized settings UI into logical sections:
  - Core Settings
  - Preview Appearance
  - Preview Content
  - Cache Management
- Improved settings descriptions and help text
- Plugin now defaults to being enabled (dynamicPreviewMode: true)
- Bubble previews now use `display: inline` for inline mode, allowing natural text wrapping

### Removed
- `faviconDecorator` - No longer decorates markdown links
- `PastePreviewHandler` class and paste event listener
- `urlListConverter.ts` - batch URL conversion logic
- `BulkLinkPreviewUpdater` - vault-wide conversion system
- `BulkConversionModal` and `FileSuggest` - bulk conversion UI
- `LinkPreviewBuilder` and `previewFormatter` - markdown generation
- `progressStatusManager` - floating progress indicator
- `commands/index.ts` - command registration system
- `tests/previewFormatter.spec.ts` - conversion-related tests
- Progress bar CSS animations
- `autoPreviewOnPaste` setting

### Fixed
- **Blurry favicons completely resolved** - Removed interfering CSS properties, using Chromium's default high-quality scaling
- **Card URLs now appear below the card** - Card preview appears above, URL below as editable text with same styling as previous footer
- **URLs are fully editable in card mode** - Users can click and modify URLs directly below the card
- **Better visual hierarchy** - Clear separation between preview (card) and source (URL)
- **Click behavior fixed** - Clicking cards/bubbles now opens URLs instead of editing them; clicking URL text allows editing
- **Wikipedia shows full context** - Now displays 3-sentence extracts (respects user's max-card-length/max-bubble-length settings) instead of short descriptions
- **Reddit bubble format** - Now shows `r/Subreddit — Post Title` (subreddit first for context)
- **Reddit card layout** - Structured layout with subreddit in header, post title, then content
- **Card structure improved** - Favicon and title now side-by-side in header row, description below
- Block display mode now properly shows previews on a new line
- Inline display mode now allows bubbles to wrap across multiple lines naturally
- Favicon decorator no longer interferes with markdown links `[text](url)`
- Loading state now auto-updates to show preview without requiring user interaction
- Better frontmatter parsing for page-level configuration
- Improved decoration refresh performance
- Clearer distinction between URL display modes and preview display modes

---

## [0.4.0] - Previous

### Added
- Dynamic preview mode with live URL decoration
- Three URL display modes
- Favicon caching system
- Real-time settings updates
- Clickable preview bubbles

### Changed
- Migrated to CodeMirror 6 decorations API
- Improved context detection for URLs

---

## Earlier Versions

See git history for changes prior to 0.4.0
