# Troubleshooting Guide

Common issues and solutions for the URL Enricher plugin.

## Table of Contents

- [Quick Fixes](#quick-fixes)
- [Previews Not Appearing](#previews-not-appearing)
- [Previews Show Wrong Content](#previews-show-wrong-content)
- [Favicons Not Loading](#favicons-not-loading)
- [Frontmatter Not Working](#frontmatter-not-working)
- [Performance Issues](#performance-issues)
- [Error Warnings](#error-warnings)
- [Cache Issues](#cache-issues)
- [Getting More Help](#getting-more-help)

## Quick Fixes

Before diving into detailed troubleshooting, try these common fixes:

### ⚠️ Must Be in Live Preview Mode

Previews only appear in **Live Preview mode**, not in Source mode or Reading view.

**How to enable:**
1. Open a note
2. Click the three-dot menu in the top right
3. Select "Live Preview" (or use hotkey if configured)

### ⚠️ Frontmatter Must Start on Line 1

The #1 reason frontmatter doesn't work is incorrect placement.

```yaml
# ❌ WRONG - Will not work!
# My Note Title

---
preview-style: card
---

# ✅ CORRECT - Frontmatter first!
---
preview-style: card
---

# My Note Title
```

Frontmatter MUST be on the very first line of the file, starting with `---`.

### ⚠️ Clear Cache When Testing Changes

If you don't see changes after updating the plugin or modifying metadata:

1. Open browser console: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows)
2. Run: `window.inlineLinkPreview.clearAllCaches()`
3. Run: `window.inlineLinkPreview.refreshDecorations()`

The plugin caches metadata and favicons for 30 days for performance. You won't see changes without clearing the cache!

## Previews Not Appearing

### Check 1: Live Preview Mode

Make sure you're in Live Preview mode, not Source mode or Reading view. See [Quick Fixes](#quick-fixes) above.

### Check 2: URL Formatting

Ensure URLs are properly formatted. Supported formats:
- Bare URLs: `https://example.com`
- Markdown links: `[text](https://example.com)`
- Empty markdown links: `[](https://example.com)`
- Wikilinks: `[[https://example.com]]`

**Not supported:**
- URLs in image embeds: `![alt](url)`
- URLs in code blocks or inline code
- Non-HTTP protocols: `ftp://`, `file://`, etc.

### Check 3: Frontmatter Activation Mode

If you have "Require frontmatter to activate" enabled in settings, the plugin only works on pages with frontmatter.

**Solution**: Add any frontmatter property to activate:
```yaml
---
preview-style: inline
---
```

Even one frontmatter property will activate the plugin for that page.

### Check 4: Plugin Enabled

Verify the plugin is enabled:
1. Open Settings → Community plugins
2. Find "URL Enricher" in the list
3. Ensure the toggle is ON (not greyed out)

### Check 5: No Conflicting Plugins

Some plugins may conflict with URL Enricher. Try temporarily disabling other link-related plugins:
- Link preview plugins
- URL converter plugins
- Custom decoration plugins

Re-enable them one by one to identify conflicts.

### Check 6: Console Errors

Open the browser console (`Cmd+Option+I` or `Ctrl+Shift+I`) and look for error messages from `[url-enricher]`. If you see errors, they may indicate the issue.

## Previews Show Wrong Content

### Issue: Outdated Metadata

The plugin caches metadata for 30 days. If a website's content has changed, you may see stale previews.

**Solution**:
```javascript
// In browser console
window.inlineLinkPreview.clearAllCaches()
window.inlineLinkPreview.refreshDecorations()
```

### Issue: Website Blocks Automated Requests

Some websites (especially e-commerce sites) block automated requests with 403 Forbidden errors. The plugin can't fetch metadata from these sites.

**Common sites that block bots:**
- Amazon, eBay, other shopping sites
- Some news sites with paywalls
- Sites with aggressive bot protection

**Solutions:**
- Disable HTTP error warnings if you know the URL is valid: Settings → HTTP Error Warnings → OFF
- Accept that some sites can't be previewed
- Use a fallback: manually add link text in markdown `[Descriptive Text](url)`

### Issue: Website Has Poor Metadata

Some websites don't provide good Open Graph or meta tag metadata. The plugin can only show what the website provides.

**Solution**:
- Check the website's source (`View Page Source`) for `<meta>` tags
- If metadata is missing or poor, consider using custom link text instead
- Report the issue to the website owner if appropriate

### Issue: Soft 404 (Page Not Found)

Some websites return "200 OK" status but show error content (e.g., "Page not found"). The plugin detects many of these "soft 404s" for common sites:
- Reddit: "this community doesn't exist"
- YouTube: "video unavailable"
- Generic pages: titles like "404 Not Found"

**Solution**: The URL is likely broken. Update or remove it.

## Favicons Not Loading

### Issue: Favicon Cache Stale

Favicons are cached for 30 days. If a site's favicon has changed, you may see the old one.

**Solution**:
```javascript
// In browser console
window.inlineLinkPreview.clearAllCaches()
window.inlineLinkPreview.refreshDecorations()
```

### Issue: Website Has No Favicon

Some websites don't provide a favicon. The plugin uses Google's favicon service, but if Google can't find one either, no icon will appear.

**Solution**: This is expected behavior. Not all sites have favicons.

### Issue: Google Favicon Service Blocked

If you're in a restricted network environment, Google's favicon service (`www.google.com/s2/favicons`) may be blocked.

**Solution**:
- Check if `www.google.com` is accessible
- Contact your network administrator if in a corporate/school network
- As a workaround, disable favicons: Settings → Show favicons → OFF

### Issue: Favicons Show as Broken Images

If favicons appear as broken images:

1. Check browser console for errors
2. Try clearing the cache (see [Cache Issues](#cache-issues))
3. Verify your internet connection
4. Try disabling and re-enabling the plugin

## Frontmatter Not Working

### Issue: Frontmatter Not on Line 1

See [Quick Fixes](#quick-fixes) - this is the #1 reason frontmatter fails.

Frontmatter MUST start on the very first line of the file with `---`.

### Issue: Property Name Misspelled

Property names are case-insensitive, but must be spelled correctly:

```yaml
---
# ❌ Wrong
previe-style: card      # Missing 'w'
previewstyle: card      # Missing hyphen

# ✅ Correct
preview-style: card
---
```

**Valid property names:**
- `preview-style`
- `max-card-length`
- `max-inline-length`
- `show-favicon`
- `include-description`
- `preview-color-mode`
- `custom-preview-color`

### Issue: Invalid Values

Values must be within valid ranges:

```yaml
---
# ❌ Wrong
preview-style: medium           # Must be 'inline' or 'card'
max-card-length: 50             # Too low (min is 100)
max-card-length: 10000          # Too high (max is 5000)
show-favicon: yes               # Must be 'true' or 'false'
custom-preview-color: "blue"    # Must be hex code like "#0000ff"

# ✅ Correct
preview-style: card             # or 'inline'
max-card-length: 400            # 100-5000
show-favicon: true              # or false
custom-preview-color: "#4a4a4a" # hex code
---
```

### Issue: YAML Syntax Errors

YAML is sensitive to formatting:

```yaml
---
# ❌ Wrong
preview-style : card        # Extra space before colon
preview-style:card          # Missing space after colon
preview-style = card        # Wrong separator

# ✅ Correct
preview-style: card         # colon + space
---
```

### Detailed Frontmatter Debugging

For comprehensive frontmatter troubleshooting, see [Frontmatter Troubleshooting](features/FRONTMATTER-TROUBLESHOOTING.md).

## Performance Issues

### Issue: Slow Preview Loading

If previews take a long time to appear:

**Check 1: Network Speed**
- The plugin fetches metadata from websites over the network
- Slow internet = slow previews
- **Solution**: Increase request timeout: Settings → Request timeout → 10000ms or higher

**Check 2: Website Response Time**
- Some websites are slow to respond
- Nothing the plugin can do about slow websites
- **Solution**: Accept the delay or use simpler link formats

**Check 3: Too Many Concurrent Requests**
- If you have many URLs in a note, the plugin limits concurrent requests to 10
- **Solution**: This is intentional to prevent overload. Previews will load sequentially.

### Issue: Obsidian Feels Sluggish

If Obsidian feels slow with the plugin enabled:

**Solution 1: Reduce Preview Complexity**
```yaml
---
preview-style: inline           # Lighter than cards
include-description: false      # Hide descriptions
max-inline-length: 100          # Shorter text
---
```

**Solution 2: Reduce Description Length Globally**
- Settings → Description length → 30 or 40 characters

**Solution 3: Disable Favicons**
- Settings → Show favicons → OFF
- Saves network requests and rendering

**Solution 4: Use Frontmatter Activation Mode**
- Settings → Require frontmatter to activate → ON
- Plugin only runs on specific pages where you add frontmatter

### Issue: Large Notes with Many URLs

For notes with 50+ URLs:

1. Use inline style (lighter than cards)
2. Disable descriptions
3. Reduce max-inline-length to 100
4. Consider splitting the note into smaller notes

### Performance Tracking

For detailed performance analysis, see [Advanced Features - Performance Tracking](ADVANCED.md#performance-tracking).

## Error Warnings

The plugin shows a warning indicator (⚠️) for broken or problematic URLs.

### HTTP Errors (Controllable)

**403 Forbidden** - Site blocks automated requests
- Common for: Amazon, eBay, some news sites
- **Solution**: Disable HTTP error warnings if you know the URL is valid
  - Settings → HTTP Error Warnings → OFF

**404 Not Found** - Page doesn't exist
- **Solution**: Fix or remove the broken URL

**500+ Server Error** - Website server encountered an error
- **Solution**: Try again later, or report to website owner

**Soft 404s** - Page returns 200 OK but shows error content
- Reddit: "this community doesn't exist"
- YouTube: "video unavailable"
- Generic: titles like "404 Not Found"
- **Solution**: Fix or remove the broken URL

### Network Errors (Always Shown)

**DNS Resolution Failure** - Domain doesn't exist
- **Solution**: Check for typos in the URL

**Connection Timeout** - Can't reach the server
- **Solution**: Check your internet connection, or increase request timeout

**SSL/TLS Errors** - Certificate problems
- **Solution**: The website has security issues. Avoid or report.

**No Internet Connection** - You're offline
- **Solution**: Connect to the internet

### Controlling Error Warnings

Go to **Settings → URL Enricher → Preview Content → HTTP Error Warnings**:
- **Enabled (default)**: Show ⚠️ for both HTTP errors and network failures
- **Disabled**: Only show ⚠️ for network failures; HTTP errors will show fallback previews without warnings

**When to disable HTTP error warnings:**
- Sites that block bots (403) but you know the URL is valid
- You prefer to see fallback previews even for potentially broken pages
- You want to reduce visual clutter

## Cache Issues

### Viewing Cache Statistics

Check cache health:

```javascript
// In browser console
window.inlineLinkPreview.getCacheStats()
```

**Example output:**
```
=== Metadata Cache Stats ===
Size: 342 / 1000 items
Hits: 1,234
Misses: 156
Evictions: 12
Hit Rate: 88.79%

=== Favicon Cache Stats ===
Cached Domains: 89
Oldest Entry: reddit.com (cached 2024-01-15)
Cache Age: 7 days
```

### Clearing All Caches

If you suspect cache corruption or want to force fresh data:

```javascript
// In browser console
window.inlineLinkPreview.clearAllCaches()
window.inlineLinkPreview.refreshDecorations()
```

This clears:
- Metadata cache (page titles, descriptions)
- Favicon cache (site icons)

**When to clear cache:**
- Testing plugin changes
- Previews show outdated content
- Favicons show wrong icons
- After updating the plugin
- Troubleshooting any metadata issues

### Cache Location

- **Metadata cache**: In-memory only, cleared on plugin reload
- **Favicon cache**: Persisted to disk in `.obsidian/plugins/url-enricher/` folder
- **Cache expiration**: 30 days for both

### Disabling Cache (Not Recommended)

There's no setting to disable caching, as it's essential for performance. However, you can:
- Clear cache frequently with console commands
- Reduce cache lifetime (requires modifying source code)

## Getting More Help

### Check Console Logs

Open browser console (`Cmd+Option+I` or `Ctrl+Shift+I`) and look for messages prefixed with `[url-enricher]`.

**Set log level for more detail:**
```javascript
window.inlineLinkPreview.setLogLevel("debug")
```

**Log levels:**
- `error` - Only critical errors (default)
- `warn` - Warnings and errors
- `info` - General information
- `debug` - Detailed debugging info (very verbose)

### Check Plugin Version

Ensure you're running the latest version:
1. Settings → Community plugins
2. Check URL Enricher version number
3. Compare with latest release on GitHub

### Report an Issue

If you've tried everything and still have issues:

1. **Gather information:**
   - Plugin version
   - Obsidian version
   - Operating system
   - Console errors (if any)
   - Example URL that's not working

2. **Report on GitHub:**
   - [GitHub Issues](https://github.com/YOUR_REPO/issues)
   - Search existing issues first
   - Provide all gathered information

3. **Join Community:**
   - [GitHub Discussions](https://github.com/YOUR_REPO/discussions)
   - Obsidian community forums

### Debug Mode

For advanced troubleshooting, see [Advanced Features](ADVANCED.md) for:
- Developer Console API
- Performance tracking
- Detailed logging
- Cache inspection

---

**Related Documentation:**
- [User Guide](USER-GUIDE.md) - Complete usage guide
- [Advanced Features](ADVANCED.md) - Console API and debugging
- [Quick Reference](QUICK-REFERENCE.md) - Settings cheat sheet
- [Frontmatter Troubleshooting](features/FRONTMATTER-TROUBLESHOOTING.md) - Detailed frontmatter debugging
