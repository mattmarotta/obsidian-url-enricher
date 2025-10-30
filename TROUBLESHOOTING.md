# Troubleshooting Guide

Common issues and solutions for URL Enricher.

## Quick Fixes

### Previews not showing?

**Must be in Live Preview mode**

- Open note → three-dot menu → "Live Preview" (not Source mode)

**Check URL format**

```markdown
✅ https://github.com                    # Works
✅ [text](https://github.com)            # Works
✅ [[https://github.com]]                # Works
❌ ![](url)                              # Image embeds skipped
❌ `https://github.com`                  # Code blocks skipped
```

**Frontmatter activation mode?**

- If "Require frontmatter to activate" is ON in settings
- Add any frontmatter to activate: `---\npreview-style: inline\n---`

**Clear cache**

- **Settings → URL Enricher → Clear cache button**

### Frontmatter not working?

⚠️ **Must start on line 1!**

```yaml
# ❌ WRONG - Will not work!
# My Note Title

---
preview-style: card
---

# ✅ CORRECT
---
preview-style: card
---

# My Note Title
```

**Check property spelling**

- `preview-style` (not `previewstyle` or `previe-style`)
- See [Frontmatter Reference](#frontmatter-reference) below

### Stale or wrong previews?

**Clear cache:**

- **Settings → URL Enricher → Clear cache button**

Metadata is cached for 30 days for performance.

## Console Commands

For advanced debugging, open console: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows)

All commands under `window.inlineLinkPreview`:

```javascript
// Help
help()                             // Show all commands

// Cache
getCacheStats()                    // View cache statistics
clearAllCaches()                   // Clear metadata + favicon caches
refreshDecorations()               // Force refresh all previews

// Logging
setLogLevel("debug")               // debug | info | warn | error

// Performance
enablePerformanceTracking()        // Start tracking
getPerformanceMetrics()            // View metrics table
resetPerformanceMetrics()          // Reset to zero
disablePerformanceTracking()       // Stop tracking
```

## Common Issues

### Error Warnings (⚠️)

**403 Forbidden**

- Site blocks automated requests (Amazon, eBay, some news sites)
- **Solution:** Settings → URL Enricher → HTTP Error Warnings → OFF

**404 Not Found**

- Page doesn't exist
- **Solution:** Fix or remove the URL

**Soft 404s**

- Reddit: "this community doesn't exist"
- YouTube: "video unavailable"
- **Solution:** URL is broken, remove it

**Network errors** (always shown)

- DNS failure, timeout, SSL errors, no internet
- **Solution:** Check internet connection or URL spelling

### Favicons Not Loading

**Cache stale** (30 day expiration)

- **Settings → URL Enricher → Clear cache button**

**Website has no favicon**

- Normal - not all sites have favicons

**Google Favicon Service blocked**

- In restricted networks, `www.google.com` may be blocked
- **Solution:** Settings → URL Enricher → Show favicons → OFF

### Website Blocking

Some sites block automated requests:

- Shopping sites (Amazon, eBay)
- News sites with paywalls
- Sites with bot protection

**Solutions:**

- Disable HTTP error warnings in Settings
- Use custom link text: `[Descriptive Text](url)`
- Accept that some sites can't be previewed

### URLs in Tables

**Known limitation:** URLs in markdown tables show as standard links, not enriched previews.

**Why:** Obsidian renders tables as HTML widgets. Plugin decorations only apply to editor text layer.

## Performance Troubleshooting

### Performance Tracking

```javascript
// Enable tracking (disabled by default)
window.inlineLinkPreview.enablePerformanceTracking()

// Use plugin for 1-2 minutes

// View metrics
window.inlineLinkPreview.getPerformanceMetrics()
```

**Look for:**

- `fetchMetadata` > 500ms avg → Websites slow
- `parseHtml` > 50ms avg → Complex HTML
- `resolveFavicon` > 300ms avg → Network issues

## Cache Troubleshooting

### View Cache Stats

```javascript
window.inlineLinkPreview.getCacheStats()
```

**Example output:**

```
=== Metadata Cache ===
Size: 342 / 1000 items
Hits: 1,234
Misses: 156
Hit Rate: 88.79%

=== Favicon Cache ===
Cached Domains: 89
Oldest Entry: reddit.com (7 days ago)
```

**Good indicators:**

- Hit rate > 80%
- Low eviction count
- Cache growing over time

### Clear Cache

**Via Settings UI (Recommended):**

- Settings → URL Enricher → Clear cache button

**Via Console (Advanced):**

```javascript
window.inlineLinkPreview.clearAllCaches()
```

**When to clear:**

- Previews show outdated content
- Favicons show wrong icons
- Testing plugin changes
- After updating the plugin

**Cache details:**

- **Metadata:** In-memory, 30 day expiration, 1000 item max
- **Favicon:** Disk storage, 30 day expiration, unlimited

## Still Having Issues?

### Gather Information

- Plugin version (Settings → Community plugins)
- Obsidian version (Settings → About)
- Operating system
- Console errors (if any)
- Example URL that's not working

### Report Issue

1. **Search existing issues:** [GitHub Issues](https://github.com/mattmarotta/obsidian-url-enricher/issues)
2. **Open new issue** with gathered information
3. **Include:**

   - Clear description of problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors (screenshot or copy/paste)

### Ask Questions

- [GitHub Discussions](https://github.com/mattmarotta/obsidian-url-enricher/discussions)
- Obsidian community forums

---

**Most issues are solved by:**

1. Checking Live Preview mode is enabled
2. Ensuring frontmatter starts on line 1
3. Clearing cache via Settings