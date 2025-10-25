# Quick Reference

Cheat sheet for URL Enricher settings, commands, and workflows.

## Frontmatter Properties

Use these properties in your note frontmatter to override global settings:

| Property | Values | Description | Example |
|----------|--------|-------------|---------|
| `preview-style` | `inline`, `card` | Preview style for this page | `preview-style: card` |
| `max-card-length` | 100-5000 | Max characters for card previews | `max-card-length: 400` |
| `max-inline-length` | 50-5000 | Max characters for inline previews | `max-inline-length: 200` |
| `show-favicon` | `true`, `false` | Show/hide favicons | `show-favicon: false` |
| `include-description` | `true`, `false` | Show/hide descriptions | `include-description: true` |
| `preview-color-mode` | `none`, `grey`, `custom` | Background color mode | `preview-color-mode: grey` |
| `custom-preview-color` | Hex color | Custom background color | `custom-preview-color: "#4a4a4a"` |

**Example frontmatter:**
```yaml
---
preview-style: card
max-card-length: 350
show-favicon: true
include-description: true
---
```

**Important**: Frontmatter MUST start on line 1 of the file!

## Console API Commands

Open console: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows)

| Command | Description | Example |
|---------|-------------|---------|
| `help()` | Show available commands | `window.inlineLinkPreview.help()` |
| `getCacheStats()` | View cache statistics | `window.inlineLinkPreview.getCacheStats()` |
| `clearAllCaches()` | Clear metadata and favicon caches | `window.inlineLinkPreview.clearAllCaches()` |
| `refreshDecorations()` | Force refresh all previews | `window.inlineLinkPreview.refreshDecorations()` |
| `setLogLevel(level)` | Set logging verbosity | `window.inlineLinkPreview.setLogLevel("debug")` |
| `enablePerformanceTracking()` | Start performance monitoring | `window.inlineLinkPreview.enablePerformanceTracking()` |
| `getPerformanceMetrics()` | View performance metrics | `window.inlineLinkPreview.getPerformanceMetrics()` |
| `resetPerformanceMetrics()` | Reset metrics to zero | `window.inlineLinkPreview.resetPerformanceMetrics()` |
| `disablePerformanceTracking()` | Stop performance monitoring | `window.inlineLinkPreview.disablePerformanceTracking()` |

**Alternative API name**: Commands also available as `window.urlEnricher.*`

## Log Levels

| Level | What Gets Logged | When to Use |
|-------|------------------|-------------|
| `error` | Only critical errors | Production, minimize noise |
| `warn` | Warnings + errors | Default, catch issues |
| `info` | General info + warnings + errors | Standard operation |
| `debug` | Everything | Troubleshooting, development |

**Set log level:**
```javascript
window.inlineLinkPreview.setLogLevel("debug")
```

## Common Workflows

### Quick Start
1. Install plugin from Community Plugins
2. Paste URL: `https://github.com`
3. View in Live Preview mode
4. Click preview to open link

### Change Preview Style for a Note
```yaml
---
preview-style: card
---
```

### Disable Plugin for a Note
1. Enable "Require frontmatter to activate" in settings
2. Remove frontmatter from notes where you don't want previews

Or use Source mode instead of Live Preview.

### Fix Stale Previews
```javascript
window.inlineLinkPreview.clearAllCaches()
window.inlineLinkPreview.refreshDecorations()
```

### Debug Performance Issues
```javascript
window.inlineLinkPreview.enablePerformanceTracking()
// Use plugin for a minute
window.inlineLinkPreview.getPerformanceMetrics()
```

### Optimize for Speed
```yaml
---
preview-style: inline
include-description: false
max-inline-length: 100
---
```

Or globally: Settings → Preview Content → Include description → OFF

## Settings At-a-Glance

### Plugin Activation
- **Require frontmatter to activate**: OFF (works on all pages)

### Preview Appearance
- **Preview style**: Inline (compact)
- **Preview background color**: None (transparent)

### Preview Content
- **Include description**: ON
- **Description length**: 60 characters
- **Show favicons**: ON
- **Keep emoji**: OFF (strips emojis)
- **Request timeout**: 7000ms (7 seconds)
- **HTTP Error Warnings**: ON (show ⚠️ for HTTP errors)

## Supported URL Formats

