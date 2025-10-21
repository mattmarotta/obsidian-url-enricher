# Migration to Non-Destructive Plugin (v0.5.0)

## Overview

The Inline Link Preview plugin has been completely redesigned to be **100% non-destructive**. All features that modified markdown source files have been removed. The plugin now focuses exclusively on providing rich, dynamic preview decorations in Live Preview mode.

## What Changed

### Removed Features
1. ❌ **Convert links on paste** - No longer automatically converts pasted URLs
2. ❌ **Command palette commands** - Removed all conversion commands:
   - "Convert selection to inline preview"
   - "Convert existing links to inline previews…"
3. ❌ **Bulk conversion** - No more vault-wide URL conversion
4. ❌ **Progress indicators** - Removed floating progress bars

### New Features
1. ✅ **Card-style previews** - Prominent card layout with better visual hierarchy
2. ✅ **Inline/Block display modes** - Control whether previews flow with text or appear on new lines
3. ✅ **Per-page configuration** - Override settings using frontmatter:
   ```yaml
   ---
   preview-style: card    # or bubble
   preview-display: inline # or block
   ---
   ```
4. ✅ **Enhanced styling** - Better hover effects, responsive sizing, clearer visual design

## How It Works Now

### Basic Usage
1. Type or paste a bare URL in your note: `https://github.com`
2. In Live Preview mode, the URL automatically displays a rich preview
3. Your markdown source **never changes** - it remains as plain text
4. Click the preview to open the URL

### Configuration Hierarchy
1. **Global settings** - Default for all notes
2. **Frontmatter overrides** - Per-page customization

### Preview Styles

**Bubble Style** (default):
- Compact, subtle appearance
- Good for inline mentions
- Minimal visual weight

**Card Style**:
- Prominent, detailed layout
- Larger favicon (1.5em)
- Bold title with block display
- Better for featured links

### Display Modes

**Block Mode** (default):
- Previews appear on their own line
- Better separation from surrounding text
- Ideal for cards and prominent previews

**Inline Mode**:
- Previews flow with surrounding text
- Text before/after on the same line
- Better for subtle, contextual previews

### URL Display Modes

**Small URL + Preview** (default):
- Subtle, faded URL (75% size, 60% opacity)
- Preview bubble follows URL
- Best balance of context and readability

**Cards**:
- Small editable URL displayed with card preview
- More prominent, detailed preview with Material Design aesthetics
- Best for rich content and descriptions

**Bubbles**:
- URL completely hidden
- Only preview bubble visible
- Compact and clean reading experience

## Migration Guide

### If you were using "Convert on paste"
- **Action Required**: None! Just use the plugin as normal
- URLs will now show dynamic previews instead of being converted
- Your existing converted links will continue to work as regular markdown links

### If you were using bulk conversion commands
- **Action Required**: Your notes remain unchanged
- Previously converted links work as regular markdown links
- New URLs will show dynamic previews instead

### Settings Changes
- ✅ Kept: All preview appearance settings
- ✅ Kept: Favicon, emoji, description settings
- ❌ Removed: "Convert links on paste"
- ✅ Added: "Preview style" (bubble/card)
- ✅ Added: "Display mode" (inline/block)

## Benefits

1. **Portability** - Your markdown files are pure, portable text
2. **Safety** - No risk of corrupting notes with failed conversions
3. **Flexibility** - Change preview styles without touching source files
4. **Performance** - No vault-wide file modifications
5. **Reversibility** - Disable plugin and URLs remain as plain text

## Code Architecture

### Removed Files
- `src/editor/pastePreviewHandler.ts`
- `src/editor/urlListConverter.ts`
- `src/updater/bulkLinkPreviewUpdater.ts`
- `src/modals/bulkConversionModal.ts`
- `src/modals/fileSuggest.ts`
- `src/linkPreview/previewBuilder.ts`
- `src/linkPreview/previewFormatter.ts`
- `src/status/progressStatusManager.ts`
- `src/commands/index.ts`
- `tests/previewFormatter.spec.ts`

### Core Files
- `src/main.ts` - Plugin lifecycle (simplified)
- `src/settings.ts` - Settings UI with new options
- `src/editor/urlPreviewDecorator.ts` - Dynamic preview rendering (enhanced)
- `src/editor/faviconDecorator.ts` - Favicon decoration
- `src/services/linkPreviewService.ts` - Metadata fetching
- `src/services/faviconCache.ts` - Persistent caching

## Questions?

See:
- `README.md` - User-facing documentation
- `AGENTS.md` - Technical architecture and implementation details
- `CHANGELOG.md` - Detailed version history
