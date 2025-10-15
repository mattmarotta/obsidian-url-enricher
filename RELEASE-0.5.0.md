# Release Notes - v0.5.0

## What's New in v0.5.0

This maintenance release fixes critical bugs with description length settings and adds important documentation for cache management. v0.5.0 builds on the v0.4.0 complete rewrite that made the plugin 100% non-destructive.

---

## 🐛 Critical Bug Fixes

### Fixed Description Length Settings
**The card and bubble description length settings now work correctly!**

In v0.4.0, we introduced separate settings for card and bubble description lengths, but they didn't work:
- The **bubble length setting did nothing** - it was completely ignored
- The **card length setting** appeared to control both styles
- Root cause: Description truncation happened before the preview style was determined

**What we fixed:**
- Description truncation now happens AFTER preview style determination
- Cards properly use `cardDescriptionLength` (default: 200 characters)
- Bubbles properly use `bubbleDescriptionLength` (default: 100 characters)  
- Each style now works independently as intended

**Impact:** Users can now properly customize description lengths for each preview style!

### Removed Unused Legacy Setting
- Removed the deprecated `maxDescriptionLength` setting that wasn't being used anywhere
- Cleaned up settings interface to reduce confusion
- Proper validation added for both card and bubble length settings

---

## 📚 Documentation Improvements

### Cache Clearing Guide (CRITICAL for Testing)
Added comprehensive documentation about cache management:

**The Problem:** The plugin caches metadata and favicons for 30 days for performance. During development/testing, cached data prevents you from seeing changes - making it appear that code fixes aren't working when they actually are!

**The Solution:** New documentation in `AGENTS.md` explains:
- **When to clear cache:** After metadata changes, favicon updates, CSS modifications
- **How to clear cache:** Settings → Inline Link Preview → Clear cache button
- **Testing workflow:** Step-by-step guide (build → reload → clear cache → test)
- **Agent guidance:** Template for AI assistants to remind users

**Settings UI Updated:**
- Cache clearing button now says: "Use this if you're not seeing updated previews after changes"
- Makes the use case explicit for end users

---

## 🔧 Technical Improvements

### Settings Architecture
- Settings now properly propagate to metadata handlers via context
- Added `updateSettings()` method to `LinkPreviewService`
- `MetadataHandlerContext` includes settings for handler access
- Proper normalization and validation for both card and bubble lengths

### Code Organization  
- Fixed truncation logic order (style determination → truncation)
- Better separation of concerns in decoration flow
- More maintainable and debuggable code

---

## 📋 What Changed in This Release

### Files Modified
- `src/editor/urlPreviewDecorator.ts` - Fixed truncation timing and conditional logic
- `src/settings.ts` - Removed legacy setting, updated cache button description
- `src/main.ts` - Updated settings normalization for card/bubble lengths
- `src/services/linkPreviewService.ts` - Added settings parameter and update method
- `src/services/metadataHandlers/metadataHandler.ts` - Added settings to context interface
- `src/services/metadataHandlers/redditMetadataHandler.ts` - Now uses configurable lengths
- `AGENTS.md` - Added comprehensive cache clearing documentation
- `CACHE-CLEARING-DOCS.md` - Detailed cache management guide
- `DESCRIPTION-LENGTH-FIX.md` - Technical explanation of the fix

### What Was NOT Changed
This is a **bug fix and documentation release**. The following v0.4.0 features remain unchanged:
- ✅ Non-destructive rendering (CodeMirror decorations)
- ✅ Card and bubble preview styles
- ✅ Material Design styling
- ✅ Wikipedia API integration
- ✅ Reddit post enhancements
- ✅ Inline/block display modes
- ✅ Frontmatter configuration
- ✅ URL display modes

---

## 🎯 Migration Notes

### For Users Upgrading from v0.4.0

**Description Length Settings:**
- If you previously customized card/bubble lengths, they will now work as intended
- The bubble length setting will finally take effect
- Defaults: 200 chars (cards), 100 chars (bubbles)

**Legacy Setting Removed:**
- The old `maxDescriptionLength` is now gone from the interface
- It wasn't being used, so no functionality is lost
- Use the card/bubble settings for customization

**No Breaking Changes:**
- This is a bug fix release - full backward compatibility
- All v0.4.0 features work exactly the same
- Your existing settings and notes are unaffected

### For Users Upgrading from v0.3.x or Earlier

If you're upgrading from before v0.4.0, please read the v0.4.0 changelog first! That was a major rewrite that:
- ❌ Removed all paste conversion and destructive editing
- ✅ Made the plugin 100% non-destructive (decorations only)
- ❌ Removed bulk conversion commands and modals
- ✅ Added card-style previews and Material Design

**v0.5.0 is a maintenance release on top of the v0.4.0 foundation.**

---

## 🧪 Testing Recommendations

After updating to v0.5.0:

1. **Clear your cache first!** Settings → Inline Link Preview → Clear cache
2. **Test card lengths:** Change card length setting and verify with a card-style preview
3. **Test bubble lengths:** Change bubble length setting and verify with a bubble-style preview
4. **Verify independence:** Changing one length should not affect the other style

**Important:** Always clear the cache after updating the plugin to see changes properly!

---

## � Known Issues

Same as v0.4.0:
- Favicons may appear blurry in card mode for some sites (Google's favicon service upscales small icons)
- Cache persists across restarts - remember to clear when testing

---

## 📦 Installation

### For New Users
1. Open Settings → Community plugins in Obsidian
2. Browse and search for "Inline Link Preview"  
3. Click Install, then Enable

### For Existing Users (Updating from v0.4.0)
1. Open Settings → Community plugins
2. Find "Inline Link Preview"
3. Click Update
4. **Important:** Clear the cache after updating!

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the v0.5.0 release
2. Copy to `<vault>/.obsidian/plugins/obsidian-inline-link-preview/`
3. Reload Obsidian
4. **Important:** Clear the cache after installing!

---

## � Documentation

### New Documentation Files
- `CACHE-CLEARING-DOCS.md` - Comprehensive cache management guide
- `DESCRIPTION-LENGTH-FIX.md` - Technical explanation of the bug fix
- `CONFIGURABLE-LENGTHS.md` - Settings implementation details

### Updated Documentation
- `AGENTS.md` - Added "Testing Changes and Cache Management" section
- `CHANGELOG.md` - Full v0.5.0 changelog with all changes

### Existing Documentation (from v0.4.0)
- `README.md` - User guide and feature overview
- `MIGRATION.md` - Migration guide from v0.3.x
- `DYNAMIC-PREVIEW-DEMO.md` - Non-destructive rendering explained
- Various implementation guides for specific features

---

## 🙏 Acknowledgments

Thanks to users who reported that the card/bubble length settings weren't working independently. Your feedback led to identifying and fixing this critical bug!

Special thanks to the testing process that uncovered the cache-related confusion - leading to much better documentation that will help all users.

---

## 🔜 Future Plans

Potential improvements for future releases:
- Higher resolution favicon sources for popular sites
- Configurable cache expiration times  
- Additional domain-specific metadata handlers
- Theme customization options
- Performance optimizations

---

**Full Changelog:** [v0.4.0...v0.5.0](CHANGELOG.md)

**Version:** 0.5.0  
**Release Date:** October 14, 2025  
**Minimum Obsidian Version:** 0.15.0

