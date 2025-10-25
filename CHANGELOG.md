# Changelog

All notable changes to URL Enricher will be documented in this file.

## [Unreleased]

### Changed

#### Length Constraint Minimums Removed

- **Previous behavior**: `max-card-length` required minimum of 100, `max-inline-length` required minimum of 50
- **New behavior**: Both settings now accept any value from 1 to 5000
- **Reason**: Users setting values like 90 were confused when they silently fell back to global defaults (300/150)
- **Recommendation**: Values of 100+ for cards and 50+ for inline are still recommended for readability
- **Impact**:
  - Settings UI now shows "Recommended: 100+" instead of hard minimums
  - Frontmatter values below old minimums (e.g., `max-card-length: 90`) are now respected
  - Documentation updated to reflect recommended ranges instead of enforced minimums
- **Migration**: No action needed - existing settings continue to work as before

#### Version Bump Script Promotes Unreleased Entries

- **Improvement**: `version-bump.mjs` now moves the `Unreleased` notes into the new version section automatically when bumping
- **Benefits**:
  - Keeps changelog tidy without manual copy/paste
  - Ensures fresh `Unreleased` template is ready for new work
- **Developer workflow**: Continue logging day-to-day changes under `## [Unreleased]`; the script handles promotion during releases

#### Developer Naming Cleanup

- **Updated**: Runtime log prefixes, favicon widget class, and package metadata now use `url-enricher` naming
- **Docs**: `CONTRIBUTING.md` setup instructions reference the renamed repository and plugin folder
- **Purpose**: Aligns developer-facing tooling with the plugin rename while keeping compatibility APIs intact

### Fixed

- **Release workflow**: Correctly resolves the previous tag for GitHub compare links (no more `compare/...VERSION`)

## [0.9.1] - 2025-10-25

### Added

#### Automated GitHub Release Notes

- **Added**: GitHub Actions now automatically extracts release notes from CHANGELOG.md
- **Benefit**: CHANGELOG.md is now the single source of truth for release documentation
- **Impact**: No more manual release note creation - just write good CHANGELOG entries
- **Format**: Supports both simple (0.8.0-style) and complex (0.9.0-style with nested sections) formats
- **Documentation**:
  - Enhanced `VERSION-MANAGEMENT.md` with Keep a Changelog format guidance
  - Updated `DEVELOPER-GUIDE.md` with CHANGELOG formatting examples and best practices
  - Added CHANGELOG format guidelines to `AGENTS.md` for AI agents

### Changed
-

### Fixed
-

## [0.9.0] - 2025-10-24

### Breaking Changes

#### Plugin Renamed

- **New name**: "URL Enricher" (was "Inline Link Preview")
- **Plugin ID changed**: `url-enricher` from `obsidian-inline-link-preview`
- **Reason**: Better reflects the non-destructive enrichment functionality

#### Display Mode Removed

- All previews (both Card and Inline styles) now always flow inline with text
- No more automatic line breaks or spacing above previews
- **Removed setting**: "Display mode" (inline/block option)
- **Removed frontmatter**: `preview-display` property
- **User control**: Press Enter manually to create line breaks if desired
- **Benefit**: Eliminates unwanted spacing, simplifies UX

#### Terminology: "Bubble" → "Inline"

- **Preview style**: "bubble" renamed to "inline" for clarity
- **Settings**:
    - `maxBubbleLength` → `maxInlineLength`
    - UI text: "Maximum bubble length" → "Maximum inline length"
- **Frontmatter**:
    - `preview-style: bubble` → `preview-style: inline`
    - `max-bubble-length` → `max-inline-length`
- **TypeScript**: `PreviewStyle` type values changed
- **CSS classes**: All `.inline-url-preview-*` → `.url-preview-*`

#### CSS Class Rationalization

- **Base class**: `.inline-url-preview` → `.url-preview`
- **Style modifiers**:
    - `.inline-url-preview--bubble` → `.url-preview--inline`
    - `.inline-url-preview--card` → `.url-preview--card`
- **Element classes**: All `.inline-url-preview__*` → `.url-preview__*`
- **Utility classes**: All `.ilp-*` → `.url-preview-*`
- **Removed classes**: `.inline-url-preview--bubble-inline`, `.inline-url-preview--bubble-block` (no longer needed)
- **Impact**: Custom CSS targeting old classes will need updates

### Migration Guide

#### For Users

**Settings Migration (Automatic)**:

- `maxBubbleLength` automatically becomes `maxInlineLength` on plugin load
- `displayMode` setting automatically removed
- No user action required

**Frontmatter Updates (Optional)**:

- Update `preview-style: bubble` → `preview-style: inline` in notes
- Update `max-bubble-length` → `max-inline-length` in notes
- Remove `preview-display` property from notes
- Old properties are silently ignored (no errors)

**Display Changes**:

