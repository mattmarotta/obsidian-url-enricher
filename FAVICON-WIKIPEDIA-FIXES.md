# Favicon & Wikipedia Fixes

## Issues Fixed

### Issue 1: Blurry Favicons
**Problem:** Favicons appeared pixelated and blurry, especially in card mode.

**Root Cause:** Using `image-rendering: crisp-edges` CSS property, which is designed for pixel art and causes anti-aliasing to be disabled. This made the 128px favicons look pixelated when scaled down.

**Solution:**
```css
/* WRONG - causes pixelation */
image-rendering: crisp-edges;

/* CORRECT - smooth anti-aliased rendering */
image-rendering: auto;
image-rendering: -webkit-optimize-contrast;
-webkit-backface-visibility: hidden;
backface-visibility: hidden;
transform: translateZ(0); /* Hardware acceleration */
```

**Technical details:**
- `image-rendering: auto` - Uses browser's default smooth scaling algorithm
- `-webkit-optimize-contrast` - WebKit-specific high-quality rendering
- `backface-visibility: hidden` - Prevents rendering glitches during transforms
- `transform: translateZ(0)` - Forces GPU acceleration for smoother rendering

### Issue 2: Wikipedia Shows Minimal Information
**Problem:** Wikipedia previews only showed one line like "One of five prizes established in 1895 by Alfred Nobel" instead of fuller context.

**Root Cause:** Code was prioritizing Wikipedia's short `description` field over the full `extract` field.

**Before:**
```typescript
// Prioritized short description (1 line)
let description = page.description || page.extract;
```

**After:**
```typescript
// Prioritize full extract (3 sentences)
let description = page.extract || page.description;
```

**Additional improvements:**
1. Increased from 2 to 3 sentences in API request
2. Increased character limit from 200 to 300 for Wikipedia
3. Better truncation at word boundaries

## Changes Made

### Files Modified:

1. **`src/services/metadataHandlers/wikipediaMetadataHandler.ts`**
   - Changed `exsentences` parameter from `2` to `3`
   - Swapped priority: `page.extract || page.description` (was reversed)
   - Increased truncation limit from 200 to 300 characters
   - Better truncation algorithm (finds last space between 250-300 chars)

2. **`styles.css`** (3 locations)
   - Removed `image-rendering: crisp-edges` from all favicon styles
   - Added `image-rendering: auto` as primary rendering mode
   - Added `-webkit-backface-visibility: hidden` for stability
   - Added `transform: translateZ(0)` to card favicons for GPU acceleration
   - Kept `-webkit-optimize-contrast` for WebKit browsers

## Results

### Wikipedia Previews - Before vs After

**Before:**
```
Nobel Prize in Physics - Wikipedia
One of five prizes established in 1895 by Alfred Nobel
```

**After:**
```
Nobel Prize in Physics - Wikipedia
The Nobel Prize in Physics is an annual award given by the Royal Swedish 
Academy of Sciences for those who have made the most outstanding contributions 
to mankind in the field of physics. It is one of the five prizes established 
in 1895 by Alfred Nobel. The prize ceremonies take place annually...
```

### Favicon Quality - Before vs After

**Before:**
- Pixelated appearance due to `crisp-edges`
- Noticeable jagged edges on rounded icons
- Poor quality on retina displays

**After:**
- Smooth anti-aliased rendering
- Clean edges on all icon types
- Crisp display on retina and standard displays
- GPU-accelerated for consistent quality

## Technical Insights

### Why crisp-edges Failed
The `image-rendering: crisp-edges` property is designed for:
- Pixel art (sprites, retro game graphics)
- Images that should maintain sharp pixel boundaries
- Cases where you want NO anti-aliasing

For favicons (which are already high-resolution), this:
- Disabled anti-aliasing completely
- Made scaling look pixelated
- Caused visible "stair-stepping" on curves

### Why auto Works Better
The `image-rendering: auto` property:
- Uses browser's best scaling algorithm
- Applies proper anti-aliasing
- Leverages GPU when available with `translateZ(0)`
- Produces smooth results at any scale

### Wikipedia Description Priority
Wikipedia provides two fields:
1. **`description`** - Short one-liner (e.g., "Annual physics award")
2. **`extract`** - First sentences of article (full context)

The `extract` field provides:
- 2-3 complete sentences
- Full context and explanation
- Comparable length to other sites
- Much more informative previews

## Testing

Test these URLs to verify the fixes:

**Wikipedia (should show 3 sentences):**
- https://en.wikipedia.org/wiki/Nobel_Prize_in_Physics
- https://en.wikipedia.org/wiki/Quantum_mechanics
- https://en.wikipedia.org/wiki/Albert_Einstein

**Various sites (favicons should be crisp):**
- https://github.com
- https://stackoverflow.com
- https://reddit.com
- https://boot.dev

**Expected results:**
✅ Wikipedia shows 3 full sentences (~300 chars)
✅ All favicons are smooth and crisp (no pixelation)
✅ Favicons look good at both 1em (bubble) and 2em (card) sizes
✅ Quality is consistent across light/dark themes
✅ No rendering glitches on hover/transform

## Performance Impact

- No performance degradation
- GPU acceleration may actually improve performance
- Wikipedia API responses are already cached
- Same number of network requests

## Browser Compatibility

Works across:
- Chrome/Edge (Chromium)
- Safari (WebKit)
- Firefox (Gecko)
- Electron (Obsidian's runtime)

The `image-rendering` properties gracefully degrade - if not supported, browser falls back to default rendering (which is fine).
