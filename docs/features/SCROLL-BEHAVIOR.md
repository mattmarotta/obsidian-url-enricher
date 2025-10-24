# Scroll Behavior When Toggling View Modes

## Overview

When switching between **Source Mode** and **Live Preview Mode**, you may notice that the page scroll position shifts, especially when you have multiple card previews visible. This is **expected and standard behavior** for Obsidian plugins that use Live Preview decorations.

## Why This Happens

### Technical Explanation

1. **Live Preview Decorations**: Card previews are rendered as CodeMirror 6 decorations that are dynamically added to the editor view
2. **Height Changes**: Cards add significant height to the document compared to plain URLs:
   - Plain URL: `https://example.com` = 1 line (~20px)
   - Card preview with title, description, and URL = ~4-6 lines (~80-120px)
3. **Mode Switching**: 
   - **Source Mode**: All decorations are removed (`isLivePreview` returns `false`)
   - **Live Preview Mode**: Decorations are added back
4. **Viewport Adjustment**: When decorations are added/removed, the document height changes dramatically, but CodeMirror maintains the **character position** rather than the **visual scroll position**

### Example Impact

With 10 card previews on a page:
- **Source Mode height**: ~200px (10 URLs × ~20px each)
- **Live Preview height**: ~1000px (10 cards × ~100px each)
- **Height difference**: ~800px of added content

When you toggle from Live Preview to Source Mode while scrolled down, the viewport tries to maintain your cursor position by character offset, which may require scrolling to see the actual content you were viewing.

## This is Standard Obsidian Behavior

**All plugins** that add Live Preview decorations exhibit this behavior:
- Dataview (inline queries)
- Excalidraw (embedded drawings)
- Tasks (task query blocks)
- Any plugin using CodeMirror decorations

Obsidian doesn't provide a built-in mechanism to preserve exact visual scroll position across mode changes because:
1. The content structure is fundamentally different between modes
2. Height calculations would need to account for all decorations from all plugins
3. Users typically switch modes to edit specific content (where cursor position matters more)

## User Strategies

### 1. **Use Cursor Position as Anchor** (Recommended)
- Place your cursor on the line you want to view
- Toggle modes
- The cursor line will remain visible (though scroll position may shift)

### 2. **Quick Navigation After Toggle**
- **Jump to top**: `Ctrl/Cmd + Home`
- **Jump to bottom**: `Ctrl/Cmd + End`
- **Search for content**: `Ctrl/Cmd + F`

### 3. **Work in One Mode**
- Edit primarily in Source Mode for raw markdown
- View primarily in Live Preview for rendered previews
- Minimize mode switching during active editing

### 4. **Use Folding**
- Fold sections you're not working on
- Reduces total document height
- Makes mode switching less jarring

## Design Decisions to Minimize Impact

We've optimized the plugin to reduce scroll disruption:

### Compact Card Design
- **Reduced padding**: `0.875em × 1em` (down from `1.25em × 1.5em`)
- **Tighter margins**: `0.5em` vertical (down from `0.75em`)
- **Compact spacing**: 
  - Header margin: `0.5em` (down from `0.75em`)
  - URL margin: `0.5em` (down from `0.75em`)
  - Post title margin: `0.4em` (down from `0.5em`)
- **No separator line**: Removed horizontal border above URL to save vertical space

### Height Savings
Per card, these changes save approximately:
- Padding reduction: ~16px
- Margin reduction: ~8px  
- Spacing reductions: ~6px
- Border removal: ~1px
- **Total savings: ~31px per card** (~30% height reduction)

With 10 cards: **~310px less height added** compared to original design

### Visual Quality Maintained
Despite being more compact, cards still follow Material Design principles:
- Clear visual hierarchy
- Readable typography
- Proper touch targets
- Elegant hover states
- Sufficient breathing room

## Alternative: Inline Style

If scroll behavior is particularly disruptive for your workflow, consider using **Inline Style** instead:

```yaml
---
preview-style: inline  # More compact, less height impact
---
```

Inline previews:
- Add minimal height (similar to a line of text)
- Flow inline with content
- Still show rich metadata (title + description)
- Cause much less scroll disruption when toggling modes

Configure globally in: **Settings → URL Enricher → Preview Style**

## Technical Notes for Developers

### Why We Don't Implement Scroll Preservation

While technically possible to attempt scroll position preservation, we deliberately chose not to implement it because:

1. **Complexity**: Would require:
   - Tracking scroll position before mode change
   - Calculating height differences for all decorations
   - Coordinating with Obsidian's view lifecycle
   - Handling edge cases (partial viewport, folded sections)

2. **User Experience Concerns**:
   - May feel "jumpy" or disorienting
   - Different from standard Obsidian behavior
   - Could conflict with cursor position preservation
   - Unexpected for users familiar with other plugins

3. **Maintenance Burden**:
   - Fragile implementation dependent on Obsidian internals
   - Could break with Obsidian updates
   - Complex edge case handling

4. **Standard Practice**:
   - No other major Live Preview plugins implement this
   - Users are already familiar with current behavior
   - Consistency across plugins is valuable

### Current Implementation

```typescript
buildDecorations(view: EditorView): DecorationSet {
    const settings = getSettings();

    // Only show in Live Preview mode
    const isLivePreview = view.state.field(editorLivePreviewField);
    if (!isLivePreview) {
        return Decoration.none;  // Remove all decorations in Source Mode
    }
    
    // ... build and return decorations
}
```

This simple, clean approach:
- ✅ Reliable and maintainable
- ✅ Consistent with Obsidian patterns
- ✅ No unexpected behavior
- ✅ Minimal performance overhead

## Summary

**Scroll position changes when toggling modes are:**
- ✅ Expected behavior
- ✅ Consistent with Obsidian standards
- ✅ Present in all decoration-based plugins
- ✅ Minimized through compact card design

**Users can adapt by:**
- Using cursor position as reference point
- Minimizing mode switching during editing
- Using navigation shortcuts after toggling
- Choosing inline style for lighter visual impact

**We deliberately avoid** complex scroll preservation because it would:
- ❌ Add fragile complexity
- ❌ Create unexpected behavior
- ❌ Deviate from Obsidian standards
- ❌ Be difficult to maintain
