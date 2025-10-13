# Dynamic URL Preview Feature

## Overview

The dynamic URL preview feature provides a hybrid approach to link previews in Obsidian:

1. **Conversion Mode** (default): Paste a URL and it's automatically replaced with markdown `[Title — Description](url)`
2. **Dynamic Preview Mode** (new): URLs stay as plain text in source, but show rich inline previews in Live Preview

## Implementation

### New Files

- **`src/editor/urlPreviewDecorator.ts`**: CodeMirror 6 ViewPlugin that:
  - Detects bare URLs in the editor (excluding those already in markdown links)
  - Fetches metadata using the existing LinkPreviewService
  - Creates inline preview widgets showing title, description, and favicon
  - Only active when `dynamicPreviewMode` setting is enabled
  - Only displays in Live Preview mode (source mode shows raw URLs)

### Modified Files

1. **`src/main.ts`**:
   - Imported `createUrlPreviewDecorator`
   - Registered the URL preview decorator alongside favicon decorator

2. **`src/settings.ts`**:
   - Added `dynamicPreviewMode: boolean` to settings interface
   - Added toggle in settings UI
   - Added cache statistics display (domain count, oldest entry date)
   - Improved clear cache button to flush both memory and disk

3. **`styles.css`**:
   - Added `.inline-url-preview` styles for preview bubbles
   - Styled title (bold), description (muted), and separator
   - Added loading state styling
   - Made previews subtle with hover effect

4. **`tests/previewFormatter.spec.ts`**:
   - Added `dynamicPreviewMode: false` to test helper

5. **`README.md`**:
   - Documented hybrid approach
   - Explained difference between conversion and dynamic modes
   - Added cache management documentation

## How It Works

### URL Detection

The decorator uses a regex pattern to find bare URLs:
```typescript
const urlRegex = /(?<!\]\()(?:https?:\/\/[^\s)\]]+)(?!\))/g;
```

This negative lookback/lookahead ensures we don't decorate URLs already in markdown links.

### Preview Widget

The `UrlPreviewWidget` creates a small inline bubble with:
- **Favicon**: From persistent cache (Google's favicon service)
- **Title**: Sanitized page title or derived from hostname
- **Description**: Optional, truncated based on settings
- **Loading state**: Shows "Loading..." while fetching metadata

### Metadata Fetching

- Uses the existing `LinkPreviewService` for consistency
- Respects all existing settings (description length, emoji handling, etc.)
- Leverages the persistent favicon cache (30-day TTL)
- Batches updates with 100ms debounce to avoid excessive re-renders

### Performance

- **Origin-based caching**: One favicon fetch per domain (e.g., all Reddit links share one favicon)
- **Persistent cache**: Survives restarts, syncs across devices
- **Lazy fetching**: Only fetches metadata when URLs are in viewport
- **Efficient updates**: Batched re-renders to minimize DOM thrashing

## User Experience

### When Dynamic Mode is OFF (default)
- Paste behavior: URL → replaced with markdown link
- Viewing: Markdown links show favicons in Live Preview
- Source: Clean markdown `[Title — Description](url)`

### When Dynamic Mode is ON
- Paste behavior: Can still convert URLs to markdown (paste handler unchanged)
- Viewing: Bare URLs show inline preview bubbles in Live Preview
- Source: Plain URLs like `https://example.com` (portable, no embedded metadata)

### Hybrid Workflow
Users can:
1. Leave URLs bare for transient notes (dynamic previews show in Live Preview)
2. Convert important URLs to markdown for permanent, readable notes
3. Mix both approaches in the same note

## Cache Management

### Cache Statistics Display
Settings now show:
- **Cached domains**: Total count of unique origins with cached favicons
- **Oldest entry**: Date of the oldest cached favicon (helps understand cache age)
- Only displays when cache has data

### Clear Cache Button
Improved implementation:
```typescript
await this.plugin.faviconCache.clear();
await this.plugin.faviconCache.flush();
```
Clears both in-memory cache AND flushes to disk, ensuring complete cleanup.

## Technical Details

### Widget Rendering
```typescript
class UrlPreviewWidget extends WidgetType {
  toDOM(): HTMLElement {
    // Creates:
    // <span class="inline-url-preview">
    //   <img class="inline-url-preview__favicon" src="...">
    //   <span class="inline-url-preview__text">
    //     <span class="inline-url-preview__title">Title</span>
    //     <span class="inline-url-preview__separator"> — </span>
    //     <span class="inline-url-preview__description">Description</span>
    //   </span>
    // </span>
  }
}
```

### Decoration Placement
Widgets are placed with `side: 1` to appear **after** the URL:
```typescript
const widget = Decoration.widget({
  widget: new UrlPreviewWidget(title, description, faviconUrl, isLoading),
  side: 1, // Display after the URL
});
builder.add(urlEnd, urlEnd, widget);
```

### Text Processing
Uses the same sanitization pipeline as conversion mode:
- HTML entity decoding
- HTML tag stripping  
- Whitespace collapsing
- Emoji handling (respects `keepEmoji` setting)
- Truncation with ellipsis

## Future Enhancements

Potential improvements:
1. **Conversion command**: Add command to convert decorated URLs ↔ markdown links
2. **Customizable placement**: Option to show previews before/after/replace URLs
3. **Preview styling**: User-configurable colors, sizes, layouts
4. **Click behavior**: Different actions on click (open, copy, convert)
5. **Keyboard navigation**: Tab through previews, shortcut to convert
6. **Performance**: Virtual rendering for notes with hundreds of URLs

## Testing

To test the feature:

1. Enable "Dynamic preview mode" in plugin settings
2. Open `DYNAMIC-PREVIEW-DEMO.md` in Live Preview
3. Observe inline preview bubbles appearing after bare URLs
4. Toggle setting off to see plain URLs
5. Check that markdown links still work normally

## Compatibility

- **Mobile**: Fully compatible (uses same metadata service)
- **Sync**: Cache syncs across devices via Obsidian's data sync
- **Reading mode**: URLs render as normal links (no decorations)
- **Source mode**: Shows plain URLs without decorations
- **Export**: Source stays clean, exports as plain URLs
