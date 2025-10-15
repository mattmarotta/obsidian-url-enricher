# Frontmatter Support Implementation

## Summary

Implemented comprehensive frontmatter support for per-page configuration overrides and renamed color settings for clarity.

## Changes Made

### 1. Setting Rename: Bubble Color → Preview Color

**Rationale**: The "bubble color" setting actually applies to both bubble and card preview styles, so the name was misleading.

**Changes**:
- `bubbleColorMode` → `previewColorMode`
- `customBubbleColor` → `customPreviewColor`
- `BubbleColorMode` type → `PreviewColorMode` type
- Updated UI labels from "Preview bubble background" to "Preview background color"
- Updated descriptions to clarify it applies to "preview bubbles and cards"

**Files Updated**:
- `src/settings.ts` - Interface, defaults, UI labels, CSS update function
- `src/main.ts` - CSS update function

### 2. Frontmatter Support Implementation

**Supported Properties**:

| Property | Type | Values | Description |
|----------|------|--------|-------------|
| `preview-style` | string | `bubble`, `card` | Preview style |
| `preview-display` | string | `inline`, `block` | Display mode |
| `max-card-length` | number | 100-1000 | Max chars for cards |
| `max-bubble-length` | number | 50-500 | Max chars for bubbles |
| `show-favicon` | boolean | `true`, `false` | Show/hide favicons |
| `include-description` | boolean | `true`, `false` | Include descriptions |
| `url-display-mode` | string | `url-and-preview`, `preview-only`, `small-url-and-preview` | URL display |
| `preview-color-mode` | string | `none`, `grey`, `custom` | Background color mode |
| `custom-preview-color` | string | Hex color | Custom color value |

**Implementation Details**:

1. **Extended PageConfig interface** (`src/editor/urlPreviewDecorator.ts`):
   - Added optional properties for all frontmatter-configurable settings
   - Imported `PreviewColorMode` type

2. **Enhanced parsePageConfig() function**:
   - Parses all new frontmatter properties with validation
   - Number ranges validated (max-card-length: 100-1000, max-bubble-length: 50-500)
   - Boolean values parsed from "true"/"false" strings
   - Hex color validation for custom-preview-color (#RRGGBB format)
   - Case-insensitive parsing for all properties

3. **Settings Merge Logic**:
   - Created local variables in decorator that merge frontmatter → global settings
   - Frontmatter values take precedence when present
   - Falls back to global settings when frontmatter property is undefined
   - Applied merged settings throughout decoration logic

4. **Updated Decoration Logic**:
   - All preview rendering now uses merged settings (not direct `settings.XXX`)
   - Proper precedence: frontmatter overrides global for that page only
   - `keepEmoji` intentionally NOT exposed (global preference only)

### 3. Documentation

**Created FRONTMATTER-SUPPORT.md**:
- Comprehensive documentation of all supported properties
- Examples for each property
- Complete example showing multiple properties together
- Explanation of settings hierarchy
- Notes about validation and edge cases

**Updated README.md**:
- Enhanced "Per-Page Configuration" section with more examples
- Updated "Per-Page Overrides" section with complete property list
- Changed "Preview bubble background" to "Preview background color" in settings list
- Added link to FRONTMATTER-SUPPORT.md for detailed docs

## Testing

- ✅ Build succeeded with no TypeScript errors
- ✅ All settings renamed consistently across codebase
- ✅ Frontmatter parsing handles all supported properties with validation
- ✅ Settings merge logic properly prioritizes frontmatter over global settings

## Files Modified

1. `src/settings.ts` - Type rename, interface, defaults, UI
2. `src/main.ts` - CSS update function
3. `src/editor/urlPreviewDecorator.ts` - PageConfig interface, parsing, merge logic
4. `README.md` - Documentation updates
5. `FRONTMATTER-SUPPORT.md` - New comprehensive documentation

## Breaking Changes

**None for users**: The setting names changed in the codebase, but Obsidian's setting loading will migrate existing user settings automatically when they're first accessed. Users will see the new setting names in the UI but their preferences are preserved.

## Example Usage

```yaml
---
title: Research Notes
preview-style: card
preview-display: block
max-card-length: 400
show-favicon: true
include-description: true
url-display-mode: small-url-and-preview
preview-color-mode: grey
---

This page will use card-style previews with a maximum length of 400 characters.
```

## Future Enhancements

Possible future additions to frontmatter support:
- `keep-emoji` (if users request per-page emoji control)
- Domain-specific overrides (different settings for different URL domains)
- Preview templates or custom formatting

## Notes

- Settings hierarchy is clear: frontmatter → global settings
- All validation happens in parsePageConfig() to prevent invalid values
- Color settings now clearly indicate they apply to both bubbles and cards
- keepEmoji remains global-only as it's a personal preference, not contextual
