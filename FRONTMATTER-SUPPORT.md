# Frontmatter Support

The Inline Link Preview plugin supports per-page configuration through frontmatter properties. This allows you to customize preview behavior for individual notes without changing global settings.

## Supported Properties

### Preview Style and Display

**`preview-style`**
- **Values**: `bubble` or `card`
- **Description**: Choose between compact bubble style or detailed card style for this page
- **Example**:
  ```yaml
  ---
  preview-style: card
  ---
  ```

**`preview-display`**
- **Values**: `inline` or `block`
- **Description**: Choose whether previews appear inline with text or on a new line
- **Example**:
  ```yaml
  ---
  preview-display: inline
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

**`max-bubble-length`**
- **Values**: Number between 50 and 5000
- **Description**: Maximum total characters for bubble-style previews (title + description combined)
- **Note**: Minimum of 50 prevents unusably short previews. Maximum of 5000 prevents performance issues.
- **Example**:
  ```yaml
  ---
  max-bubble-length: 200
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

### URL Display

**`url-display-mode`**
- **Values**: `url-and-preview`, `preview-only`, or `small-url-and-preview`
- **Description**: Control how URLs are displayed alongside previews
  - `url-and-preview`: Show full-sized URL with preview
  - `preview-only`: Hide URL, show only the preview
  - `small-url-and-preview`: Show subtle, non-intrusive URL with preview
- **Example**:
  ```yaml
  ---
  url-display-mode: preview-only
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
preview-display: block
max-card-length: 350
show-favicon: true
include-description: true
url-display-mode: small-url-and-preview
---

# My Research Notes

This page will show card-style previews on new lines, with a maximum length of 350 characters.

https://example.com - This will show as a small URL with a card preview below
```

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
