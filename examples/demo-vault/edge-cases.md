---
preview-style: inline
---

# Edge Cases & Error Handling Demo

This page demonstrates how URL Enricher handles unusual scenarios, errors, and edge cases gracefully.

## Non-Destructive Guarantee

**Important:** Even when URLs can't be enriched, your markdown source remains unchanged. The plugin is 100% non-destructive.

---

## Network Error Scenarios

These URLs will fail to load, demonstrating error handling:

### Non-Existent Domain

https://this-domain-definitely-does-not-exist-12345.com

**Expected:** Falls back to showing plain URL or minimal preview

### Invalid IP Address

https://192.0.2.1

**Expected:** Timeout or connection error, graceful fallback

### Wrong Port

https://google.com:81

**Expected:** Connection timeout, shows URL without enrichment

### Invalid Domain Format

https://invalid..domain..com

**Expected:** DNS resolution fails, minimal preview

### Localhost/Private Network

https://localhost:9999

**Expected:** Connection refused (unless you have something running on that port!)

**What You Should See:**
- No crashes or broken rendering
- Fallback to URL display
- Error logged to console (if debug mode enabled)
- Page continues to work normally

---

## Already-Formatted Links

The plugin respects manually formatted links and leaves them alone:

### Link with Custom Text

[my own text](https://www.reddit.com/r/Cooking/comments/2ya11p/eli5_if_we_are_never_supposed_to_wash_an_cast/)

**Expected:** Shows your custom text, not enriched preview

### Link with Just URL (Empty Text)

[](https://www.reddit.com/r/Cooking/comments/2ya11p/eli5_if_we_are_never_supposed_to_wash_an_cast/)

**Expected:** May show enriched preview since there's no custom text to preserve

### Markdown Link Syntax

[https://www.reddit.com/r/Cooking/comments/2ya11p/eli5_if_we_are_never_supposed_to_wash_an_cast/](https://www.reddit.com/r/Cooking/comments/2ya11p/eli5_if_we_are_never_supposed_to_wash_an_cast/)

**Expected:** URL shown as link text, gets enriched if configured to process bracketed links

---

## Complex URL Formats

### URLs with Query Parameters

https://www.google.com/search?q=white+richlieu+hook+rack

**Expected:** Handles query parameters correctly

### URLs with Fragments/Anchors

https://www.newbalance.ca/en_ca/pd/t500/CT500V1-48944-PMG-NA.html#dwvar_CT500V1-48944-PMG-NA_size=10&dwvar_CT500V1-48944-PMG-NA_style=CT500SNB&dwvar_CT500V1-48944-PMG-NA_width=D&pid=CT500V1-48944-PMG-NA&quantity=1

**Expected:** Full URL processed including all parameters

### URLs in Different Contexts

URL at start of line:
https://superfastpython.com/learning-paths/

URL in middle of text: Check out https://www.boot.dev/lessons/08279dd8-c768-4778-bdb6-853a072ff3c6 for a good lesson.

URL at end of line https://ludic.mataroa.blog/

**Expected:** All detected and processed regardless of position

---

## Mixed Content Scenarios

### URLs in Lists

- https://github.com/mattmarotta
- https://en.wikipedia.org/wiki/Nobel_Prize_in_Physics
- https://www.youtube.com/watch?v=H75im9fAUMc

**Expected:** Each URL enriched individually in list context

### URLs in Blockquotes

> Here's an interesting article:
> https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues

**Expected:** Works in blockquote context

### URLs in Code Blocks

This URL should NOT be enriched (it's in a code block):

```
https://www.example.com
```

**Expected:** Plain text, no enrichment (respects code context)

Inline code also shouldn't enrich: `https://www.example.com`

**Expected:** Monospace font, no enrichment

---

## Performance Edge Cases

### Many URLs on One Page

This page contains multiple URLs to test batch processing and performance.

### URLs Requiring Multiple Redirects

Some URLs redirect multiple times before reaching final content:

https://x.com/ThePrimeagen

**Expected:** Follows redirects up to configured limit, then enriches final URL

---

## Cache Behavior

### First Load

On first viewing this page:
- URLs are fetched and cached
- May see brief delay for network requests
- Subsequent views are instant (cache hit)

### Cache Clearing

Open console and run: `window.inlineLinkPreview.clearAllCaches()`

Then refresh the page - you'll see URLs being fetched again.

### Failed Request Caching

Failed requests (like the non-existent domains above) are cached briefly to avoid repeated failed attempts.

---

## Special Characters & Encoding

### URLs with Encoded Characters

https://www.linkedin.com/posts/hinaaroraa_personalbranding-careerbranding-hinaarora-activity-7159402629180092416-QR2Z/?utm_source=share&utm_medium=member_android

**Expected:** Properly decodes and handles URL encoding

---

## Frontmatter Edge Cases

### Invalid Frontmatter Values

If you use invalid frontmatter (like `preview-style: invalid`), the plugin falls back to global settings.

### Conflicting Settings

If frontmatter has both `max-inline-length` and `max-card-length`, the one matching the current `preview-style` is used.

---

## What to Look For

When viewing this page in Live Preview mode, observe:

1. **Error URLs** - Should fail gracefully, no broken rendering
2. **Already-formatted links** - Custom text preserved
3. **Complex URLs** - Full URLs processed correctly
4. **Code blocks** - URLs inside code not enriched
5. **Performance** - Page remains responsive even with errors
6. **Cache behavior** - Second page view is instant

**Check the browser console (Cmd+Option+I or Ctrl+Shift+I) to see debug information about failed requests.**

---

## Troubleshooting These Cases

If you don't see expected behavior:

1. **Check you're in Live Preview mode** (not Reading mode or Source mode)
2. **Verify frontmatter is on line 1** (no blank lines before `---`)
3. **Check console for errors:** `window.inlineLinkPreview.setLogLevel("debug")`
4. **Clear cache:** `window.inlineLinkPreview.clearAllCaches()`

See [TROUBLESHOOTING.md](../../docs/TROUBLESHOOTING.md) for more help.
