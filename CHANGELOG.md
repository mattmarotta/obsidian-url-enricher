# Changelog

All notable changes to the Inline Link Preview plugin will be documented in this file.

## [0.5.0] - Unreleased

### Breaking Changes
- **Removed all conversion/paste functionality** - The plugin is now 100% non-destructive
- **Removed favicon decorator** - No longer adds favicons to `[text](url)` markdown links (only decorates bare URLs)
- Removed "Convert links on paste" setting
- Removed command palette commands:
  - "Convert selection to inline preview"
  - "Convert existing links to inline previews…"
- Changed default `dynamicPreviewMode` from `false` to `true`
- Changed default `urlDisplayMode` from `"url-and-preview"` to `"small-url-and-preview"`

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
- **Wikipedia shows full context** - Now displays 3-sentence extracts (300 chars) instead of short descriptions
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
