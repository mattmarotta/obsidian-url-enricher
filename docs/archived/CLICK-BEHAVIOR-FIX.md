# Click Behavior Fix

## Problem

When clicking on a card or bubble preview, the decoration would disappear and the cursor would move into the URL for editing. This happened because:

1. CodeMirror was intercepting the `mousedown` event
2. The cursor would move to the click position (inside the URL range)
3. When cursor enters the URL range, decorations are hidden (by design, to allow editing)

## Expected Behavior

- **Clicking card/bubble** → Opens URL in new tab
- **Clicking URL text** (in card mode) → Allows editing the URL
- Preview should **not disappear** when clicked

## Solution

### 1. Added `mousedown` Event Handler

Prevent `mousedown` from propagating to CodeMirror:

```typescript
// In UrlPreviewWidget.toDOM()
container.onmousedown = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

// Handle click to open URL
container.onclick = (e) => {
  e.preventDefault();
  e.stopPropagation();
  window.open(this.url, "_blank");
};
```

### 2. Updated `ignoreEvent()` Method

Tell CodeMirror to ignore mouse events on the widget:

```typescript
// In UrlPreviewWidget
ignoreEvent(event: Event): boolean {
  // Ignore mouse events to prevent CodeMirror from handling clicks on the widget
  // This prevents the cursor from moving into the URL when clicking the preview
  return event.type === "mousedown" || event.type === "click";
}
```

### 3. Applied to All Widgets

Updated both widgets that should be clickable:

- **`UrlPreviewWidget`** - Main preview cards and bubbles
- **`SmallUrlWidget`** - Small URL widget (if used)

The **`ErrorIndicatorWidget`** already had `ignoreEvent()` returning `true` (ignores all events), which is correct since it's not interactive.

## How It Works

### Widget Event Handling in CodeMirror 6

CodeMirror widgets have an `ignoreEvent()` method that controls event handling:

- **Return `true`**: Widget handles the event, CodeMirror ignores it
- **Return `false`**: CodeMirror handles the event (default behavior)

### Mouse Event Flow

1. **User clicks preview card/bubble**
2. **`mousedown` event fires** → Widget's `onmousedown` handler:
   - Calls `e.preventDefault()` - Prevents default browser behavior
   - Calls `e.stopPropagation()` - Stops event from bubbling up
   - `ignoreEvent()` returns `true` - Tells CodeMirror to ignore this event
3. **`click` event fires** → Widget's `onclick` handler:
   - Opens URL in new tab
   - `ignoreEvent()` returns `true` - CodeMirror ignores this too
4. **Cursor stays in place** - CodeMirror never sees the click

### URL Text Editing (Card Mode)

In card mode, the URL text below the card is:
- **Not part of the widget** - It's the original markdown text
- **Styled with `Decoration.mark()`** - Visual styling only
- **Fully editable** - Clicking it works normally

So the behavior is:
- Click **card preview** → Opens URL (widget handles it)
- Click **URL text below** → Edit URL (CodeMirror handles it)

## Before vs After

### Before (Broken)
```
User clicks card
  ↓
mousedown propagates to CodeMirror
  ↓
CodeMirror moves cursor into URL range
  ↓
Decoration detects cursor in range
  ↓
Decoration disappears (skip rendering)
  ↓
User sees URL text instead of preview
```

### After (Fixed)
```
User clicks card
  ↓
Widget's mousedown handler fires
  ↓
e.preventDefault() + e.stopPropagation()
  ↓
ignoreEvent() returns true
  ↓
CodeMirror ignores the event
  ↓
Cursor doesn't move
  ↓
Widget's onclick handler fires
  ↓
URL opens in new tab
  ↓
Preview stays visible
```

## Testing

### Test Cases

1. **Click card preview** ✓
   - Should open URL in new tab
   - Preview should remain visible
   - Cursor should not move

2. **Click bubble preview** ✓
   - Should open URL in new tab
   - Preview should remain visible
   - Cursor should not move

3. **Click URL text (card mode)** ✓
   - Should allow editing
   - Cursor should move to clicked position
   - User can modify URL

4. **Hover over preview** ✓
   - Should show hover styles (Material Design elevation)
   - Cursor should show pointer

5. **Click between text and preview** ✓
   - Should work normally for text editing

## Related Code

### Files Modified
- `src/editor/urlPreviewDecorator.ts`

### Methods Changed
- `UrlPreviewWidget.toDOM()` - Added `onmousedown` handler
- `UrlPreviewWidget.ignoreEvent()` - Returns `true` for mouse events
- `SmallUrlWidget.toDOM()` - Added `onmousedown` handler
- `SmallUrlWidget.ignoreEvent()` - Returns `true` for mouse events

## CodeMirror 6 Documentation

Reference: [CodeMirror 6 - Widget Type](https://codemirror.net/docs/ref/#view.WidgetType)

Key points:
- `ignoreEvent()` controls whether widget or editor handles events
- Returning `true` gives full control to the widget
- Widget must provide its own event handlers when ignoring events
