# Configurable Description Lengths

## Summary

Made description lengths for card and bubble preview modes configurable through plugin settings, replacing the previous hardcoded values and removed the redundant "Dynamic preview mode" toggle.

## Changes Made

### 1. Settings Interface (`src/settings.ts`)
- **Removed**: `dynamicPreviewMode` setting (was redundant with plugin enable/disable)
- **Added**: `cardDescriptionLength` (default: 200 characters)
- **Added**: `bubbleDescriptionLength` (default: 100 characters)
- **Kept**: `maxDescriptionLength` as legacy (marked as "Legacy description length")

### 2. Settings UI (`src/settings.ts`)
- **Removed**: "Dynamic preview mode" toggle
- **Added**: "Card description length" input field
- **Added**: "Bubble description length" input field
- **Updated**: Relabeled old "Description length" as "Legacy description length"

### 3. Metadata Handler Context (`src/services/metadataHandlers/metadataHandler.ts`)
- **Added**: `settings` property to `MetadataHandlerContext` interface
- **Purpose**: Allows metadata handlers to access plugin settings

### 4. Link Preview Service (`src/services/linkPreviewService.ts`)
- **Added**: Constructor now accepts `settings: InlineLinkPreviewSettings` parameter
- **Added**: `updateSettings(settings: InlineLinkPreviewSettings)` method
- **Updated**: Passes settings to metadata handlers via context

### 5. Main Plugin (`src/main.ts`)
- **Updated**: `LinkPreviewService` constructor now receives `this.settings`
- **Updated**: `saveSettings()` now calls `linkPreviewService.updateSettings(this.settings)`
- **Purpose**: Ensures settings changes propagate to the service immediately

### 6. Reddit Metadata Handler (`src/services/metadataHandlers/redditMetadataHandler.ts`)
- **Changed**: Card content length from hardcoded `200` to `context.settings.cardDescriptionLength || 200`
- **Purpose**: Uses configurable card description length for Reddit post content

### 7. URL Preview Decorator (`src/editor/urlPreviewDecorator.ts`)
- **Changed**: Bubble truncation from `settings.maxDescriptionLength` to `settings.bubbleDescriptionLength`
- **Changed**: Default value from `60` to `100` characters
- **Removed**: Check for `settings.dynamicPreviewMode` (no longer needed)
- **Purpose**: Uses configurable bubble description length for all bubble previews

## How It Works

### Card Mode
- Uses `settings.cardDescriptionLength` (default: 200 chars)
- Applied by Reddit handler when creating structured content
- Longer descriptions for more context in card layout

### Bubble Mode
- Uses `settings.bubbleDescriptionLength` (default: 100 chars)
- Applied by URL decorator when truncating descriptions
- Shorter descriptions for compact bubble layout

### Settings Flow
1. User changes settings in Obsidian settings panel
2. `saveSettings()` called in main plugin
3. Settings saved to disk via `saveData()`
4. `linkPreviewService.updateSettings()` called
5. New settings used immediately for new previews
6. Metadata handlers and decorators use updated values

## User Experience

Users can now:
- Configure how much description text appears in card previews
- Configure how much description text appears in bubble previews
- Adjust these independently based on their preferences
- Changes take effect immediately for new previews

The redundant "Dynamic preview mode" toggle has been removed - users can now simply disable the plugin entirely if they don't want previews.

## Technical Details

### Reddit Special Handling
Reddit posts use a marker-based format:
- Title: `r/SubredditName`
- Description: `§REDDIT_CARD§Post Title§REDDIT_CONTENT§Content...`

In card mode:
- Shows structured layout with all three parts
- Content truncated to `cardDescriptionLength`

In bubble mode:
- Shows only: `r/SubredditName — Post Title`
- Content not shown (only title)
- `bubbleDescriptionLength` doesn't apply to Reddit bubbles

### General Sites
For non-Reddit sites:
- Card mode: Shows full metadata (no truncation in decorator)
- Bubble mode: Truncates combined title+description to `bubbleDescriptionLength`

## Migration

Existing users:
- Old settings remain compatible
- `maxDescriptionLength` still exists as "Legacy description length"
- New installs get defaults: 200 (cards) and 100 (bubbles)
- No breaking changes

## Files Modified

1. `src/settings.ts` - Settings interface and UI
2. `src/services/metadataHandlers/metadataHandler.ts` - Context interface
3. `src/services/linkPreviewService.ts` - Settings support
4. `src/main.ts` - Settings propagation
5. `src/services/metadataHandlers/redditMetadataHandler.ts` - Use card length
6. `src/editor/urlPreviewDecorator.ts` - Use bubble length

## Testing

To test:
1. Change "Card description length" in settings
2. Create a Reddit link preview in card mode
3. Verify content is truncated to the specified length
4. Change "Bubble description length" in settings
5. Create a non-Reddit link preview in bubble mode
6. Verify description is truncated to the specified length

## Notes

- Settings update immediately (no reload required)
- Both lengths are validated as positive numbers
- Defaults provide good balance: cards (200) show more, bubbles (100) stay compact
- Reddit bubbles only show title, so bubble length doesn't affect them
