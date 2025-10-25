# Frontmatter Support

The URL Enricher plugin supports per-page configuration through frontmatter properties. This allows you to customize preview behavior for individual notes without changing global settings.

## Frontmatter-Only Mode (Opt-In Per Page)

By default, URL Enricher activates on all pages in your vault. If you prefer to use the plugin only on specific pages, enable **"Require frontmatter to activate"** in settings:

**Settings → URL Enricher → Plugin Activation → Require frontmatter to activate**

When enabled:
- Pages **with** frontmatter properties → Plugin active, shows previews
- Pages **without** frontmatter → Plugin inactive, no previews

This is useful if you:
- Only want previews in certain types of notes (research, bookmarks, etc.)
- Want to reduce visual clutter in most notes
- Prefer explicit opt-in behavior

**Example:** To activate the plugin on a specific page, add any frontmatter property:
```yaml
---
preview-style: inline
---
```

Even a single property will activate the plugin. You can use any supported frontmatter property (see below).

## Supported Properties

### Preview Style

**`preview-style`**
- **Values**: `inline` or `card`
- **Description**: Choose between compact inline style or detailed card style for this page
- **Example**:
  ```yaml
  ---
  preview-style: card
  ---
  ```

### Maximum Length

**`max-card-length`**
- **Values**: Number between 100 and 5000
- **Description**: Maximum total characters for card-style previews (title + description combined)
- **Note**: Minimum of 100 prevents unusably short previews. Maximum of 5000 prevents performance issues.
- **Example**:
  ```yaml
  ---
  max-card-length: 400
  ---
  ```

**`max-inline-length`**
- **Values**: Number between 50 and 5000
- **Description**: Maximum total characters for inline-style previews (title + description combined)
- **Note**: Minimum of 50 prevents unusably short previews. Maximum of 5000 prevents performance issues.
- **Example**:
  ```yaml
  ---
  max-inline-length: 200
  ---
  ```

### Content Options

**`show-favicon`**
- **Values**: `true` or `false`
- **Description**: Show or hide favicons in previews for this page
- **Example**:
  ```yaml
  ---
  show-favicon: false
  ---
  ```

**`include-description`**
- **Values**: `true` or `false`
- **Description**: Include or exclude descriptions in previews for this page
- **Example**:
  ```yaml
  ---
  include-description: false
  ---
  ```

### Preview Color (Advanced)

**`preview-color-mode`**
- **Values**: `none`, `grey`, or `custom`
- **Description**: Set background color mode for previews on this page
- **Example**:
  ```yaml
  ---
  preview-color-mode: none
  ---
  ```

**`custom-preview-color`**
- **Values**: Hex color code (e.g., `#4a4a4a`)
- **Description**: Custom background color when `preview-color-mode` is set to `custom`
- **Note**: Must be a valid 6-digit hex color code
- **Example**:
  ```yaml
  ---
  preview-color-mode: custom
  custom-preview-color: "#2a5a8a"
  ---
  ```

## Complete Example

Here's a complete frontmatter example combining multiple settings:

```yaml
---
title: My Research Notes
preview-style: card
max-card-length: 350
show-favicon: true
include-description: true
---

# My Research Notes

This page will show card-style previews with a maximum length of 350 characters.

Card previews will show a small, subtle URL that can be edited, while inline previews hide the URL entirely.
```

## URL Display Behavior

The plugin automatically determines how URLs are displayed based on the preview style:

- **Card previews**: URL is replaced with a small, subtle version and the card appears after it (editable)
- **Inline previews**: URL is completely hidden and replaced with the inline preview

This behavior cannot be customized per-page—it's determined by the `preview-style` setting.

## Settings Hierarchy

Frontmatter settings override global plugin settings for the specific page where they're defined. The hierarchy is:

1. **Frontmatter** (highest priority) - Settings defined in the page's frontmatter
2. **Global Settings** (fallback) - Settings configured in the plugin settings tab

If a frontmatter property is not specified, the plugin will use the global setting for that property.

## Notes

- Frontmatter properties are case-insensitive
- Invalid values will be ignored, and the plugin will fall back to global settings
- Changes to frontmatter take effect immediately in Live Preview mode
- The `keepEmoji` setting is intentionally not exposed to frontmatter (it's a global preference)
