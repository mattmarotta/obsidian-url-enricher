# Frontmatter Troubleshooting Guide

## Critical Requirement: Frontmatter Must Start on Line 1

**The #1 reason frontmatter doesn't work**: Frontmatter must be on the **very first line** of your note.

### ❌ WRONG - This will NOT work:
```markdown
# My Note Title

---
preview-style: card
---
```

### ✅ CORRECT - This WILL work:
```markdown
---
preview-style: card
---

# My Note Title
```

## How to Test

1. Make sure frontmatter starts on line 1 of your note
2. Reload Obsidian (Cmd+R or Ctrl+R)
3. Open your note in Live Preview mode
4. Open Developer Tools (Cmd+Option+I or Ctrl+Shift+I)
5. Go to the Console tab
6. You should see:
   ```
   [Inline Link Preview] buildDecorations called
   [Inline Link Preview] Parsing frontmatter: [array of properties]
   [Inline Link Preview] Parsed config: {previewStyle: "card", ...}
   [Inline Link Preview] Merged settings: {previewStyle: "card", ...}
   ```

## If You Still Don't See Console Output

1. The plugin might not be enabled - check Settings → Community plugins
2. You might not be in Live Preview mode - check the editor mode toggle
3. The note might not have any URLs to preview
4. Try creating a brand new note with frontmatter on line 1

## Valid Frontmatter Properties

```yaml
---
preview-style: card                    # or bubble
preview-display: block                 # or inline  
max-card-length: 500                   # 100-5000
max-bubble-length: 200                 # 50-5000
show-favicon: true                     # or false
include-description: true              # or false
url-display-mode: small-url-and-preview  # or url-and-preview, preview-only
preview-color-mode: grey               # or none, custom
custom-preview-color: "#4a4a4a"        # hex color (when using custom mode)
---
```

## Common Mistakes

1. **Frontmatter not on line 1** - Most common issue!
2. **Typos in property names** - `preview-style` not `preview_style`
3. **Invalid values** - Check the valid values list above
4. **Out of range numbers** - Cards: 100-5000, Bubbles: 50-5000
5. **Not in Live Preview mode** - Frontmatter only works in Live Preview
6. **Invalid hex colors** - Must be 6-digit format: `#RRGGBB`

## Quick Test Note

Copy this entire content (including the first line) into a new note:

```markdown
---
preview-style: card
max-card-length: 200
show-favicon: true
---

# Frontmatter Test

https://github.com
https://reddit.com
```

If the frontmatter is working:
- Previews should be card style (not bubbles)
- Text should be limited to ~200 characters
- You should see favicons

Check the console for debug output to confirm parsing.
