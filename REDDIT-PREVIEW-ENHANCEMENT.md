# Reddit Preview Enhancement

## Summary

Enhanced Reddit link previews to show post titles instead of post content, and implemented Material Design-inspired card styling for a cleaner, more professional appearance.

## Changes Made

### 1. Reddit Metadata Handler (`redditMetadataHandler.ts`)

**Previous behavior:**
- Title: `r/SubredditName`
- Description: Post content (selftext)

**New behavior:**
- **Bubble style**: Shows post title as primary text
- **Card style**: Shows post title with subreddit label and content preview

**Implementation:**
```typescript
// Title is now the actual post title
const title = rawTitle || (subredditName ? `r/${subredditName}` : undefined);

// Description includes subreddit + content in structured format
let description = "";
if (subredditName) {
  description = `r/${subredditName}`;
  if (normalizedSelftext) {
    // Truncate to ~150 chars for clean card display
    const truncated = normalizedSelftext.length > 150 
      ? normalizedSelftext.substring(0, 150) + "..."
      : normalizedSelftext;
    description += ` • ${truncated}`;
  }
}
```

### 2. URL Preview Decorator (`urlPreviewDecorator.ts`)

**Smart Reddit format detection:**
- Parses description format: `r/Subreddit • Content`
- For card style: Renders as structured layout with separate subreddit label
- For bubble style: Keeps compact inline format

**Card layout structure:**
```
┌─────────────────────────────────────┐
│ 🔥 Post Title Here                  │
│ r/Cooking                           │
│ Shouldn't the heat be enough to...  │
└─────────────────────────────────────┘
```

### 3. Material Design Styling (`styles.css`)

**Design principles applied:**
- **Elevation**: Multi-layer shadows for depth (levels 1 & 4)
- **Motion**: Smooth cubic-bezier transitions
- **Typography**: Letter-spacing, line-height optimizations
- **Spacing**: Generous padding and margins (16dp, 20dp scale)
- **Surface**: Rounded corners (12px) with subtle borders

**Key improvements:**
```css
/* Material elevation shadows */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08);

/* Smooth motion with Material easing */
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

/* Elevation on hover */
:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Active state feedback */
:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08);
}
```

## Visual Examples

### Bubble Style (Before)
```
r/Cooking — Shouldn't the heat be enough to kill any bacteria?...
```

### Bubble Style (After)
```
ELI5: If we are never supposed to wash an cast... — r/Cooking • Shouldn't the heat...
```

### Card Style (After)
```
╔════════════════════════════════════════════════╗
║  🔥 ELI5: If we are never supposed to wash an  ║
║     cast iron skillet, how does it stay clean? ║
║                                                 ║
║  r/Cooking                                     ║
║                                                 ║
║  Shouldn't the heat be enough to kill any      ║
║  bacteria? If you can get away with not        ║
║  washing and your pans are totally fine...     ║
╚════════════════════════════════════════════════╝
```

## Benefits

1. **Better Information Hierarchy**
   - Post title is now the prominent element
   - Subreddit shown as contextual metadata
   - Content preview gives additional context without overwhelming

2. **Improved Scannability**
   - Titles are immediately recognizable
   - Card layout uses visual weight to guide the eye
   - Consistent with Reddit's own UI patterns

3. **Professional Appearance**
   - Material Design principles create familiar, polished look
   - Smooth animations and transitions feel responsive
   - Appropriate elevation conveys interactivity

4. **Better Space Utilization**
   - Content truncated intelligently at ~150 characters
   - Card max-width (640px) prevents overly wide previews
   - Padding and spacing follow 8dp grid system

## Technical Details

### Content Truncation
- Post content (selftext) automatically truncated to 150 characters
- Appends ellipsis "..." for visual continuation indicator
- Prevents overly long card descriptions

### Format Detection
- Regex pattern: `/^(r\/[^\s•]+)\s*•\s*(.+)$/`
- Splits subreddit label from content preview
- Falls back to standard format for non-Reddit URLs

### Styling Adaptability
- Uses CSS variables for theme compatibility
- `var(--text-normal)`, `var(--text-muted)` adapt to dark/light themes
- `var(--interactive-accent)` for hover states

## Testing

Reload the plugin in Obsidian and test with:
- https://www.reddit.com/r/Cooking/comments/2ya11p/eli5_if_we_are_never_supposed_to_wash_an_cast/
- Various Reddit post URLs
- Both bubble and card preview styles
- Both light and dark themes

Expected results:
- ✅ Post title appears as primary text
- ✅ Card shows subreddit label below title
- ✅ Content preview truncated and readable
- ✅ Smooth hover animations
- ✅ Material Design elevation effects
- ✅ Theme colors adapt properly
