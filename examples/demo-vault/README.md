# URL Enricher - Demo Vault

Welcome to the URL Enricher demo vault! This collection of example files demonstrates the full capabilities of the plugin in various real-world scenarios.

## Quick Start

1. **Enable the plugin** in your Obsidian settings
2. **Switch to Live Preview mode** (the plugin only works in Live Preview)
3. **Open any example file** below and see URLs transform into rich previews
4. **Edit the URLs** - click to edit, click away to see preview again

## Example Files

### Core Preview Styles

#### [inline-previews.md](inline-previews.md)
**What it demonstrates:** Compact inline preview style

**Frontmatter configuration:**
```yaml
preview-style: inline
```

**Contains:**
- Variety of URLs across different categories (tech, recipes, fitness, shopping, etc.)
- Demonstrates space-efficient single-line previews
- Great for notes where vertical space matters

**Best for:** Quick reference lists, dense bookmark collections, meeting notes

---

#### [card-previews.md](card-previews.md)
**What it demonstrates:** Detailed card preview style with Material Design

**Frontmatter configuration:**
```yaml
preview-style: card
```

**Contains:**
- Same URLs as inline-previews.md for direct comparison
- Material Design cards with shadows and hover effects
- More visual prominence and readability
- Longer descriptions

**Best for:** Research notes, curated collections, visual browsing

**Try this:** Open both inline-previews.md and card-previews.md side-by-side to compare styles!

---

### Advanced Features

#### [domain-enhancements.md](domain-enhancements.md)
**What it demonstrates:** Special handling for popular platforms

**Platforms showcased:**
- Wikipedia (clean article titles, accurate descriptions)
- Reddit (post titles, subreddit info)
- Twitter/X (tweet content, profiles)
- LinkedIn (professional content)
- YouTube (video metadata, thumbnails)
- GitHub (repos, profiles, issues)
- Google Search (query extraction)
- E-commerce sites (product info)
- Technical blogs (article metadata)

**Why it matters:** Shows how the plugin extracts richer metadata than generic scraping

---

#### [frontmatter-variations.md](frontmatter-variations.md)
**What it demonstrates:** Per-page configuration options

**Current configuration:**
```yaml
preview-style: card
max-card-length: 300
show-favicon: true
include-description: true
preview-color-mode: grey
```

**Includes:**
- Complete reference of all frontmatter properties
- Example configurations for different use cases
- Settings hierarchy explanation
- Performance tips

**Experiment:** Try editing the frontmatter and see changes instantly!

---

### Testing & Edge Cases

#### [edge-cases.md](edge-cases.md)
**What it demonstrates:** Error handling and unusual scenarios

**Test cases included:**
- Network errors (non-existent domains, timeouts)
- Invalid URLs (malformed, private networks)
- Already-formatted links (custom text preservation)
- Complex URL formats (query params, fragments)
- URLs in different contexts (lists, blockquotes, code blocks)
- Cache behavior
- Special characters and encoding

**Why important:** Shows the plugin's robustness and non-destructive guarantee

---

#### [mixed-content.md](mixed-content.md)
**What it demonstrates:** Real-world note-taking scenarios

**Scenarios shown:**
- Research notes with sources
- Learning path tracking
- Recipe collections
- Fitness logs
- Shopping lists
- Developer portfolio research
- Blog reading lists
- Video watch later queues
- Community discussion tracking
- Meeting notes with references
- Bookmark tables

**Why valuable:** Shows how URL previews enhance actual note-taking workflows

---

## How to Use These Examples

### For New Users

1. **Start with [inline-previews.md](inline-previews.md)**
   - See the basic functionality
   - Understand how URLs transform

2. **Compare with [card-previews.md](card-previews.md)**
   - Decide which style you prefer
   - Understand the visual differences

3. **Explore [mixed-content.md](mixed-content.md)**
   - See real-world applications
   - Get ideas for your own notes

4. **Review [frontmatter-variations.md](frontmatter-variations.md)**
   - Learn about customization options
   - Try different configurations

### For Testing

1. **Use [edge-cases.md](edge-cases.md)** to verify:
   - Error handling works correctly
   - Network failures fail gracefully
   - Already-formatted links are preserved
   - Code blocks are respected

2. **Use [domain-enhancements.md](domain-enhancements.md)** to check:
   - Platform-specific extractors working
   - Metadata quality for different domains
   - Special formatting and icons

