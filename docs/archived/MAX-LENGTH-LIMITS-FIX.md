# Maximum Length Limits Fix

## Issue
- Maximum length limits were inconsistent across the codebase
- Frontmatter validation had old limits (1000 for cards, 500 for bubbles)
- UI had different limits (1000 for cards, 300 for bubbles!)  
- Backend normalization had no maximum enforcement at all
- User reported `max-bubble-length` frontmatter wasn't working

## Root Cause
The frontmatter parser was rejecting valid values because the validation ranges were too restrictive (100-1000 for cards, 50-500 for bubbles), so any value outside those ranges would be silently ignored.

## Solution
Set consistent maximum of **5000** across all validation points to prevent performance issues while allowing reasonable flexibility:

### Changes Made

1. **Settings UI** (`src/settings.ts`):
   - Updated card max from 1000 → 5000
   - Updated bubble max from 300 → 5000
   - Added min/max documentation in setting descriptions
   - Changed max attribute on HTML inputs

2. **Backend Validation** (`src/main.ts`):
   - Added `Math.min(5000, ...)` to cap values at 5000
   - Kept existing minimums (100 for cards, 50 for bubbles)
   - Prevents accidentally huge values that could cause performance issues

3. **Frontmatter Parsing** (`src/editor/urlPreviewDecorator.ts`):
   - Updated validation: 100-5000 for `max-card-length`
   - Updated validation: 50-5000 for `max-bubble-length`
   - This was the key fix - frontmatter now accepts reasonable values

4. **Debug Logging** (temporary):
   - Added console.log statements to help diagnose frontmatter parsing
   - Logs parsed frontmatter properties
   - Logs final merged settings
   - Can be removed after verification

5. **Documentation** (updated):
   - `FRONTMATTER-SUPPORT.md`: Updated ranges to 100-5000 and 50-5000
   - `README.md`: Updated ranges and added explanation of min/max rationale
   - Added notes explaining why limits exist

## Validation Ranges

| Setting | Minimum | Maximum | Rationale |
|---------|---------|---------|-----------|
| `maxCardLength` | 100 | 5000 | Min prevents unusably short previews; max prevents performance issues |
| `maxBubbleLength` | 50 | 5000 | Lower min for compact bubbles; max prevents performance issues |

## Testing

Created test note at `/Users/mattmarotta/Documents/ObsidianVaults/testVault/frontmatter-test.md` with:
- Example frontmatter settings
- Test URLs
- Instructions for verifying frontmatter parsing via console
- Troubleshooting guidance

### How to Test
1. Open `frontmatter-test.md` in Obsidian
2. Switch to Live Preview mode
3. Open Developer Tools (Cmd+Option+I)
4. Check Console tab for debug output:
   - Should see "Parsing frontmatter:" 
   - Should see "Parsed config:" with extracted values
   - Should see "Merged settings:" with final values
5. Verify previews match frontmatter settings

## Files Modified

1. `src/settings.ts` - UI max attributes and descriptions
2. `src/main.ts` - Backend validation with 5000 cap
3. `src/editor/urlPreviewDecorator.ts` - Frontmatter validation ranges + debug logging
4. `FRONTMATTER-SUPPORT.md` - Updated documentation
5. `README.md` - Updated documentation
6. `frontmatter-test.md` - New test file (in vault root)

## Debug Logging (Temporary)

Added three console.log statements for troubleshooting:
1. After parsing frontmatter lines (shows raw parsed data)
2. After creating config object (shows validated values)
3. After merging with global settings (shows final applied values)

**Note**: These can be removed once frontmatter is verified to work correctly.

## Performance Consideration

Maximum of 5000 characters is sufficient for even very long descriptions while preventing potential issues:
- DOM rendering performance
- Memory usage with many URLs
- Reasonable user experience (5000 chars is ~800-1000 words)

Most preview descriptions are 50-300 characters, so 5000 is a generous safety margin.

## Breaking Changes

None. Existing settings remain valid. Users can now set higher values up to 5000.
