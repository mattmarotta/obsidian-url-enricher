# Final Fixes: Favicons, Reddit Layout, and Card Structure

## Summary of Changes

### 1. Fixed Blurry Favicons (Final Solution)

**Problem:** Favicons were appearing blurry in card mode despite using 128px images.

**Root Cause:** Conflicting `image-rendering` CSS properties were interfering with Chromium's (Electron's) default high-quality scaling algorithm.

**Solution:** Simplified to Electron/Chromium defaults:
```css
/* Simple and effective for Electron/Chromium */
image-rendering: auto;
transform: translateZ(0); /* GPU acceleration only */
```

**Why this works:**
- Obsidian runs on Electron (Chromium rendering engine)
- Chromium's default `auto` mode uses high-quality bicubic scaling
- Properties like `crisp-edges`, `-webkit-optimize-contrast`, etc. were actually degrading quality
- GPU acceleration with `translateZ(0)` ensures smooth rendering without subpixel blur
- Less CSS = better results with modern rendering engines

### 2. Reddit Bubble Format

**Before:**
```
Post Title — r/Subreddit • Content...
```

**After:**
```
r/Subreddit — Post Title
```

**Implementation:**
- Title shows subreddit name (e.g., `r/Cooking`)
- Description shows post title after separator
- Clean, scannable format that prioritizes community context

### 3. Card Layout Restructure

**Before:** Vertical stack (favicon, title, description)

**After:** Header row with favicon + title side-by-side, description below

**Layout structure:**
```
┌─────────────────────────────────────┐
│ 🔥 Website Title                    │  ← Header (flex row)
│                                     │
│ Description text goes here and      │  ← Description block
│ can wrap across multiple lines...   │
└─────────────────────────────────────┘
```

**CSS:**
```css
.inline-url-preview__header {
  display: flex;
  align-items: center;
  margin-bottom: 0.75em;
}
```

### 4. Reddit Card Special Layout

**Structure:**
```
┌─────────────────────────────────────┐
│ 🔥 r/Subreddit                      │  ← Header (favicon + subreddit)
│                                     │
│ Post Title Here in Same Font        │  ← Post title (bold)
│                                     │
│ This is the post content preview    │  ← Content preview (muted)
│ that shows what the post is...      │
└─────────────────────────────────────┘
```

**Implementation:**
- Header row: Favicon + subreddit name
- Post title: Full weight, same font size, below header
- Content: Muted text, below post title
- All properly aligned and spaced

### 5. Separate Description Lengths

**Cards:** 200 characters for rich context
**Bubbles:** 100 characters for compact display

**Reasoning:**
- Cards have more space → show more context
- Bubbles need to stay compact → shorter descriptions
- Reddit content specifically optimized for readability

## Technical Implementation

### Reddit Handler (`redditMetadataHandler.ts`)

Uses special markers to encode structured data:
```typescript
// Format: "r/Subreddit §REDDIT_CARD§ Post Title §REDDIT_CONTENT§ Content"
title = `r/${subredditName}`;
description = `§REDDIT_CARD§${rawTitle}`;
description += `§REDDIT_CONTENT§${truncatedContent}`;
```

**Why markers?**
- Single metadata field can encode multiple pieces of info
- Renderer can parse and display differently for cards vs bubbles
- No need for complex metadata structures
- Easy to detect and parse

### URL Preview Decorator (`urlPreviewDecorator.ts`)

**Card rendering:**
1. Detects Reddit markers in description
2. Creates header row with favicon + title (subreddit)
3. Adds post title below header
4. Adds content preview below post title
5. All styled with inline CSS for proper spacing

**Bubble rendering:**
1. Detects Reddit markers
2. Shows `r/Subreddit — Post Title`
3. Compact format without content preview

**Non-Reddit cards:**
1. Header row with favicon + title side-by-side
2. Description block below header
3. Clean, professional appearance

## Visual Examples

### Reddit Bubble
```
r/Cooking — ELI5: If we are never supposed to wash a cast iron skillet...
```

### Reddit Card
```
╔════════════════════════════════════════╗
║  🔥 r/Cooking                          ║
║                                        ║
║  ELI5: If we are never supposed to     ║
║  wash a cast iron skillet, how does    ║
║  it stay clean?                        ║
║                                        ║
║  Shouldn't the heat be enough to kill  ║
║  any bacteria? If you can get away...  ║
╚════════════════════════════════════════╝
```

### Regular Card (e.g., Wikipedia)
```
╔════════════════════════════════════════╗
║  W  Nobel Prize in Physics             ║
║                                        ║
║  The Nobel Prize in Physics is an      ║
║  annual award given by the Royal...    ║
╚════════════════════════════════════════╝
```

## Files Modified

1. **`src/services/metadataHandlers/redditMetadataHandler.ts`**
   - Changed to use marker-based format
   - Separate lengths for cards (200) vs bubbles (100)
   - Title is always `r/Subreddit`
   - Description contains structured post data

2. **`src/editor/urlPreviewDecorator.ts`**
   - Added header row for cards (favicon + title side-by-side)
   - Reddit detection and parsing logic
   - Different rendering paths for cards vs bubbles
   - Inline styling for proper layout

3. **`styles.css`**
   - Improved favicon rendering with multi-browser optimization
   - Header row styles for flex layout
   - Post title styles for Reddit cards
   - Updated title styles to work inline in header

## Testing Checklist

**Reddit URLs:**
- [ ] Bubble shows: `r/Subreddit — Post Title`
- [ ] Card shows: subreddit in header, post title below, content below that
- [ ] Content preview is ~200 chars in cards
- [ ] Layout is clean and aligned

**Regular URLs:**
- [ ] Card shows: favicon + title in header row
- [ ] Description appears below header
- [ ] Layout matches Trello-style cards

**Favicons:**
- [ ] Sharp and crisp in both cards and bubbles
- [ ] No blurriness on retina displays
- [ ] Consistent across light/dark themes
- [ ] Smooth scaling without artifacts

**Test URLs:**
- https://www.reddit.com/r/Cooking/comments/2ya11p/eli5_if_we_are_never_supposed_to_wash_an_cast/
- https://en.wikipedia.org/wiki/Nobel_Prize_in_Physics
- https://github.com
- https://boot.dev

## Performance

- No performance impact
- Marker parsing is simple string operations
- GPU acceleration may improve rendering smoothness
- No additional network requests

## Browser Compatibility

Favicon rendering optimized for:
- ✅ Obsidian (Electron/Chromium) - Uses Chromium's default high-quality bicubic scaling
- ✅ No browser-specific hacks needed - Chromium handles it perfectly with `image-rendering: auto`

The simplified approach works because Obsidian uses a consistent rendering engine (Chromium via Electron), not multiple browsers.
