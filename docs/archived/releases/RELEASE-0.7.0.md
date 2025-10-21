# Release 0.7.0 - Card Design Refinements & Site Name Footer

**Release Date**: October 17, 2025

This release focuses on visual refinements to make card previews cleaner and more polished, plus intelligent site name footers for better context.

## 🎨 Cleaner Card Design

Cards now have a more refined, professional appearance with improved spacing and typography:

### Visual Improvements
- **More breathing room**: Increased padding from `0.875em 1em` to `1em 1.25em`
- **Softer appearance**: More subtle shadows and larger border radius (10px)
- **Better proportions**: Smaller favicons (1.75em instead of 2em)
- **Enhanced hover effects**: Subtle lift with smooth Material Design transitions
- **Improved typography**: Better title size (1.05em), more readable descriptions (0.94em with opacity: 0.95)

### Before & After
**Before**: Cramped spacing, large favicons, prominent shadows  
**After**: Clean layout, balanced proportions, subtle elevation

## 🏷️ Site Name Footer

Cards now display the site name at the bottom for better context and branding:

### Features
- **Intelligent extraction**: Gets site name from `og:site_name` or `application-name` meta tags
- **Smart fallback**: Parses from URL if metadata unavailable (e.g., "github.com" → "GITHUB")
- **Clean styling**: Uppercase text with top border separator
- **Subtle presence**: Low opacity (0.45) so it doesn't compete with main content

### Examples
- Wikipedia: Shows "WIKIPEDIA" (not "EN" or other language codes)
- Anthropic: Shows "ANTHROPIC" from metadata
- Reddit: Shows "REDDIT"
- OpenAI: Shows "OPENAI"
- GitHub: Shows "GITHUB" (from URL if no metadata)

### Visual Design
The footer includes:
- Subtle top border for visual separation
- Small uppercase text (0.68em)
- Medium font-weight for readability
- Wide letter-spacing (0.1em) for cleaner appearance
- Generous spacing from description (0.9em + 0.8em padding)

## 🔧 Technical Improvements

### Metadata Extraction
- Added `siteName` field to `LinkMetadata` interface
- DOMParser extracts `og:site_name` and `application-name` meta tags
- Regex parser fallback for sites where DOMParser fails
- Wikipedia handler explicitly sets "Wikipedia" to override language codes

### Code Changes
- Updated `types.ts` to include optional `siteName` property
- Enhanced `linkPreviewService.ts` with site name parsing
- Modified `urlPreviewDecorator.ts` to render site name footer
- All 6 widget instantiation points updated to pass `siteName`

## 📊 What Changed

### Card Structure (Before)
```
┌──────────────────────────┐
│ [Favicon] Title          │
│ Description text...      │
└──────────────────────────┘
https://example.com
```

### Card Structure (After)
```
┌──────────────────────────┐
│ [Favicon] Title          │
│                          │
│ Description text with    │
│ better spacing...        │
│                          │
│ ────────────────────     │
│ SITE NAME                │
└──────────────────────────┘
https://example.com
```

## 🐛 Bug Fixes

- **Wikipedia language codes**: Fixed Wikipedia showing "EN" instead of "WIKIPEDIA"
- **Metadata precedence**: Site name from metadata now takes priority over URL parsing

## 📝 Documentation Updates

- Updated README.md with card design section
- Added domain-aware metadata enrichment documentation
- Expanded CHANGELOG.md with detailed changes
- Created this release notes document

## 🚀 Upgrade Notes

### Breaking Changes
None - This is a purely additive and refinement release.

### Cache Clearing
**Important**: Clear your cache to see site name changes on previously viewed URLs:
1. Open Settings → Inline Link Preview
2. Scroll to Cache Management section
3. Click "Clear cache" button

### What You'll Notice
- Cards look cleaner and more spacious
- Site names appear at bottom of cards
- Wikipedia shows "WIKIPEDIA" instead of "EN"
- Better visual hierarchy throughout

## 🎯 Design Philosophy

This release continues our commitment to **non-destructive, visually polished previews** that enhance your notes without modifying source markdown. The card refinements follow Material Design principles for a clean, professional appearance that feels at home in Obsidian.

---

**Full Changelog**: See [CHANGELOG.md](CHANGELOG.md) for complete details.
