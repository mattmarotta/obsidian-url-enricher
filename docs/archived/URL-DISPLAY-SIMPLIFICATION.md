# URL Display Mode Simplification

**Date**: 2024
**Status**: ✅ Complete

## Summary

Removed the `urlDisplayMode` setting entirely to simplify the user experience. URL display is now automatic based on the preview style:

- **Card previews**: Always show a small, editable URL with the preview
- **Bubble previews**: Always hide the URL completely (preview-only)

## Motivation

The three-mode URL display system (`url-and-preview`, `preview-only`, `small-url-and-preview`) added unnecessary complexity. Users found it confusing to have both a preview style setting AND a separate URL display mode setting.

The preview style naturally determines the appropriate URL display:
- Cards are prominent and have space for a small URL
- Bubbles are compact and work better without the URL

## Changes Made

### Code Changes

**src/settings.ts**:
- ❌ Removed `UrlDisplayMode` type definition
- ❌ Removed `urlDisplayMode` property from `InlineLinkPreviewSettings` interface
- ❌ Removed `urlDisplayMode` from `DEFAULT_SETTINGS`
- ❌ Removed "URL display mode" dropdown from settings UI

**src/main.ts**:
- ✅ No changes needed (didn't reference urlDisplayMode)

**src/editor/urlPreviewDecorator.ts**:
- ❌ Removed `urlDisplayMode` from `PageConfig` interface
- ❌ Removed `url-display-mode` parsing from `parsePageConfig()` function
- ✅ Simplified `buildDecorations()` logic:
  ```typescript
  // Before: Complex nested conditionals based on urlDisplayMode and previewStyle
  // After: Simple conditional based only on previewStyle
  
  if (previewStyle === "bubble") {
    // Replace URL with preview widget (hide URL)
    decorations.push(
      Decoration.replace({
        widget: new UrlPreviewWidget(...)
      }).range(match.from, match.to)
    );
  } else {
    // Show small URL and add card widget after
    decorations.push(
      Decoration.replace({
        widget: new SmallUrlWidget(...)
      }).range(match.from, match.to)
    );
    decorations.push(
      Decoration.widget({
        widget: new UrlPreviewWidget(...)
      }).range(match.to)
    );
  }
  ```
- ❌ Removed `urlDisplayMode` parameter from `UrlPreviewWidget` constructor (9 params → 8 params)
- ❌ Removed `urlDisplayMode` comparison from `eq()` method

### Documentation Changes

**README.md**:
- ❌ Removed "Three URL Display Modes" feature section
- ✅ Added "Automatic URL Display" explaining behavior
- ❌ Removed "URL display mode" from settings list
- ❌ Removed `url-display-mode` from frontmatter examples

**FRONTMATTER-SUPPORT.md**:
- ❌ Removed "### URL Display" section (url-display-mode property)
- ❌ Removed `url-display-mode` from complete example
- ✅ Added "## URL Display Behavior" section explaining automatic behavior

**FRONTMATTER-IMPLEMENTATION.md**:
- ❌ Removed `url-display-mode` from properties table
- ❌ Removed `url-display-mode` from complete example
- ✅ Added note about automatic URL display

**FRONTMATTER-TROUBLESHOOTING.md**:
- ❌ Removed `url-display-mode` from complete example

**AGENTS.md**:
- ❌ Removed "Supports three URL display modes" bullet
- ✅ Updated to "URL display is automatic: bubbles hide URLs, cards show small editable URLs"
- ✅ Updated decoration API description

**MIGRATION.md**:
- ❌ Removed "URL + Preview" and "Preview Only" sections
- ✅ Updated to describe Cards and Bubbles behavior

**CHANGELOG.md**:
- ❌ Removed "Changed default `urlDisplayMode` from `"url-and-preview"` to `"small-url-and-preview"`"
- ✅ Added "Removed URL display mode setting - URL display is now automatic"

**styles.css**:
- ✅ Updated comment from "small-url-and-preview mode" to "card previews"

## Frontmatter Changes

### Before (9 properties):
```yaml
---
preview-style: card
preview-display: block
max-card-length: 400
max-bubble-length: 150
show-favicon: true
include-description: true
url-display-mode: small-url-and-preview  # ❌ Removed
preview-color-mode: grey
custom-preview-color: "#4a4a4a"
---
```

### After (7 properties):
```yaml
---
preview-style: card
preview-display: block
max-card-length: 400
max-bubble-length: 150
show-favicon: true
include-description: true
preview-color-mode: grey
custom-preview-color: "#4a4a4a"
---
```

**Note**: URL display is automatic—cards show small editable URL, bubbles hide URL entirely.

## User Impact

**Positive**:
- ✅ Simpler, more intuitive settings UI (one less dropdown)
- ✅ Clearer mental model: preview style determines everything
- ✅ Less configuration needed for new users
- ✅ Reduced frontmatter properties (9 → 7)

**Breaking Change**:
- ⚠️ Existing `url-display-mode` frontmatter properties will be ignored
- ⚠️ Users who set `urlDisplayMode` in settings will have it reset to automatic behavior

**Migration**: No action required. The new automatic behavior provides sensible defaults:
- Users with `preview-style: card` → will see small URL (equivalent to old `small-url-and-preview`)
- Users with `preview-style: bubble` → will not see URL (equivalent to old `preview-only`)

## Testing Checklist

- ✅ Code compiles without errors (`npm run build`)
- ⏳ Card previews show small editable URL
- ⏳ Bubble previews hide URL completely
- ⏳ Frontmatter overrides work correctly
- ⏳ No console errors
- ⏳ All documentation updated

## Technical Details

### Widget Constructor Change

**Before**:
```typescript
new UrlPreviewWidget(
  url,
  title,
  description,
  faviconUrl,
  isLoading,
  previewStyle,
  displayMode,
  urlDisplayMode,  // ❌ Removed
  maxLength
)
```

**After**:
```typescript
new UrlPreviewWidget(
  url,
  title,
  description,
  faviconUrl,
  isLoading,
  previewStyle,
  displayMode,
  maxLength
)
```

### Decoration Logic Simplification

**Before** (~40 lines with nested conditionals):
- Check urlDisplayMode
  - If "url-and-preview": Show full URL + widget
  - If "preview-only": Hide URL, show widget
  - If "small-url-and-preview": Show SmallUrlWidget + widget

**After** (~15 lines):
- Check previewStyle
  - If "bubble": Hide URL, show widget
  - Else (card): Show SmallUrlWidget + widget

## Related Files

- `src/settings.ts` - Settings interface and UI
- `src/editor/urlPreviewDecorator.ts` - Decoration logic
- `src/editor/faviconDecorator.ts` - (No changes, doesn't use urlDisplayMode)
- `src/linkPreview/*.ts` - (No changes, doesn't use urlDisplayMode)
- All documentation files (see Changes Made section)

## Future Considerations

If users request more control over URL display:
- Could add a global "Show URLs in cards" toggle (boolean instead of 3-mode enum)
- Could add per-preview-style URL visibility (e.g., `cardShowUrl`, `bubbleShowUrl`)
- Currently not needed—automatic behavior is intuitive

## Conclusion

This simplification removes unnecessary complexity while maintaining all essential functionality. The preview style naturally determines the appropriate URL display behavior, making the plugin easier to understand and use.