| Format | Example | Notes |
|--------|---------|-------|
| Bare URL | `https://github.com` | Most common |
| Markdown link | `[text](https://github.com)` | Shows fetched title |
| Empty markdown link | `[](https://github.com)` | Shows fetched title |
| URL as link text | `[https://github.com](https://github.com)` | Shows fetched title |
| Wikilink | `[[https://github.com]]` | URLs only, not page names |

**Not supported:**
- Image embeds: `![](url)`
- Code blocks or inline code
- Non-HTTP protocols

## Quick Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| Previews not showing | Check Live Preview mode is enabled |
| Frontmatter not working | Ensure frontmatter starts on line 1 |
| Stale previews | `window.inlineLinkPreview.clearAllCaches()` |
| Slow loading | Increase Settings → Request timeout |
| Too much visual clutter | Use inline style, disable descriptions |
| Plugin not active | Settings → Community plugins → Enable URL Enricher |
| Error warnings (⚠️) | Check HTTP Error Warnings setting |
| Performance issues | Use inline style, reduce description length |

**Full troubleshooting**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## Preview Style Comparison

| Feature | Inline | Card |
|---------|--------|------|
| **Size** | Compact | Large |
| **URL Display** | Hidden | Small text below card |
| **Description** | Optional, short | Optional, longer |
| **Site Name** | No | Yes, in footer |
| **Visual Weight** | Subtle | Prominent |
| **Best For** | Reading, many links | Bookmarks, research |
| **Layout** | Flows with text | Block display |

## Domain-Specific Features

| Website | Special Handling |
|---------|------------------|
| **Wikipedia** | Fetches article intro via API, shows "WIKIPEDIA" as site name |
| **Reddit** | Custom formatting: `r/Subreddit — Title`, extracts post content |
| **Twitter/X** | Fetches tweets via oEmbed API, shows `@username` |
| **Google Search** | Extracts query: "Google Search — query" |
| **LinkedIn** | Cleans hashtags and comment counts from titles |

## Performance Tips

### For Speed
- Use inline style (lighter than cards)
- Disable descriptions
- Reduce max-length: 50-100 characters
- Disable favicons

### For Visual Appeal
- Use card style
- Enable descriptions
- Increase max-card-length: 400-500 characters
- Keep favicons enabled

### For Large Notes (50+ URLs)
```yaml
---
preview-style: inline
include-description: false
max-inline-length: 100
show-favicon: false
---
```

## Cache Information

| Cache Type | Storage | Expiration | Max Size |
|------------|---------|------------|----------|
| **Metadata** | In-memory | 30 days | 1000 items |
| **Favicon** | Disk | 30 days | Unlimited |

**Clear cache:**
```javascript
window.inlineLinkPreview.clearAllCaches()
```

## Error Indicators

| Symbol | Meaning | Solution |
|--------|---------|----------|
| ⚠️ | HTTP/Network error | Check URL, or disable HTTP Error Warnings |
| (no preview) | Fetch failed | Check console for errors |
| (fallback text) | Metadata unavailable | Site may require authentication or has no metadata |

## Keyboard Shortcuts

Currently no keyboard shortcuts. Use console commands or settings instead.

**Future consideration**: Custom hotkeys for:
- Toggle preview style
- Clear cache
- Refresh decorations

## Color Customization

### Background Colors

| Mode | Appearance | Use Case |
|------|------------|----------|
| `none` | Transparent | Default, minimal styling |
| `grey` | Subtle grey | Better contrast |
| `custom` | Your choice | Match note theme |

**Custom color example:**
```yaml
---
preview-color-mode: custom
custom-preview-color: "#2a5a8a"  # Blue theme
---
```

## URLs to Test With

Good test URLs for different scenarios:

- **Wikipedia**: `https://en.wikipedia.org/wiki/Obsidian`
- **Reddit**: `https://reddit.com/r/ObsidianMD`
- **GitHub**: `https://github.com`
- **Twitter**: `https://twitter.com/obsdmd`
- **Google Search**: `https://www.google.com/search?q=obsidian+plugins`
- **LinkedIn**: (any LinkedIn post URL)

## Related Documentation

- **[User Guide](USER-GUIDE.md)** - Complete usage guide
- **[Troubleshooting](TROUBLESHOOTING.md)** - Detailed problem solving
- **[Advanced Features](ADVANCED.md)** - Console API deep dive
- **[Frontmatter Support](features/FRONTMATTER-SUPPORT.md)** - Complete frontmatter reference

---

**Tip**: Bookmark this page for quick access to common commands and settings!
