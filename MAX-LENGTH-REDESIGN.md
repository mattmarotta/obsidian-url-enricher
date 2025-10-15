# Maximum Length Settings Redesign

## Problem

The previous settings were confusing and inconsistent:

### Previous Settings (v0.5.0)
- `cardDescriptionLength` - "Maximum characters for descriptions in card-style previews"
- `bubbleDescriptionLength` - "Maximum characters for descriptions in bubble-style previews"

### Issues
1. **Ambiguous terminology**: What is a "description"?
   - For standard sites: The meta description from the page
   - For Reddit: Is it the post content? The post title? Both?
   - Users couldn't predict what would be truncated

2. **Inconsistent behavior**: 
   - Standard sites: Setting controlled `title + " — " + description` combined length
   - Reddit cards: Setting only controlled the content portion, not post title
   - Reddit bubbles: Only showed title (no content), so setting was irrelevant

3. **Confusing naming**: "Description length" doesn't convey it's the total preview length

## Solution

Redesigned settings to be clear and intuitive:

### New Settings
- `maxCardLength` - "Maximum total characters for card-style previews (title + description combined)"
- `maxBubbleLength` - "Maximum total characters for bubble-style previews (title + description combined)"

### New Defaults
- **maxCardLength**: 300 characters (increased from 200)
- **maxBubbleLength**: 150 characters (increased from 100)

### Benefits
1. **Clear naming**: "Max length" is self-explanatory
2. **Consistent behavior**: Controls total preview length for ALL sites, including Reddit
3. **Intuitive**: Users can set exactly how long they want their previews to be
4. **Better defaults**: Higher limits provide more context while still being compact

## Implementation

### Settings Interface
```typescript
export interface InlineLinkPreviewSettings {
    maxCardLength: number;      // Total preview length for cards
    maxBubbleLength: number;    // Total preview length for bubbles
    // ... other settings
}

export const DEFAULT_SETTINGS: InlineLinkPreviewSettings = {
    maxCardLength: 300,
    maxBubbleLength: 150,
    // ...
}
```

### Truncation Logic

**Decorator (urlPreviewDecorator.ts):**
- Calculates `limit` once based on preview style (card or bubble)
- Applies to standard sites: truncates `title + " — " + description` to fit limit
- Passes `limit` to widget for Reddit-specific handling

**Reddit Card Rendering:**
```typescript
// Calculate total: subreddit + post title + content
const totalLength = (this.title?.length || 0) + postTitle.length + postContent.length;
if (totalLength > this.maxLength) {
    // Truncate content to fit within limit
    const usedLength = (this.title?.length || 0) + postTitle.length + 6; // separators
    const remainingLength = this.maxLength - usedLength;
    if (remainingLength > 20) {
        postContent = postContent.substring(0, remainingLength) + "...";
    } else {
        postContent = "";
    }
}
```

**Reddit Bubble Rendering:**
- Shows only: `r/Subreddit — Post Title`
- Respects `maxBubbleLength` through standard decorator truncation
- Content is not shown in bubble mode

### Consistent Behavior Across All Sites

| Site Type | What's Truncated | How |
|-----------|------------------|-----|
| Standard (Wikipedia, GitHub, etc.) | `title + " — " + description` | Decorator truncates combined string to maxLength |
| Reddit Card | `r/Subreddit` + `Post Title` + `content` | Widget calculates total and truncates content |
| Reddit Bubble | `r/Subreddit — Post Title` | Decorator truncates combined string to maxLength |

## Settings UI

### Updated Labels and Descriptions

**Before:**
```
Card description length
Maximum characters for descriptions in card-style previews. Cards have more space for context.
Min: 50, Max: 500
```

**After:**
```
Maximum card length
Maximum total characters for card-style previews (title + description combined). 
Cards show more detailed information.
Min: 100, Max: 1000
```

**Before:**
```
Bubble description length
Maximum characters for descriptions in bubble-style previews. Bubbles are compact and inline.
Min: 30, Max: 200
```

**After:**
```
Maximum bubble length
Maximum total characters for bubble-style previews (title + description combined). 
Bubbles are compact and inline.
Min: 50, Max: 300
```

### Improved Ranges
- Card: 100-1000 chars (was 50-500)
- Bubble: 50-300 chars (was 30-200)
- Higher maxima allow for longer previews if desired
- Higher minima prevent unusably short previews

## Migration

### Automatic Migration
When users upgrade from v0.5.0 to v0.5.1:

**Old settings are ignored:**
- `cardDescriptionLength` (200) → Use default `maxCardLength` (300)
- `bubbleDescriptionLength` (100) → Use default `maxBubbleLength` (150)

**No data loss:**
- Settings file remains valid
- Old values simply aren't read
- New defaults are used

**Manual adjustment:**
If users had customized the old settings, they should:
1. Note their old values
2. Update to new settings
3. Set new values (old + ~50-100 for better experience)

### Why New Defaults?
- **300 for cards** (was 200): More room for Reddit post titles + content
- **150 for bubbles** (was 100): Better balance of compactness and information

The old defaults were too restrictive, especially for Reddit posts where:
- Subreddit name: ~10-20 chars
- Post title: 50-100 chars
- Content: Remaining space

