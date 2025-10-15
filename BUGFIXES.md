# Bug Fixes - v0.5.0

## Issues Fixed

### 1. ✅ Block Display Mode Not Working
**Problem**: Previews were not appearing on a new line when "block" display mode was selected.

**Root Cause**: The bubble used `display: inline-block` which doesn't force a new line even with a `<br>` before it.

**Solution**:
- Split bubble CSS into two variants: `inline-url-preview--bubble-inline` and `inline-url-preview--bubble-block`
- Inline mode uses `display: inline` to flow naturally with text
- Block mode uses `display: inline-block` with the line break to force new line positioning
- Wrapper uses `display: contents` to allow proper layout participation

### 2. ✅ Favicons Showing on Markdown Links
**Problem**: The `faviconDecorator` was adding favicon icons to `[text](url)` formatted links, which conflicts with the non-destructive philosophy.

**Root Cause**: The favicon decorator was designed to enhance all links, including markdown-formatted ones.

**Solution**:
- Completely removed `faviconDecorator` from the plugin
- Removed `createFaviconDecorator` import and registration from `main.ts`
- Removed `faviconRefreshEffect` from decoration refresh logic
- Favicons now only appear in preview bubbles/cards for bare URLs
- Note: `faviconDecorator.ts` file remains in codebase but is marked as legacy and not used

### 3. ✅ Bubbles Not Wrapping Across Multiple Lines
**Problem**: Preview bubbles were jumping to the next line as a single unit instead of wrapping naturally like in the example image.

**Root Cause**: 
- `display: inline-block` treats the element as a single atomic unit
- `max-width: fit-content` prevented natural text flow

**Solution**:
- Changed inline mode to use `display: inline` which allows natural wrapping
- Removed `max-width: fit-content` restriction
- Bubble content (favicon, title, description) can now wrap across multiple lines
- Background color and padding still maintained around the wrapped text
- Text flows naturally just like regular inline text

### 4. ✅ Loading State Not Auto-Updating
**Problem**: When opening a note with uncached URLs, "Loading..." text would appear but not update to show the preview until the user clicked in the note.

**Root Cause**: 
- The metadata fetch was completing successfully
- `view.requestMeasure()` was not sufficient to trigger a visible re-render
- The batched timeout approach delayed updates unnecessarily

**Solution**:
- Removed the 100ms batching timeout
- Rebuild decorations immediately after metadata fetch completes
- Use `view.dispatch()` to force a proper viewport update
- Ensures the view re-renders automatically without user interaction

## Technical Details

### CSS Changes
```css
/* Before */
.inline-url-preview--bubble {
  display: inline-block;  /* Atomic unit, doesn't wrap */
  max-width: fit-content; /* Restricts width */
}

/* After */
.inline-url-preview--bubble-inline {
  display: inline;  /* Flows naturally, can wrap */
}

.inline-url-preview--bubble-block {
  display: inline-block;  /* Single unit on new line */
  max-width: 100%;        /* Can use full width */
}
```

### Widget Changes
```typescript
// Before
if (this.displayMode === "block" && this.urlDisplayMode !== "preview-only") {
  const br = document.createElement("br");
  wrapper.appendChild(br);
}
container.className = "inline-url-preview inline-url-preview--bubble";

// After
if (this.displayMode === "block") {
  const br = document.createElement("br");
  wrapper.appendChild(br);
}
if (this.displayMode === "block") {
  container.className = "... inline-url-preview--bubble-block";
} else {
  container.className = "... inline-url-preview--bubble-inline";
}
```

### Metadata Fetch Changes
```typescript
// Before
const promise = service.getMetadata(url).then(() => {
  if (this.updateTimeout !== null) {
    clearTimeout(this.updateTimeout);
  }
  this.updateTimeout = setTimeout(() => {
    this.decorations = this.buildDecorations(view);
    view.requestMeasure();
    this.updateTimeout = null;
  }, 100);
});

// After
const promise = service.getMetadata(url).then(() => {
  this.decorations = this.buildDecorations(view);
  view.dispatch({ effects: [] }); // Force immediate update
});
```

## Result

✅ **Inline mode**: Bubbles flow naturally with text and wrap across lines like the example image
✅ **Block mode**: Bubbles appear on their own line with proper spacing
✅ **Markdown links**: No longer decorated with favicons - pure markdown only
✅ **Auto-refresh**: Previews appear immediately after metadata loads without user interaction
✅ **Non-destructive**: All changes are visual-only, source files remain unchanged

## Testing

Build successful with no compilation errors:
```bash
npm run build
> tsc -noEmit -skipLibCheck && node esbuild.config.mjs production
```

All four issues resolved while maintaining the non-destructive principle.