- If you used `preview-display: block` for spacing, manually press Enter before/after URLs
- Cards and inline previews both flow inline - no automatic spacing

#### For Custom CSS Users

Update any custom CSS targeting plugin classes:

```css
/* Old */
.inline-url-preview { }
.inline-url-preview--bubble { }
.inline-url-preview--card { }

/* New */
.url-preview { }
.url-preview--inline { }
.url-preview--card { }
```

#### For Developers

- Developer API now available at `window.urlEnricher` (also `window.inlineLinkPreview` for compatibility)
- All log messages now prefixed with `[url-enricher]` instead of `[inline-link-preview]`

### Benefits

- **Clearer terminology**: "Inline" better describes the compact preview style
- **No unwanted spacing**: Previews flow naturally with text
- **Shorter CSS classes**: Cleaner, more maintainable styles
- **Simplified codebase**: Removed unnecessary display mode logic

### Bug Fixes

#### Hashtag and Mention Styling Now Works

- **Fixed**: CSS class name mismatch prevented hashtags (#tag) and mentions (@user) from being styled
- **Changed**: Class names from `ilp-hashtag`/`ilp-mention` to `url-preview-hashtag`/`url-preview-mention`
- **Impact**: Hashtags and mentions now display with accent color and bold weight in all previews

#### Empty Link Text Support

- **Fixed**: Empty markdown links `[](https://example.com)` were completely ignored
- **Changed**: Updated regex to allow zero-length link text
- **Impact**: `[](url)` now works like a bare URL, displaying fetched page title

#### Titles Now Support Hashtag/Mention Styling

- **Fixed**: Hashtags and mentions were only styled in descriptions, not titles
- **Changed**: All titles (card mode, inline mode, Reddit posts) now use `enrichTextWithStyledElements()`
- **Impact**: Hashtags and mentions stand out in titles as well as descriptions

#### Title truncation

- Titles now respect max length settings. Previously, very long titles (e.g., from Instagram) bypassed truncation and exceeded configured limits. Both title and description are now intelligently truncated to fit within the maximum length:
    - If title alone exceeds max length → title is truncated, description removed
    - If title + description exceed max length → both are truncated intelligently
    - Titles are preserved up to the limit; descriptions are truncated or removed as needed
    - Title truncation priority: When content exceeds max length, titles are always preserved (truncated if needed), and descriptions are added only if space permits.

### Enhancements

#### Custom Link Text Behavior Improved

- **Changed**: Markdown links with custom text now display fetched page title instead of custom text
- **Previous**: `[my custom text](https://reddit.com/...)` showed "my custom text" as title
- **New**: Always shows actual page title from metadata for consistency
- **Fallback**: Custom text used only when page metadata unavailable
- **Benefit**: Ensures title, description, favicon, and site name all match actual page content
- **Note**: Custom link text still visible in source mode

#### LinkedIn Title Cleaning

- **Added**: New LinkedIn metadata handler for cleaner, more readable titles
- **Problem**: LinkedIn titles start with hashtags: `#tag1 #tag2 | Author | 17 comments — Content`
- **Solution**: Automatically cleans to: `Author — Content`
- **Features**:
    - Removes leading hashtag blocks
    - Removes comment counts ("17 comments", "1 comment")
    - Preserves hashtags that appear naturally in content
    - Extracts author name and content preview
    - Works with posts, articles, company pages, and profiles
- **Example**:
    - Before: `#personalbranding #careerbranding | Hina Arora | 17 comments — We are using the ChatGPT...`
    - After: `Hina Arora — We are using the ChatGPT...`

#### Frontmatter-only activation mode

- New "Require frontmatter to activate" setting allows opt-in per page. When enabled, the plugin only shows previews on pages with frontmatter properties. This is useful for users who only want previews in specific notes (e.g., research, bookmarks) rather than across their entire vault.

## [0.8.0] - 2025-10-24

### Added

#### Developer Tools & Debugging

- **Developer Console API** - New `window.inlineLinkPreview` global for debugging:
    - `getCacheStats()` - View metadata and favicon cache statistics (size, hits, misses, evictions, hit rate)
    - `clearAllCaches()` - Clear all caches (metadata + favicon)
    - `setLogLevel(level)` - Set logging verbosity (error, warn, info, debug)
    - `enablePerformanceTracking()` / `disablePerformanceTracking()` - Toggle performance metrics
    - `getPerformanceMetrics()` - View operation timing and bottleneck analysis
    - `resetPerformanceMetrics()` - Reset all metrics
    - `refreshDecorations()` - Force refresh all previews
    - `help()` - Show available commands
- **Structured Logging** (`logger.ts`) - 4 log levels (ERROR, WARN, INFO, DEBUG) with per-module loggers
- **Performance Tracking** (`performance.ts`) - Timer class and metrics collection for profiling
- **Pre-commit Hooks** - Automated quality checks (TypeScript validation + tests) before each commit
- **GitHub Actions CI/CD**:
    - Build workflow - Verifies TypeScript compilation on every push/PR
    - Release workflow - Automated releases on version tags with changelog generation
    - Comprehensive workflow documentation in `.github/workflows/README.md`

#### Performance & Scalability

- **LRU Cache** (`LRUCache.ts`) - Memory-bounded cache (max 1000 items) with automatic eviction
- **Concurrency Limiting** - Max 10 parallel HTTP requests to prevent overload
- **Request Deduplication** - Multiple requests for same URL share single fetch promise
- **Cache Statistics** - Track hits, misses, evictions, and hit rate for both metadata and favicon caches

#### Documentation

- **ARCHITECTURE.md** (370 lines) - Complete system architecture documentation:
    - Component responsibilities and data flow diagrams
    - Design patterns used throughout the codebase
    - Performance considerations and caching strategies
    - Extension points for custom metadata handlers
- **CONTRIBUTING.md** (630 lines) - Comprehensive contributor guide:
    - Development setup and tooling requirements
    - Coding standards and TypeScript guidelines
    - Testing requirements and best practices
    - Git workflow and commit conventions
    - Pull request process
- **Enhanced README.md** - New "Debugging & Advanced Features" section with console API examples

#### Code Organization

- **New `decorators/` directory** - Split `urlPreviewDecorator.ts` (1224 → 120 lines, 90% reduction):
    - `PreviewWidget.ts` - Widget rendering (bubbles, cards)
    - `DecorationBuilder.ts` - Core decoration creation logic
    - `UrlMatcher.ts` - URL pattern matching
    - `MetadataEnricher.ts` - Text enrichment (hashtags, emojis)
    - `FrontmatterParser.ts` - Per-note configuration
- **New service modules** - Split `linkPreviewService.ts` (700 → 287 lines, 59% reduction):
    - `MetadataFetcher.ts` - HTTP request handling with timeout
    - `HtmlParser.ts` - HTML metadata parsing (Open Graph, Twitter Cards, JSON-LD)
    - `FaviconResolver.ts` - Favicon resolution and validation
    - `MetadataValidator.ts` - Soft 404 detection
- **New utility modules**:
    - `LRUCache.ts` - Generic LRU cache implementation
    - `logger.ts` - Centralized logging infrastructure
    - `performance.ts` - Performance monitoring and profiling
- **New types directory** - `types/obsidian-extended.ts` for extended Obsidian API types
- **constants.ts** - Extracted 20+ magic numbers into named constants

### Changed

#### Code Quality Improvements

- **100% Type-Safe Codebase** - Eliminated ALL `any` types across entire project
- **Type Guards** - Added validation for all external data (cache entries, API responses)
- **Early Returns** - Simplified complex conditionals throughout the codebase
- **Lookup Tables** - Replaced switch statements with object lookups (e.g., color mode mapping)
- **Enhanced TypeScript Strict Mode** - Enforced stricter type checking across all modules

#### Testing & Quality

- **558 tests** (up from 517) - Comprehensive test coverage maintained at 100% pass rate
- **Updated test counts** in all documentation (README.md, TESTING.md, AGENTS.md)
- **Accurate coverage reporting** - Fixed test count discrepancies across docs

#### Developer Experience

- **Enhanced version-bump script** - Now updates:
    - `AGENTS.md` - Current version line
    - `CHANGELOG.md` - Automatically creates new unreleased section template
    - Improved output with status indicators (✓, ⚠, ℹ) and helpful next steps
    - Smart duplicate detection (won't create changelog entry if version exists)
- **Improved build output** - Clearer status messages and error reporting

#### Documentation Updates

- **README.md** - Removed duplicate sections, added debugging features documentation
- **AGENTS.md** - Updated file structure to reflect new modular organization
- **TESTING.md** - Corrected all test counts and coverage percentages
- **RESUME.md** - Updated project status and statistics

### Fixed

- **Documentation inconsistencies** - Synchronized version numbers and test counts across all markdown files
- **File structure accuracy** - Updated AGENTS.md to show current modular architecture

### Internal Refactoring

**Note:** All changes are 100% backward compatible with zero breaking changes. This release focuses on internal code quality, developer experience, and maintainability improvements.

#### Statistics

- **Total lines:** 4,555 lines of TypeScript
- **Files reduced:** 2 large files split into 14 focused modules
- **Type safety:** 100% (zero `any` types)
- **Test coverage:** 558 tests, 39.63% overall (91% utilities, 73% services)
- **Build status:** ✅ Successful (zero errors)
- **Backward compatibility:** ✅ 100% maintained

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
- Cards use `display: inline-block` for inline mode, allowing text flow but preventing mid-card wrapping

### Fixed

- Cursor-aware previews now work correctly in all scenarios
- Preview rendering performance improved for large documents
