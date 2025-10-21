# Description Length Settings Fix

## Problem

The plugin had three description length settings, but they weren't working correctly:

1. **`cardDescriptionLength`** (200 chars) - Intended for card previews
2. **`bubbleDescriptionLength`** (100 chars) - Intended for bubble previews  
3. **`maxDescriptionLength`** (60 chars) - Legacy setting

### Issues Found

- **Bubble setting did nothing**: All previews (both card and bubble) were truncated using `bubbleDescriptionLength`
- **Card setting only worked for Reddit**: The `cardDescriptionLength` was only used in the Reddit metadata handler, not for general truncation
- **Root cause**: Description truncation happened BEFORE the preview style (card vs bubble) was determined, so it couldn't apply the correct length
- **Legacy setting unused**: `maxDescriptionLength` wasn't being used anywhere and was just confusing

## Solution

### 1. Fixed Truncation Logic Order

**Before:**
```typescript
// Line 505: Truncation happens here
const limitInput = settings.bubbleDescriptionLength; // Always bubble length!
// ... truncate description ...

// Line 397: Preview style determined later
const previewStyle = pageConfig.previewStyle ?? settings.previewStyle;
```

**After:**
```typescript
// Line 397: Preview style determined first
const previewStyle = pageConfig.previewStyle ?? settings.previewStyle;

// Line 505: Truncation uses correct length based on style
const limitInput = (previewStyle === "card" 
    ? settings.cardDescriptionLength 
    : settings.bubbleDescriptionLength);
```

### 2. Removed Legacy Setting

Removed `maxDescriptionLength` from:
- Interface definition (`InlineLinkPreviewSettings`)
- Default settings (`DEFAULT_SETTINGS`)
- Settings UI (removed the "Legacy description length" input)
- Normalization logic in `main.ts`

### 3. Added Proper Normalization

Added validation for both card and bubble lengths:

```typescript
private normalizeSettings(): void {
    const numericCardLength = Number(this.settings.cardDescriptionLength);
    this.settings.cardDescriptionLength = Number.isFinite(numericCardLength)
        ? Math.max(0, Math.round(numericCardLength))
        : DEFAULT_SETTINGS.cardDescriptionLength;

    const numericBubbleLength = Number(this.settings.bubbleDescriptionLength);
    this.settings.bubbleDescriptionLength = Number.isFinite(numericBubbleLength)
        ? Math.max(0, Math.round(numericBubbleLength))
        : DEFAULT_SETTINGS.bubbleDescriptionLength;
    // ...
}
```

## How It Works Now

### Card Mode (`previewStyle: "card"`)
- Uses `cardDescriptionLength` setting (default: 200 characters)
- Applies to: title + " — " + description combined
- If combined length exceeds limit, truncates description
- Minimum description: 10 chars (after title), otherwise hidden

### Bubble Mode (`previewStyle: "bubble"`)
- Uses `bubbleDescriptionLength` setting (default: 100 characters)
- Applies to: title + " — " + description combined
- If combined length exceeds limit, truncates description
- Minimum description: 10 chars (after title), otherwise hidden

### Truncation Logic
```typescript
const limit = previewStyle === "card" 
    ? cardDescriptionLength 
    : bubbleDescriptionLength;

const combined = `${title} — ${description}`;
if (combined.length > limit) {
    const titleLength = title.length + 3; // " — "
    const remainingLength = limit - titleLength;
    if (remainingLength > 10) {
        description = truncate(description, remainingLength);
    } else {
        description = null; // Not enough space
    }
}
```

### Special Cases

**Reddit:**
- Reddit handler already creates structured content with markers
- Handler uses `cardDescriptionLength` for the content portion
- Decorator parses markers and displays appropriately
- Bubble mode only shows title (no content), so bubble length doesn't apply to Reddit content

**Wikipedia:**
- Wikipedia handler fetches descriptions via API
- Returns description to decorator
- Decorator applies card/bubble truncation normally

**General sites:**
- Metadata extracted from meta tags
- Returns title + description
- Decorator applies card/bubble truncation normally

## Testing

To verify the fix works:

### Test Card Length
1. Set **Card description length** to 50
2. Create a note with a URL (non-Reddit)
3. Set preview style to **card**
4. Clear cache (Settings → Inline Link Preview → Clear cache)
5. View the preview
6. Description should be truncated to fit within 50 total chars (including title)

### Test Bubble Length
1. Set **Bubble description length** to 30
2. Create a note with the same URL
3. Set preview style to **bubble**
4. Clear cache
5. View the preview
6. Description should be truncated to fit within 30 total chars (including title)

### Verify Independence
- Changing card length should NOT affect bubble previews
- Changing bubble length should NOT affect card previews
- Each style uses its own setting

## Migration

**Existing users with `maxDescriptionLength`:**
- Setting will be ignored (no longer in interface)
- Default values will be used: 200 (card), 100 (bubble)
- Users should configure new settings if they want custom lengths
- No data loss - just ignored

**Users who already set card/bubble lengths:**
- Settings will now work correctly
- Bubble length will finally take effect
- Card length will work for all sites, not just Reddit

## Files Modified

1. **`src/editor/urlPreviewDecorator.ts`**:
   - Moved truncation logic after preview style determination
   - Added conditional logic to use card vs bubble length
   - Lines 505-520: Changed from always using bubbleDescriptionLength to using the appropriate length based on preview style

2. **`src/settings.ts`**:
   - Removed `maxDescriptionLength` from interface
   - Removed `maxDescriptionLength` from defaults
   - Removed "Legacy description length" setting UI
   - Lines 9-29: Interface and defaults cleaned up
   - Lines 210-230: Removed legacy setting UI

3. **`src/main.ts`**:
   - Removed `maxDescriptionLength` normalization
   - Added `cardDescriptionLength` normalization
   - Added `bubbleDescriptionLength` normalization
   - Lines 103-117: Updated normalizeSettings() method

## Benefits

✅ **Card length setting now works** for all sites, not just Reddit
✅ **Bubble length setting now works** as intended
✅ **Each style is independent** - changing one doesn't affect the other
✅ **Removed confusion** - no more deprecated/unused legacy setting
✅ **Proper defaults** - 200 for cards (more context), 100 for bubbles (compact)
✅ **Validation** - both settings are normalized and validated

## Impact

- Users can now properly control description lengths for each preview style
- Settings UI is cleaner (one less confusing option)
- Code is more maintainable (removed unused functionality)
- Behavior matches user expectations and documentation