With 200 chars total, Reddit content was often cut off too aggressively.

## Examples

### Standard Site (Wikipedia)

**Title:** "Quantum mechanics" (17 chars)  
**Description:** "Quantum mechanics is a fundamental theory in physics describing..." (150 chars)

**Card (maxCardLength: 300):**
```
Quantum mechanics — Quantum mechanics is a fundamental theory in physics 
describing the behavior of nature at and below the scale of atoms...
```
*Total: 170 chars - fits comfortably*

**Bubble (maxBubbleLength: 150):**
```
Quantum mechanics — Quantum mechanics is a fundamental theory in physics 
describing the behavior of nature...
```
*Total: 147 chars - truncated to fit*

### Reddit Post

**Subreddit:** "r/ObsidianMD" (12 chars)  
**Post Title:** "I am deeply grateful for all of you helping me learn about Obsidian" (68 chars)  
**Content:** "37 votes, 37 comments. Hi all, new to this community..." (200+ chars)

**Card (maxCardLength: 300):**
```
🔴 r/ObsidianMD
   I am deeply grateful for all of you helping me learn about Obsidian
   37 votes, 37 comments. Hi all, new to this community. Welcomed by so many...
```
*Total: subreddit (12) + title (68) + content (truncated to fit remaining ~220) = 300 chars*

**Bubble (maxBubbleLength: 150):**
```
🔴 r/ObsidianMD — I am deeply grateful for all of you helping me learn about Obsidian
```
*Total: 82 chars - fits comfortably, no content shown*

## Benefits Summary

✅ **Clearer naming**: "Max length" vs ambiguous "description length"  
✅ **Intuitive behavior**: Controls total preview size, not just one part  
✅ **Consistent across sites**: Same logic for Wikipedia, Reddit, GitHub, etc.  
✅ **Better defaults**: 300/150 provides more context than 200/100  
✅ **Flexible ranges**: 100-1000 for cards, 50-300 for bubbles  
✅ **Reddit-aware**: Properly handles subreddit + title + content in calculations  
✅ **User-friendly**: Settings description explains exactly what they control

## Technical Details

### Files Modified
1. `src/settings.ts`:
   - Renamed `cardDescriptionLength` → `maxCardLength`
   - Renamed `bubbleDescriptionLength` → `maxBubbleLength`
   - Updated defaults: 200→300, 100→150
   - Updated UI labels and descriptions
   - Updated validation ranges

2. `src/main.ts`:
   - Updated `normalizeSettings()` to use new property names
   - Updated minimum values: 0→100 for cards, 0→50 for bubbles

3. `src/editor/urlPreviewDecorator.ts`:
   - Moved `limit` calculation outside metadata block for reuse
   - Renamed references to use `maxCardLength` and `maxBubbleLength`
   - Passed `limit` to `UrlPreviewWidget` constructor
   - Added Reddit card truncation logic in `toDOM()`
   - Updated comments to reflect "max length" concept

4. `src/services/metadataHandlers/redditMetadataHandler.ts`:
   - Removed handler-side truncation
   - Now stores full content for decorator to truncate
   - Simplified logic (decorator handles all truncation)

### Widget Constructor
Added `maxLength` parameter:
```typescript
constructor(
    private url: string,
    private title: string | null,
    private description: string | null,
    private faviconUrl: string | null,
    private isLoading: boolean,
    private urlDisplayMode: UrlDisplayMode,
    private previewStyle: PreviewStyle,
    private displayMode: DisplayMode,
    private maxLength: number  // NEW
)
```

### Calculation Flow
1. Decorator determines preview style (card or bubble)
2. Decorator retrieves `maxCardLength` or `maxBubbleLength` from settings
3. Decorator calculates `limit` based on style
4. For standard sites: Decorator truncates `title + description` to `limit`
5. Decorator passes `limit` to widget
6. For Reddit cards: Widget truncates content to fit within `limit`

## Testing

To verify the new behavior:

### Test 1: Standard Site Card
1. Set `maxCardLength` to 100
2. Add a Wikipedia URL
3. Set preview style to "card"
4. Verify total preview (title + description) is ≤ 100 chars

### Test 2: Standard Site Bubble
1. Set `maxBubbleLength` to 50
2. Add a Wikipedia URL
3. Set preview style to "bubble"
4. Verify total preview (title + description) is ≤ 50 chars

### Test 3: Reddit Card
1. Set `maxCardLength` to 200
2. Add a Reddit post URL with long content
3. Set preview style to "card"
4. Verify total (subreddit + title + content) is ≤ 200 chars
5. Content should be truncated if needed

### Test 4: Reddit Bubble
1. Set `maxBubbleLength` to 80
2. Add a Reddit post URL
3. Set preview style to "bubble"
4. Verify "r/Subreddit — Post Title" is ≤ 80 chars

### Test 5: Settings Changes
1. Change `maxCardLength` to 500
2. Clear cache
3. View existing card preview
4. Verify more content is shown (up to 500 chars)

## Future Enhancements

Potential improvements:
- Separate settings for Reddit vs standard sites
- Smart truncation (sentence boundaries)
- Character count preview in settings
- Per-domain overrides
- Frontmatter override for max lengths
