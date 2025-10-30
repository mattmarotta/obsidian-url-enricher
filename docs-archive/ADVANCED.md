# Advanced Features

Power user features, debugging tools, and developer console API for URL Enricher.

## Table of Contents

- [Developer Console API](#developer-console-api)
- [Cache Management](#cache-management)
- [Logging Control](#logging-control)
- [Performance Tracking](#performance-tracking)
- [Common Debugging Scenarios](#common-debugging-scenarios)
- [Network and Privacy Details](#network-and-privacy-details)

## Developer Console API

The plugin includes powerful debugging tools accessible via the browser console. Open the console with:
- **Mac**: `Cmd+Option+I`
- **Windows/Linux**: `Ctrl+Shift+I`

All debugging commands are available under `window.inlineLinkPreview` (also available as `window.urlEnricher` for the new name):

### Help Command

```javascript
// Show help and available commands
window.inlineLinkPreview.help()
```

### Available Commands Summary

| Command | Description |
|---------|-------------|
| `help()` | Show available commands |
| `getCacheStats()` | View cache statistics |
| `clearAllCaches()` | Clear all caches |
| `setLogLevel(level)` | Set log level (error, warn, info, debug) |
| `enablePerformanceTracking()` | Start tracking performance |
| `getPerformanceMetrics()` | View metrics table |
| `resetPerformanceMetrics()` | Reset all metrics |
| `disablePerformanceTracking()` | Stop tracking |
| `refreshDecorations()` | Force refresh all previews |

## Cache Management

### Viewing Cache Statistics

Get detailed cache performance metrics:

```javascript
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

**Understanding the metrics:**

**Metadata Cache:**
- **Size** - Current number of cached entries / maximum capacity (1000)
- **Hits** - Number of times cache had the requested data
- **Misses** - Number of times data had to be fetched from network
- **Evictions** - Number of times old entries were removed to make room
- **Hit Rate** - Percentage of cache hits (higher is better)

**Favicon Cache:**
- **Cached Domains** - Number of unique domains with cached favicons
- **Oldest Entry** - Domain with oldest cached favicon
- **Cache Age** - How long oldest entry has been in cache

**Good performance indicators:**
- Hit rate above 80%
- Low eviction count
- Cache size growing over time (up to maximum)

### Clearing All Caches

Force fresh data by clearing all caches:

```javascript
window.inlineLinkPreview.clearAllCaches()
```

This clears:
- **Metadata cache** - Page titles, descriptions, site names
- **Favicon cache** - Site icons

**When to clear:**
- Testing plugin changes
- Previews show outdated content
- After updating the plugin
- Troubleshooting metadata issues

**After clearing:**

Previews will be fetched fresh from websites. Expect:
- Slower initial load times
- Network activity for every URL
- Cache rebuilding over time

### Force Refresh Decorations

After clearing cache, force preview refresh:

```javascript
window.inlineLinkPreview.refreshDecorations()
```

This triggers immediate re-rendering of all previews in the current note.

## Logging Control

Control logging verbosity to see more or less detail in the console.

### Log Levels

- **`error`** - Only critical errors (quietest)
- **`warn`** - Warnings and errors
- **`info`** - General information (default)
- **`debug`** - Detailed debugging info (most verbose)

### Setting Log Level

```javascript
// Enable detailed debugging
window.inlineLinkPreview.setLogLevel("debug")

// Reduce noise to warnings only
window.inlineLinkPreview.setLogLevel("warn")

// Only show errors
window.inlineLinkPreview.setLogLevel("error")

// Default level
window.inlineLinkPreview.setLogLevel("info")
```

### What Gets Logged

**Error level:**
- Network failures
- Cache errors
- Critical exceptions

**Warn level:**
- HTTP errors (403, 404, 500+)
- Soft 404 detection
- Invalid frontmatter values

**Info level:**
- Plugin initialization
- Settings changes
- Cache operations

**Debug level:**
- Every metadata fetch
- Cache hits/misses
- Decoration builds
- Performance timing
- URL matching

**Example debug output:**
```
[url-enricher] Fetching metadata: https://github.com
[url-enricher] Cache miss: https://github.com
[url-enricher] Network request: https://github.com
[url-enricher] Metadata fetched in 234ms
[url-enricher] Favicon cached: github.com
[url-enricher] Building decoration for https://github.com
[url-enricher] Decoration built in 3ms
```

### Log Level Persistence

Log level is not persisted. It resets to `info` when:
- Plugin reloads
- Obsidian restarts

Set it again with `setLogLevel()` if needed.

## Performance Tracking

Track operation timing and identify bottlenecks. Performance tracking is **disabled by default** to avoid overhead.

### Enabling Performance Tracking

```javascript
// Enable tracking
window.inlineLinkPreview.enablePerformanceTracking()

// Use the plugin normally for a few minutes...

// View metrics
window.inlineLinkPreview.getPerformanceMetrics()
```

### Performance Metrics Output

**Example:**
```
=== Performance Metrics ===
Operation                Count   Avg Time   Min Time   Max Time   Total Time
────────────────────────────────────────────────────────────────────────────
fetchMetadata           45      234.5ms    120ms      890ms      10,552ms
parseHtml               45      12.3ms     8ms        45ms       553ms
resolveFavicon          38      156.7ms    90ms       450ms      5,954ms
buildDecorations        12      3.2ms      2ms        8ms        38ms
```

**Understanding the metrics:**

- **Operation** - What was measured
- **Count** - Number of times operation ran
- **Avg Time** - Average time per operation
- **Min Time** - Fastest operation
- **Max Time** - Slowest operation
- **Total Time** - Cumulative time for all operations

### Identifying Bottlenecks

**Slow fetchMetadata (>500ms average):**
- Websites are slow to respond
- Network connectivity issues
- Too many concurrent requests

**Slow parseHtml (>50ms average):**
- Websites return huge HTML documents
- Complex HTML parsing required

**Slow resolveFavicon (>300ms average):**
- Google favicon service is slow
- Network issues
- Many unique domains

**Slow buildDecorations (>10ms average):**
- Very long titles/descriptions
- Many decorations building simultaneously

### Resetting Metrics

Clear accumulated metrics:

```javascript
window.inlineLinkPreview.resetPerformanceMetrics()
```

Useful when you want to measure a specific scenario from scratch.

### Disabling Performance Tracking

Stop tracking to reduce overhead:

```javascript
window.inlineLinkPreview.disablePerformanceTracking()
```

**Note:** Performance tracking adds minimal overhead but is disabled by default for optimal performance.

## Common Debugging Scenarios

### Problem: Previews Not Loading

**Debug workflow:**

1. **Enable debug logging:**
   ```javascript
   window.inlineLinkPreview.setLogLevel("debug")
   ```

2. **Watch console** for error messages

3. **Look for:**
   - "Network request failed" - Network issues
   - "HTTP error 403/404" - Website blocking or broken URL
   - "Timeout" - Slow website or connection

4. **Check cache:**
   ```javascript
   window.inlineLinkPreview.getCacheStats()
   ```

   Low hit rate may indicate URLs are not being cached.

### Problem: Slow Performance

**Debug workflow:**

1. **Enable performance tracking:**
   ```javascript
   window.inlineLinkPreview.enablePerformanceTracking()
   ```

2. **Use the plugin** for a minute or two

3. **View metrics:**
   ```javascript
   window.inlineLinkPreview.getPerformanceMetrics()
   ```

4. **Identify slow operations:**
   - If `fetchMetadata` is slow (>500ms avg): Websites are slow
   - If `parseHtml` is slow (>50ms avg): Complex HTML
   - If `resolveFavicon` is slow (>300ms avg): Network issues

5. **Solutions:**
   - Increase request timeout in settings
   - Disable favicons if `resolveFavicon` is slow
   - Use inline style instead of cards
   - Reduce description length

### Problem: Stale or Incorrect Previews

**Debug workflow:**

1. **Check when cached:**
   ```javascript
   window.inlineLinkPreview.getCacheStats()
   ```

   Look at "Oldest Entry" and "Cache Age"

2. **Clear cache:**
   ```javascript
   window.inlineLinkPreview.clearAllCaches()
   ```

3. **Refresh previews:**
   ```javascript
   window.inlineLinkPreview.refreshDecorations()
   ```

4. **Enable debug logging** to see fresh fetches:
   ```javascript
   window.inlineLinkPreview.setLogLevel("debug")
   ```

### Problem: Frontmatter Not Applied

**Debug workflow:**

1. **Check console for warnings:**
   ```javascript
   window.inlineLinkPreview.setLogLevel("warn")
   ```

2. **Look for:**
   - "Invalid frontmatter value" - Value out of range or wrong type
   - "Frontmatter property ignored" - Misspelled property name

3. **Verify frontmatter is on line 1:**
   - Frontmatter MUST start on the very first line with `---`

4. **Check property names and values** against [Frontmatter Support](features/FRONTMATTER-SUPPORT.md)

### Problem: High Memory Usage

**Debug workflow:**

1. **Check cache size:**
   ```javascript
   window.inlineLinkPreview.getCacheStats()
   ```

2. **If Size is near 1000/1000:**
   - This is maximum capacity (by design)
   - Oldest entries are automatically evicted
   - Normal behavior for vaults with many URLs

3. **If Evictions is very high (>1000):**
   - You're exceeding cache capacity frequently
   - Consider reducing number of URLs in notes
   - Or accept the evictions (cache still works)

4. **Clear cache to free memory:**
   ```javascript
   window.inlineLinkPreview.clearAllCaches()
   ```

## Network and Privacy Details

### How Metadata Fetching Works

When you have a URL in your note, the plugin:

1. **Checks cache first** - If metadata exists and is <30 days old, use it
2. **Fetches the page** - Requests HTML directly from the target website
3. **Parses HTML locally** - Extracts Open Graph, Twitter Card, and other meta tags in your browser
4. **Fetches favicon** - Requests favicon from Google's public favicon service
5. **Caches results** - Stores metadata and favicon URL for 30 days

### What Data Is Sent

**To Target Websites:**
- HTTP GET request for the URL
- Standard browser headers (User-Agent, etc.)
- Your IP address (as with any web request)

**To Google Favicon Service:**
- Domain name only (e.g., `reddit.com`)
- Request for 128px favicon

**NOT Sent Anywhere:**
- Your note content
- Other URLs in your notes
- Your Obsidian vault structure
- Any personal information beyond standard HTTP

### What Data Is Stored

**In-Memory (Cleared on restart):**
- Metadata cache (titles, descriptions, site names)
- Up to 1000 entries
- Automatic eviction of oldest entries

**On Disk:**
- Favicon URL cache (domain → favicon URL mapping)
- Stored in `.obsidian/plugins/url-enricher/` folder
- 30-day expiration
- No actual images stored, only URLs

**NOT Stored:**
- Full HTML of fetched pages
- Images or media from websites
- Tracking or analytics data

### Privacy Considerations

**The plugin is fully local:**
- No data sent to third-party services (except favicon service)
- No analytics or tracking
- No account or authentication required

**Websites will see:**
- Your IP address (as with any web browser)
- That a request came from Obsidian/Electron (User-Agent header)

**Google Favicon Service:**
- Only receives domain names
- Provides favicons as a public service
- See [Google Favicon Service](https://www.google.com/s2/favicons)

**Private or authenticated sites:**
- If a site requires login, the plugin can't fetch metadata
- You'll see a fallback preview or error indicator

### Rate Limiting

The plugin limits concurrent requests to prevent overloading:

- **Max 10 parallel requests** at a time
- Additional requests queued
- Prevents overwhelming your network or target websites

### Timeout Handling

- **Default timeout**: 7000ms (7 seconds)
- **Configurable** in Settings → Request timeout
- After timeout, network error shown

### Error Handling

Network and HTTP errors are handled gracefully:
- URLs remain editable
- Error indicators shown (⚠️)
- No crashes or data loss

---

**Related Documentation:**
- [User Guide](USER-GUIDE.md) - Complete usage guide
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues
- [Quick Reference](QUICK-REFERENCE.md) - Cheat sheet
- [Architecture](developer/ARCHITECTURE.md) - Technical architecture (for developers)
