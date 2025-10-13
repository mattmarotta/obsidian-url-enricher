# URL Display Modes & Word Wrapping Implementation

## Summary

Implemented two major improvements to the dynamic preview mode:

1. **Removed CSS max-width constraint** - Description length is now controlled solely by the text setting with word-wrapping support
2. **Three URL display modes** - Users can choose how URLs appear in Live Preview

## Changes Made

### 1. Settings Updates (`src/settings.ts`)

**Added new type and setting:**
```typescript
export type UrlDisplayMode = "url-and-preview" | "preview-only" | "compact";

export interface InlineLinkPreviewSettings {
  // ... existing settings
  urlDisplayMode: UrlDisplayMode;
}
```

**New UI control:**
- Dropdown selector with three options
- Placed after "Dynamic preview mode" toggle
- Clear descriptions for each mode

### 2. URL Preview Decorator (`src/editor/urlPreviewDecorator.ts`)

**Updated UrlPreviewWidget class:**
- Added `url: string` parameter to constructor
- Added `displayMode: UrlDisplayMode` parameter
- Implemented `getCompactUrl()` method to shorten URLs intelligently
- Added compact mode rendering in `toDOM()`

**Updated decoration logic:**
- `preview-only` mode uses `Decoration.replace()` to hide the URL completely
- `url-and-preview` and `compact` modes use `Decoration.widget()` with `side: 1`
- Widget receives URL and display mode for proper rendering

### 3. Styling Updates (`styles.css`)

**Main container changes:**
```css
.inline-url-preview {
  /* REMOVED: max-width: 400px */
  /* REMOVED: white-space: nowrap */
  /* REMOVED: overflow: hidden */
  /* REMOVED: text-overflow: ellipsis */
  
  /* ADDED: */
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
```

**Text container changes:**
```css
.inline-url-preview__text {
  /* ADDED: */
  flex-wrap: wrap;
}

.inline-url-preview__description {
  /* REMOVED: overflow/ellipsis constraints */
  /* ADDED: */
  white-space: normal;
  word-wrap: break-word;
}
```

**New compact mode styles:**
```css
.inline-url-preview--compact {
  margin-left: 0;
  padding-left: 0.25em;
}

.inline-url-preview__compact-url {
  color: var(--text-faint);
  font-size: 0.85em;
  margin-right: 0.35em;
}
```

### 4. Documentation Updates

- **README.md**: Added detailed explanation of three display modes
- **DYNAMIC-PREVIEW-DEMO.md**: Comprehensive demo with examples of all modes
- **Test file**: Updated `createSettings()` helper

## Display Mode Behaviors

### URL + Preview (default)
```
https://example.com/page [🔖 Title — Description here...]
```
- Full URL visible
- Preview bubble appears after URL
- Best for maintaining full context

### Preview Only
```
[🔖 Title — Description here...]
```
- URL completely hidden in Live Preview
- Only the preview bubble is visible
- URL still exists in markdown source
- Still clickable and editable
- Cleanest reading experience

### Compact
```
example.com/… [🔖 Title — Description here...]
```
- Shows shortened domain name
- Strips `www.` prefix
- Adds `/…` if path exists
- Preview bubble follows
- Good balance between context and cleanliness

## Description Length Behavior

**Before:**
- Text limited by setting (e.g., 60 chars)
- CSS limited visual width to 400px
- No wrapping - text was cut off with ellipsis

**After:**
- Text limited only by setting
- No CSS width constraint
- Word-wrapping enabled
- Multi-line descriptions supported
- Users can set higher values (e.g., 120, 200) to see full descriptions

## Technical Implementation Details

### Replace vs Widget Decorations

**Preview Only mode** uses `Decoration.replace()`:
```typescript
const replacementWidget = Decoration.replace({
  widget: new UrlPreviewWidget(url, title, description, faviconUrl, isLoading, displayMode),
});
builder.add(urlStart, urlEnd, replacementWidget);
```
- Completely hides the URL text
- Widget appears in place of the URL
- URL still exists in the document state

**Other modes** use `Decoration.widget()`:
```typescript
const widget = Decoration.widget({
  widget: new UrlPreviewWidget(url, title, description, faviconUrl, isLoading, displayMode),
  side: 1, // Display after the URL
});
builder.add(urlEnd, urlEnd, widget);
```
- URL remains visible
- Widget appears after the URL
- Non-invasive decoration

### Smart URL Shortening

Compact mode intelligently shortens URLs:
```typescript
private getCompactUrl(): string {
  try {
    const parsed = new URL(this.url);
    const host = parsed.hostname.replace(/^www\./, "");
    
    if (parsed.pathname && parsed.pathname !== "/") {
      return `${host}/…`;
    }
    
    return host;
  } catch {
    return this.url.length > 30 ? this.url.slice(0, 30) + "…" : this.url;
  }
}
```
- Removes `www.` prefix
- Shows domain only for root URLs
- Adds `/…` for URLs with paths
- Fallback for invalid URLs

## User Benefits

1. **Flexible description length**: Users can now set 100+ character limits and see full descriptions with natural wrapping
2. **Clean reading experience**: Preview Only mode hides URLs completely for distraction-free reading
3. **Balanced view**: Compact mode provides context without clutter
4. **Full control**: Three distinct modes for different use cases and preferences
5. **Portable markdown**: All modes keep the actual URL in the source unchanged

## Testing

Build: ✅ PASSED
Tests: ✅ PASSED

Ready to use immediately!

## Future Enhancements

Potential additions:
- Custom wrapping width per user preference
- Hover state to show full URL in preview-only mode
- Animation transitions between display modes
- Per-link display mode overrides via syntax extension
