# Card Improvements & Wikipedia Support

## Summary

Enhanced card styling to match Trello-style design, fixed blurry favicons by using high-resolution images, and added Wikipedia metadata handler for complete article previews.

## Changes Made

### 1. High-Resolution Favicons (`linkPreviewService.ts`)

**Problem:** Favicons appeared blurry in card mode, especially on retina displays.

**Previous behavior:**
- Requested 32px favicons from Google
- Small images scaled up looked pixelated

**New behavior:**
- Requests 128px favicons from Google's service
- High-resolution images scale down cleanly
- CSS uses proper image rendering for crispness

```typescript
// Now requests 128px for high quality
const params = new URLSearchParams({ 
  domain: host,
  sz: "128"
});
```

**CSS improvements:**
```css
/* Smooth high-quality rendering - NOT crisp-edges which causes pixelation */
image-rendering: auto;
image-rendering: -webkit-optimize-contrast;
-webkit-backface-visibility: hidden;
backface-visibility: hidden;
/* Force hardware acceleration for smoother rendering */
transform: translateZ(0);
```

**Key insight:** Using `crisp-edges` on small images causes pixelation. Using `auto` with hardware acceleration provides smooth, anti-aliased rendering.

### 2. Wikipedia Metadata Handler (`wikipediaMetadataHandler.ts`)

**Problem:** Wikipedia pages only showed titles, no descriptions.

**Solution:** Created dedicated handler that queries Wikipedia API.

**Implementation:**
- Extracts article title from URL path (`/wiki/Article_Title`)
- Queries MediaWiki API with proper parameters:
  - `prop=extracts|description` - Get both extract and short description
  - `exintro=1` - Only intro section (not entire article)
  - `explaintext=1` - Plain text (no HTML/markdown)
  - `exsentences=3` - First 3 sentences for richer context
- **Prioritizes full extract over short description** for more informative previews
- Truncates long extracts to ~300 characters (vs 200 for other sites)

**API endpoint format:**
```
https://en.wikipedia.org/w/api.php?
  action=query
  &format=json
  &titles=Article_Title
  &prop=extracts|description
  &exintro=1
  &explaintext=1
  &exsentences=2
  &origin=*
```

**Example results:**
- **Nobel Prize in Physics** → "The Nobel Prize in Physics is an annual award given by the Royal Swedish Academy of Sciences for those who have made the most outstanding contributions to mankind in the field of physics. It is one of the five prizes established in 1895 by Alfred Nobel..."
- **Quantum Mechanics** → Full 3-sentence intro explaining the theory, its applications, and historical development

### 3. Trello-Style Card Design (`styles.css`)

**Design improvements to match Trello cards:**

1. **Refined Elevation**
   - Subtle shadows at rest: `0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.1)`
   - More prominent on hover: `0 2px 4px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.12)`
   - Reduced transform on hover: `translateY(-1px)` (was -2px)

2. **Border & Surface**
   - Softer border radius: `8px` (was 12px)
   - Uses `--background-primary` for cleaner surface
   - Border changes on hover: `--background-modifier-border-hover`

3. **Typography & Spacing**
   - Increased padding: `1.25em 1.5em` for more breathing room
   - Title: `1.1em` weight 600, `1.35` line-height
   - Description: `0.9em` with `1.55` line-height
   - Better letter-spacing: `-0.01em` for titles, `0.005em` for body

4. **Favicon Treatment**
   - Larger in cards: `2em` (was 1.5em)
   - Rounded corners: `6px` (was 4px)
   - Proper shadow: `0 1px 3px rgba(0, 0, 0, 0.12)`
   - High-quality rendering with `image-rendering` properties

5. **Text Rendering**
   - Added `-webkit-font-smoothing: antialiased`
   - Added `-moz-osx-font-smoothing: grayscale`
   - Ensures crisp text rendering across platforms

6. **Interaction Feedback**
   - Faster transitions: `0.15s` (was 0.2s)
   - Active state returns to base position
   - Subtle shadow reduction on click

### 4. Handler Registration Order

Handlers now run in logical priority order:
1. **Wikipedia** - Specific to Wikipedia URLs
2. **Reddit** - Specific to Reddit URLs
3. **Google Search** - Specific to Google search URLs

This ensures domain-specific handlers run before generic ones.

## Visual Comparison

### Before:
- Small, blurry favicons (32px scaled)
- Wikipedia pages: Title only
- Cards had excessive shadow and transform
- Generic Material Design look

### After:
- Crisp, high-resolution favicons (128px)
- Wikipedia pages: Title + 2-sentence description
- Cards match Trello's refined aesthetic
- Better spacing and visual hierarchy

## Technical Benefits

1. **Better Display Quality**
   - 4x resolution (32px → 128px)
   - Clean scaling on retina displays
   - Proper CSS image rendering

2. **Complete Wikipedia Previews**
   - Informative descriptions from API
   - Smart truncation prevents overflow
   - CORS-enabled requests work in Obsidian

3. **Professional Card Appearance**
   - Matches familiar UI patterns (Trello)
   - Subtle but clear visual hierarchy
   - Better readability and scannability

4. **Performance Considerations**
   - Wikipedia API responses cached by service
   - Favicon cache still handles 128px images efficiently
   - No additional network requests per render

## Testing

Reload the plugin and test with:

**Wikipedia:**
- https://en.wikipedia.org/wiki/Nobel_Prize_in_Physics
- https://en.wikipedia.org/wiki/Quantum_mechanics

**Reddit (previous fix):**
- https://www.reddit.com/r/Cooking/comments/2ya11p/eli5_if_we_are_never_supposed_to_wash_an_cast/
- https://www.reddit.com/r/PixelBook/

**General sites:**
- https://github.com
- https://stackoverflow.com

Expected results:
- ✅ Favicons are crisp and clear in cards
- ✅ Wikipedia shows title + description
- ✅ Cards look clean and professional (Trello-style)
- ✅ Hover effects are smooth and subtle
- ✅ 2em favicons in cards are sharp
- ✅ Text rendering is crisp and readable

## Configuration

No configuration needed - improvements apply automatically:
- All cards use high-res favicons
- Wikipedia handler runs for `*.wikipedia.org` URLs
- Trello-style design applies to all card previews

Handler priority can be adjusted in `metadataHandlers/index.ts` if needed.
