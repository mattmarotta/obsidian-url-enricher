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

- If "Require frontmatter to activate" is ON in settings, previews only show on notes whose frontmatter sets at least one URL Enricher property, such as `preview-style: inline`
- Other frontmatter (`tags`, `aliases`, ...) doesn't activate the plugin

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
- In the Properties panel, type `card`, not `"card"`. Obsidian saves typed quotes as part of the value, so `"card"` won't match
- If the frontmatter isn't valid YAML (for example an unclosed quote), all of it is ignored until it's fixed

### Stale or wrong previews?

**Clear cache:**

- **Settings → URL Enricher → Clear cache button**

Fetched previews are kept in memory until Obsidian restarts.

## Console Commands

For advanced debugging, open console: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows)

All commands are under `window.urlEnricher` (also available as `window.inlineLinkPreview`):

```javascript
help()                             // Show all commands
getCacheStats()                    // Cached preview count, hits, misses
clearAllCaches()                   // Clear cached previews
refreshDecorations()               // Force refresh all previews
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

- YouTube: "video unavailable"
- **Solution:** URL is broken, remove it

**Network errors** (always shown)

- DNS failure, timeout, SSL errors, no internet
- **Solution:** Check internet connection or URL spelling

### Favicons Not Loading

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

Previews are built only for the part of the note on screen, and links are fetched as you scroll to them, so long notes stay responsive. If previews feel slow to appear:

- Slow websites are the usual cause. Lower **Request timeout** in settings to give up on them sooner.
- Turn off **Include description** or reduce the maximum lengths for lighter previews.

## Cache Troubleshooting

### View Cache Stats

- **Settings → URL Enricher → Cache management** shows how many previews are cached.
- In the console, `window.urlEnricher.getCacheStats()` returns the size, hits, misses, and hit rate.

### Clear Cache

**Via Settings UI (Recommended):**

- Settings → URL Enricher → Clear cache button

**Via Console (Advanced):**

```javascript
window.urlEnricher.clearAllCaches()
window.urlEnricher.refreshDecorations()
```

**When to clear:**

- Previews show outdated content
- Testing plugin changes

**Cache details:**

- Previews are kept in memory only, up to 1000 links, and are lost when Obsidian restarts
- Favicon addresses are built from each link's domain and aren't stored by the plugin

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