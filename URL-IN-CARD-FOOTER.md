# URL in Card Footer Implementation

## Changes Made

Modified the card preview style to display the URL at the bottom of the card instead of showing it as a small URL before the card.

## Technical Changes

### 1. Updated `urlPreviewDecorator.ts`

**UrlPreviewWidget.toDOM() method:**
- Added a URL footer section at the bottom of card previews
- The footer includes:
  - Top border separator (1px solid border)
  - URL text in small, muted styling
  - Proper spacing and padding
  - Word-break handling for long URLs

**Decoration logic:**
- Changed card decoration from using `SmallUrlWidget` + widget to using a single `Decoration.replace()`
- Both bubbles and cards now use the same replacement strategy
- Cards now completely hide the original URL and show it inside the card footer

### 2. Updated `styles.css`

Added new styling for `.inline-url-preview__url-footer`:
- Font size: 0.75em (small, readable size)
- Color: `var(--text-faint)` with 0.7 opacity
- Top border separator using theme color
- Word-break: break-all (handles long URLs gracefully)
- Hover effect: opacity increases to 0.9
- Smooth transition for hover state

## Visual Design

The URL footer follows Material Design principles:
- **Separation**: Clear visual separator with subtle border
- **Hierarchy**: Small size and muted color indicate secondary information
- **Interaction feedback**: Opacity increase on hover provides subtle feedback
- **Typography**: Consistent with other card elements
- **Spacing**: Proper padding and margin maintain 8dp grid

## User Experience

**Before:**
```
https://example.com/some-long-url  [Card with title and description]
```

**After:**
```
[Card with:
  - Favicon + Title (header)
  - Description (body)
  - ─────────────────
  - URL (footer)]
```

## Benefits

1. **Cleaner layout**: URL is part of the card, not floating before it
2. **Better context**: URL is visible but doesn't interfere with content
3. **Consistent design**: All card information in one unified element
4. **Editable source**: Original URL in markdown remains untouched (non-destructive)
5. **Hover feedback**: URL becomes more visible on hover for copying

## Testing

After building, test with various URLs:
- Short URLs (https://google.com)
- Long URLs (https://example.com/very/long/path/to/resource)
- URLs with parameters (https://site.com?query=123&foo=bar)
- Reddit posts (with special card formatting)
- Wikipedia articles (with custom metadata)

**Remember to clear cache** if testing changes to existing previewed URLs:
Settings → Inline Link Preview → Clear cache

## Compatibility

- ✅ Works with all preview styles (only applies to cards)
- ✅ Compatible with frontmatter configuration
- ✅ Maintains non-destructive principle
- ✅ Works with both inline and block display modes
- ✅ Supports all color modes and custom colors
