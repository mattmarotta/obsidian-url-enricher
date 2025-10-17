# Card URL Below Implementation

## Summary

Implemented the card-above-URL layout where the preview card appears **above** the URL, and the URL remains **fully editable** below the card.

## Visual Layout

### Before (Card with URL Inside)
```
┌─────────────────────────────────────┐
│ 🔥 Favicon    Page Title            │
│ Page description text...             │
│ https://example.com/page             │ ← URL inside card (not editable)
└─────────────────────────────────────┘
```

### After (Card Above URL)
```
┌─────────────────────────────────────┐
│ 🔥 Favicon    Page Title            │
│ Page description text...             │
└─────────────────────────────────────┘
https://example.com/page               ← URL below card (fully editable)
```

## Technical Implementation

### 1. Widget Changes (`UrlPreviewWidget`)

**Removed URL footer from card widget:**
```typescript
// Before: URL footer was added inside the card container
if (this.previewStyle === "card") {
  const urlFooter = document.createElement("div");
  urlFooter.className = "inline-url-preview__url-footer";
  urlFooter.textContent = this.url;
  container.appendChild(urlFooter);
}

// After: No URL footer in widget
// Note: URL footer removed - URL now appears below card as editable text
```

### 2. Decoration Logic Changes

**Changed from `Decoration.replace()` to `Decoration.widget()` + `Decoration.mark()`:**

```typescript
if (previewStyle === "card") {
  // Card mode: Show card ABOVE the URL, keep URL visible and editable
  const cardWidget = Decoration.widget({
    widget: new UrlPreviewWidget(url, title, description, faviconUrl, isLoading, previewStyle, displayMode, limit, error),
    side: -1, // Place widget BEFORE the URL
    block: displayMode === "block"
  });
  decorationsToAdd.push({ from: urlStart, to: urlStart, decoration: cardWidget });
  
  // Style the URL below the card to match previous card footer appearance
  const urlMark = Decoration.mark({
    class: "ilp-url-below-card",
    attributes: {
      style: `
        font-size: 0.75em;
        color: var(--text-faint);
        opacity: 0.7;
        font-family: var(--font-monospace);
        word-break: break-all;
        display: inline;
      `.replace(/\s+/g, ' ').trim()
    }
  });
  decorationsToAdd.push({ from: urlStart, to: urlEnd, decoration: urlMark });
} else {
  // Bubble mode: Replace URL with bubble (hide URL)
  const replacementWidget = Decoration.replace({
    widget: new UrlPreviewWidget(url, title, description, faviconUrl, isLoading, previewStyle, displayMode, limit, error),
  });
  decorationsToAdd.push({ from: urlStart, to: urlEnd, decoration: replacementWidget });
}
```

### 3. Key Parameters

- **`side: -1`**: Places the card widget **before** the URL position
- **`block: displayMode === "block"`**: Makes card take full line width in block mode
- **`Decoration.mark()`**: Styles the original URL text without hiding it
- **`from: urlStart, to: urlEnd`**: Mark decoration applies to the entire URL range

### 4. CSS Styling

Added `.ilp-url-below-card` class to style the URL:

```css
/* URL below card - styled to match previous card footer */
.ilp-url-below-card {
	font-size: 0.75em !important;
	color: var(--text-faint) !important;
	opacity: 0.7 !important;
	font-family: var(--font-monospace) !important;
	word-break: break-all !important;
	cursor: text !important;
	transition: opacity 0.15s ease !important;
}

.ilp-url-below-card:hover {
	opacity: 0.9 !important;
}
```

## Benefits

✅ **Full editability** - URL remains part of the markdown source and is fully editable  
✅ **Non-destructive** - No changes to markdown files  
✅ **Clear visual hierarchy** - Preview above, source below  
✅ **Consistent styling** - URL maintains same appearance as previous card footer  
✅ **Better UX** - Natural reading order (preview → source)  
✅ **Cursor behavior** - Can click into URL to edit without dismissing card  

## Display Mode Behavior

### Block Display Mode (Default)
```
Text before link.
┌─────────────────────────────────────┐
│ 🔥 Favicon    Page Title            │
│ Description text...                  │
└─────────────────────────────────────┘
https://example.com/path
Text after link.
```

### Inline Display Mode
```
Text before ┌───────────────┐
link.       │ 🔥 Page Title  │  https://example.com
            │ Description... │
            └───────────────┘  Text after link.
```

## Implementation Applied To

Updated decoration logic in **three places** for consistency:

1. **Wikilink URLs** (`[[https://...]]`)
2. **Markdown links** (`[text](https://...)`)
3. **Bare URLs** (`https://...`)

All three now use the same card-above-URL approach when `previewStyle === "card"`.

## Comparison with Bubble Mode

### Bubble Mode (Unchanged)
- Uses `Decoration.replace()` to **hide** the URL completely
- Shows compact bubble preview in place of URL
- URL not visible or editable while preview is showing

### Card Mode (New Behavior)
- Uses `Decoration.widget()` + `Decoration.mark()` to keep URL visible
- Shows prominent card preview **above** the URL
- URL remains fully editable below the card
- Styled to match previous card footer appearance

## Testing Checklist

- [x] Build succeeds without errors
- [ ] Card appears above URL in editor
- [ ] URL is visible and editable below card
- [ ] URL styling matches previous card footer (small, monospace, muted)
- [ ] Block display mode shows card and URL on separate lines
- [ ] Inline display mode flows card and URL with text
- [ ] Bubble mode still hides URLs (unchanged behavior)
- [ ] Clicking card opens URL in new tab
- [ ] Clicking URL allows editing
- [ ] Hover states work correctly

## Cache Clearing Reminder

After testing changes, remember to clear the cache:
1. Open **Settings → Inline Link Preview**
2. Click **Clear cache** button
3. Test with fresh URLs

This ensures you see the new layout without cached metadata interfering.
