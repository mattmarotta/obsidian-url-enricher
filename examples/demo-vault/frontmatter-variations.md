---
preview-style: card
max-card-length: 300
show-favicon: true
include-description: true
# preview-color-mode removed - use global settings
---

# Frontmatter Configuration Variations

This page demonstrates various frontmatter configuration options you can use to customize URL preview behavior on a per-page basis.

## Current Page Configuration

This page is configured with:

```yaml
---
preview-style: card
max-card-length: 300
show-favicon: true
include-description: true
# preview-color-mode removed - use global settings
---
```

**Result:** Card-style previews with descriptions limited to 300 characters total, showing favicons, with a grey background.

## Configuration Options Reference

### Preview Style Options

**`preview-style: inline`** - Compact single-line previews
**`preview-style: card`** - Detailed Material Design cards (this page)

### Length Control

**`max-inline-length`** - Character limit for inline previews (1-5000)
**`max-card-length`** - Character limit for card previews (1-5000, this page uses 300)

### Content Display

**`show-favicon: true/false`** - Show website icons (this page: true)
**`include-description: true/false`** - Show descriptions (this page: true)

### Visual Styling

**Note:** Color modes (`preview-color-mode`, `custom-preview-color`) have been removed from frontmatter as of v1.0.2. Background colors must now be set globally in the plugin settings. This allows separate control for inline and card preview backgrounds.

## Example URLs to See Configuration in Action

Here are some URLs that will demonstrate the current settings:

https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues

https://superfastpython.com/learning-paths/

https://en.wikipedia.org/wiki/Nobel_Prize_in_Physics

https://www.recipetineats.com/truly-golden-crunchy-baked-chicken-tenders-less-mess/

---

## Try Different Configurations

To experiment with different settings, try creating pages with these frontmatter variations:

### Minimal Inline (No Descriptions)

```yaml
---
preview-style: inline
include-description: false
show-favicon: true
---
```

**Use case:** Quick link lists where you only want titles

### Title-Only Cards

```yaml
---
preview-style: card
include-description: false
show-favicon: true
max-card-length: 100
---
```

**Use case:** Visual bookmark collection focusing on titles

### No Icons, Text Only

```yaml
---
preview-style: inline
show-favicon: false
include-description: true
max-inline-length: 200
---
```

**Use case:** Minimal, text-focused previews

### Maximum Detail

```yaml
---
preview-style: card
max-card-length: 5000
show-favicon: true
include-description: true
# preview-color-mode removed - use global settings
---
```

**Use case:** Research notes where you want maximum context

### Opt-In Mode

If you enable **"Require frontmatter to activate"** in settings:

```yaml
---
preview-style: inline
---
```

**Result:** Plugin only activates on pages with frontmatter properties. Pages without frontmatter show plain URLs.

**Use case:** Selective preview activation for specific note types

---

## Settings Hierarchy

Settings are applied in this order (later overrides earlier):

1. **Global Settings** - Set in plugin settings
2. **Frontmatter Properties** - Set per page (this page's frontmatter)
3. **Manual Overrides** - Via console API (temporary)

Example: If global settings use `inline` style but this page's frontmatter specifies `card`, this page shows cards.

---

## Tips for Configuration

**For different note types:**
- **Bookmarks** → `card` style with descriptions
- **Quick references** → `inline` style, shorter lengths
- **Research notes** → `card` style with longer character limits
- **Link dumps** → `inline` style without descriptions

**Performance considerations:**
- Shorter max-length values = faster rendering
- Hiding favicons = slight performance gain
- Inline style = more compact, faster scrolling

**See the Frontmatter Support documentation for complete details on all available properties.**
