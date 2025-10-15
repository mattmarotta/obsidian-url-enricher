# Cache Clearing Documentation

## Overview

Added comprehensive documentation about cache management to help users and AI agents understand when and why to clear the cache during testing and development.

## Problem

The plugin caches metadata (titles, descriptions) and favicons for 30 days to improve performance. This is great for normal usage, but can cause confusion during development and testing:

- Changes to metadata handlers don't appear to work
- Favicon improvements seem to have no effect
- CSS updates appear not to apply (when they actually do, but cached data is displayed)
- Users and agents waste time debugging code that's actually working correctly

The cache was working as designed, but the need to clear it wasn't well-documented.

## Solution

### 1. Updated AGENTS.md

Added a new **"Testing Changes and Cache Management"** section to the Troubleshooting area that covers:

**When to clear cache:**
- After modifying metadata handlers (Reddit, Wikipedia, etc.)
- After changing favicon fetching logic
- After updating CSS that affects rendering
- When testing improvements to title/description extraction
- If you're not seeing expected changes after a rebuild

**How to clear cache:**
1. Go to Settings → Community plugins → Inline Link Preview
2. Scroll to Cache Management section
3. Click "Clear cache" button

**Proper testing workflow:**
```bash
# 1. Make code changes
npm run build

# 2. Reload plugin in Obsidian
# Ctrl+P (Cmd+P) → "Reload app without saving"

# 3. Clear cache in settings
# Settings → Inline Link Preview → Clear cache

# 4. Test with URLs
# Create/view notes with target URLs
```

**Agent guidance template:**
Provided a template message for AI agents to use when making changes:
> "I've updated the [feature]. Please clear the cache to test the changes:
> 1. Open Settings → Inline Link Preview
> 2. Click 'Clear cache' button
> 3. Test with a fresh URL or one you haven't previewed recently"

### 2. Updated Settings UI

Enhanced the cache clearing button description in `src/settings.ts`:

**Before:**
> "Remove all stored metadata and favicons from memory and disk. Previews will be rebuilt on the next paste or view."

**After:**
> "Remove all stored metadata and favicons from memory and disk. Previews will be rebuilt on the next paste or view. **Use this if you're not seeing updated previews after changes.**"

The added sentence makes the use case explicit for end users.

## Cache Behavior Details

### What Gets Cached
- **Metadata**: Titles and descriptions per URL
- **Favicons**: One per domain (not per URL)
- **Duration**: 30 days from fetch time
- **Persistence**: Survives Obsidian restarts (stored via `saveData()`)

### Cache Structure
```typescript
// Metadata cache (in-memory Map)
Map<string, LinkMetadata> {
  "https://reddit.com/...": { title: "...", description: "...", favicon: "..." }
}

// Favicon cache (persisted to disk)
{
  "reddit.com": {
    url: "data:image/png;base64,...",
    timestamp: 1729123456789
  }
}
```

### Cache Clearing Clears Both
The "Clear cache" button clears:
1. In-memory metadata cache (`linkPreviewService.clearCache()`)
2. Persistent favicon cache (`faviconCache.clear()` + `flush()`)
3. Updates stats display immediately

## Benefits

### For Users
- Clear guidance on what to do when previews seem wrong
- Understanding that cache is intentional (performance) but clearable
- One-click solution to common issue

### For AI Agents
- Explicit instructions on when to recommend cache clearing
- Template message to use after making changes
- Prevents debugging wild goose chases
- Improves testing workflow

### For Developers
- Documents expected behavior
- Reduces support burden
- Makes development workflow clearer
- Helps new contributors understand the system

## Example Scenarios

### Scenario 1: Testing Favicon Changes
```
1. Agent modifies favicon fetching in linkPreviewService.ts
2. User runs `npm run build`
3. User reloads Obsidian
4. User sees "blurry" favicons (actually cached old ones)
5. Without docs: User thinks code didn't work
6. With docs: Agent says "Clear the cache" → User sees crisp favicons
```

### Scenario 2: Testing Reddit Handler
```
1. Agent modifies Reddit metadata handler
2. User builds and reloads
3. User tests Reddit URL → sees old title format
4. Agent: "Please clear the cache (Settings → Inline Link Preview → Clear cache)"
5. User clears cache and tests again → sees new format
```

### Scenario 3: CSS Changes
```
Note: CSS changes don't require cache clearing as they affect rendering, not data.
But if metadata affects CSS application (e.g., special markers), cache matters.
```

## Implementation Details

### Location of Documentation
- **AGENTS.md**: Comprehensive section in Troubleshooting
- **settings.ts**: Updated button description for users
- Both complement each other (agent-focused vs user-focused)

### No Code Changes
This update is purely documentation - no functional changes to caching system:
- Cache behavior unchanged (still 30 days, still persistent)
- Cache clearing mechanism unchanged (same button, same logic)
- Only improved documentation and discoverability

## Future Considerations

Potential improvements not implemented:
1. **Auto-clear on rebuild**: Detect plugin updates and auto-clear cache
2. **Selective clearing**: Clear cache for specific domains only
3. **Cache indicators**: Visual indication of cached vs fresh data
4. **Dev mode**: Disable caching entirely during development
5. **Shorter dev expiry**: Different cache duration for dev builds

These weren't implemented because:
- Current system is simple and predictable
- Manual clearing gives users control
- Documentation is sufficient for now
- Can add later if needed

## Testing

No functional testing needed since this is documentation-only. However:

1. ✅ Verified AGENTS.md compiles and renders correctly
2. ✅ Verified settings.ts compiles without errors
3. ✅ Built successfully with `npm run build`
4. ✅ Confirmed button description will appear in settings UI

## Files Modified

1. **AGENTS.md**:
   - Added "Testing Changes and Cache Management" subsection
   - Includes when/how/why to clear cache
   - Provides agent guidance template
   - ~50 lines of new documentation

2. **src/settings.ts**:
   - Updated cache clearing button description
   - Added hint about using when previews seem wrong
   - One sentence addition for clarity

## Impact

This documentation update will:
- ✅ Reduce confusion during testing
- ✅ Improve agent effectiveness
- ✅ Save debugging time
- ✅ Make development workflow clearer
- ✅ Help users troubleshoot independently

All without changing any actual functionality - just making the existing system more transparent and usable.