### For Contributors

1. **Test changes** against all example files
2. **Add new URLs** when supporting new domains
3. **Document edge cases** you discover
4. **Create new examples** for new features

---

## Frontmatter Quick Reference

Copy-paste these configurations to your own notes:

### Compact Links (No Descriptions)
```yaml
---
preview-style: inline
include-description: false
---
```

### Visual Bookmark Cards
```yaml
---
preview-style: card
max-card-length: 400
show-favicon: true
---
```

### Minimal Text-Only
```yaml
---
preview-style: inline
show-favicon: false
max-inline-length: 150
---
```

### Maximum Detail
```yaml
---
preview-style: card
max-card-length: 5000
include-description: true
---
```

---

## Console Commands

Open browser console (Cmd+Option+I or Ctrl+Shift+I) and try:

```javascript
// Show all available commands
window.inlineLinkPreview.help()

// Clear all caches (force re-fetch)
window.inlineLinkPreview.clearAllCaches()

// View cache statistics
window.inlineLinkPreview.getCacheStats()

// Enable debug logging
window.inlineLinkPreview.setLogLevel("debug")

// Disable logging
window.inlineLinkPreview.setLogLevel("none")
```

---

## Experiment Ideas

### Try Different Styles
1. Open any example file
2. Edit the frontmatter `preview-style` value
3. See instant changes!

### Test Error Handling
1. Open [edge-cases.md](edge-cases.md)
2. Check browser console for network errors
3. See how plugin gracefully handles failures

### Compare Configurations
1. Create a new note
2. Add the same URL multiple times
3. Use different frontmatter settings
4. Compare rendering

### Performance Testing
1. Open [mixed-content.md](mixed-content.md)
2. Clear cache: `window.inlineLinkPreview.clearAllCaches()`
3. Reload page and watch network requests
4. Check cache stats: `window.inlineLinkPreview.getCacheStats()`

---

## File Statistics

Total example files: **7**

- **inline-previews.md** - ~30 URLs, inline style
- **card-previews.md** - ~30 URLs, card style
- **domain-enhancements.md** - ~25 URLs across 10+ platforms
- **frontmatter-variations.md** - Configuration documentation + examples
- **edge-cases.md** - ~20 test URLs + edge case scenarios
- **mixed-content.md** - ~30 URLs in realistic note contexts
- **README.md** - This file

**Total URLs in demo vault:** ~135 covering diverse scenarios

---

## Additional Resources

### Documentation

- [User Guide](../../docs/USER-GUIDE.md) - Complete usage documentation
- [Quick Reference](../../docs/QUICK-REFERENCE.md) - Cheat sheet
- [Troubleshooting](../../docs/TROUBLESHOOTING.md) - Common issues
- [Advanced Features](../../docs/ADVANCED.md) - Console API, debugging
- [Frontmatter Support](../../docs/features/FRONTMATTER-SUPPORT.md) - Complete frontmatter reference

### Developer Documentation

- [Contributing Guide](../../CONTRIBUTING.md) - How to contribute
- [Architecture](../../docs/developer/ARCHITECTURE.md) - System design
- [Testing](../../docs/developer/TESTING.md) - Test infrastructure

### External

- [GitHub Repository](https://github.com/mattmarotta/obsidian-url-enricher)
- [Report Issues](https://github.com/mattmarotta/obsidian-url-enricher/issues)
- [Discussions](https://github.com/mattmarotta/obsidian-url-enricher/discussions)

---

## Tips for Best Results

**Viewing:**
- Use Live Preview mode (plugin doesn't work in Reading or Source mode)
- Ensure frontmatter starts on line 1 (no blank lines before `---`)
- Give network requests time to complete on first load

**Performance:**
- Cached URLs load instantly on subsequent views
- Clear cache periodically: `window.inlineLinkPreview.clearAllCaches()`
- Use shorter max-length values for faster rendering

**Customization:**
- Start with global settings in plugin settings panel
- Override per-page with frontmatter
- Experiment to find your preferred style

**Troubleshooting:**
- Check browser console for errors
- Enable debug logging: `window.inlineLinkPreview.setLogLevel("debug")`
- See [TROUBLESHOOTING.md](../../docs/TROUBLESHOOTING.md) for common issues

---

**Enjoy exploring the examples! If you discover interesting use cases or edge cases, please share them with the community.**
