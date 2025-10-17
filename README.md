# Inline Link Preview

Inline Link Preview adds Trello- and Notion-style link cards to Obsidian. Whenever you paste a URL, the plugin fetches the page title and description and rep## Development

- `npm install` – install dependencies.
- `npm run dev` – watch mode with incremental builds.
- `npm run build` – type-check and create a production bundle.
- `npm run set-version -- <x.y.z>` – update the plugin version across `package.json`, `package-lock.json`, `manifest.json`, and `versions.json`.

Contributions should keep `src/main.ts` focused on lifecycle wiring and place feature logic in dedicated modules. The plugin is designed to be completely non-destructive, so any new features must respect this principle and not modify markdown source files. raw link with an inline preview such as:

```
# Inline Link Preview

Inline Link Preview adds rich, live preview bubbles or cards for URLs in Obsidian. This plugin is **completely non-destructive** — your markdown source stays unchanged while URLs are enhanced with metadata previews in Live Preview mode.

When you have a bare URL in your notes like `https://trello.com`, the plugin automatically fetches the page title, description, and favicon, displaying them as an inline preview bubble or prominent card right in your editor — all without modifying your source markdown.

## Features

- **100% Non-Destructive**: URLs remain as plain text in your markdown. All previews are rendered dynamically in Live Preview mode only.
- **Two Preview Styles**:
  - **Bubble**: Compact, subtle inline preview that flows with your text (hides the URL)
  - **Card**: Prominent card-style preview with more visual weight and detail (shows small editable URL)
- **Flexible Display Modes**:
  - **Inline**: Previews flow with surrounding text on the same line
  - **Block**: Previews appear on their own line for better separation
- **Automatic URL Display**:
  - **Cards**: Show a small, subtle URL (editable) with the card preview
  - **Bubbles**: Hide the URL completely and replace it with the bubble preview
- **Page-Level Configuration**: Override global settings using frontmatter:
  ```yaml
  ---
  preview-style: card    # or bubble
  preview-display: inline # or block
  ---
  ```
- **Rich Metadata Display**:
  - Site favicons displayed at emoji size for crisp quality
  - Page titles and descriptions
  - Emoji preservation (optional)
  - Customizable description length with natural word-wrapping
  - Domain-aware enrichments for Google Search and Reddit links
- **Real-Time Updates**: Settings changes apply immediately without page navigation
- **Clickable Previews**: All preview bubbles and cards are clickable to open URLs
- **Cursor-Aware Previews**: Previews instantly hide when cursor is inside a URL, preventing accidental edits and providing clear visual feedback during editing
- **Smart Context Detection**: Automatically generates previews for:
  - Bare URLs: `https://example.com`
  - Markdown links: `[text](https://example.com)` or `[https://example.com](https://example.com)`
  - Wikilinks with URLs: `[[https://example.com]]` (URL only, not page names like `[[My Page]]`)
  
  And skips URLs in:
  - Image embeds `![alt](url)`
  - Code blocks and inline code
- **Persistent Caching**: Favicons cached for 30 days to minimize network requests
- **YouTube-Friendly**: Treats YouTube links as standard previews, avoiding unwanted embeds

## Usage

### Supported URL Formats
The plugin automatically generates previews for URLs in these formats:

1. **Bare URLs**: `https://example.com`
2. **Markdown links**: 
   - `[text](https://example.com)` - uses "text" as the title
   - `[https://example.com](https://example.com)` - fetches metadata title
3. **Wikilinks with URLs**: `[[https://example.com]]`
   - ⚠️ **Important**: Only URLs are supported, not Obsidian page names
   - ✅ Works: `[[https://github.com]]` (actual URL)
   - ❌ Doesn't work: `[[My Page]]` (page name - normal wikilink behavior)

### Basic Usage
1. Paste or type a bare URL in your note: `https://github.com`
2. In Live Preview mode, the URL automatically gains a rich preview showing the page title, description, and favicon
3. Click the preview bubble/card to open the URL in a new tab
4. Your markdown source remains untouched — the URL is still just plain text

### Per-Page Configuration
Add frontmatter to your note to customize preview appearance:

```yaml
---
preview-style: card              # Use prominent card style instead of bubble
preview-display: inline          # Keep previews inline with text
max-card-length: 400             # Maximum characters for card previews
show-favicon: true               # Show/hide favicons
include-description: true        # Include/exclude descriptions
---
```

**Note**: URL display is automatic based on preview style—cards show a small editable URL, bubbles hide the URL entirely.

These settings override your global preferences for that specific page only. For a complete list of available frontmatter properties and examples, see [FRONTMATTER-SUPPORT.md](FRONTMATTER-SUPPORT.md).

## Settings

Open **Settings → Community plugins → Inline link preview** to configure:
```

Emoji in titles or descriptions are preserved (unless you turn them off), so Reddit headlines and other rich text sources keep their flair. The favicon is rendered at emoji size for a Trello-style look.

## Features

- **Hybrid approach**: Choose between automatic conversion (URLs replaced with markdown) or dynamic preview mode (URLs stay intact but show live previews in Live Preview).
- Convert pasted URLs—including multi-line lists—into inline previews automatically (can be toggled).
- **Dynamic preview mode**: When enabled, bare URLs show inline previews in Live Preview without modifying your markdown source.
  - **Automatic URL display**: Cards show small editable URLs, bubbles hide URLs entirely
  - **Clickable preview bubbles**: Click any preview bubble to open the URL in a new tab
  - **Real-time settings updates**: Changes apply immediately without page navigation
  - **Flexible description length**: Control how much metadata is shown with natural word-wrapping
  - Keeps your markdown portable while providing rich visual feedback
- Display the site favicon before the preview text (can be disabled).
- Favicons are displayed dynamically in Live Preview mode at 32x32 resolution for crisp quality.
- Uses Google's favicon service for reliable coverage across all sites.
- Favicons are not embedded in the Markdown, keeping source files clean and readable.
- Treat YouTube links as standard previews with the site favicon, avoiding unwanted video embeds.
- Keep emoji and other Unicode characters that appear in the source page.
- Command palette action to convert the current selection to a preview.
- Bulk conversion flow that can target the active note, a picked note, an entire folder, or the whole vault.
- Adjustable description length limit plus networking timeout controls.
- Domain-aware metadata enrichments for Google search and Reddit links, with an extensible handler pipeline for additional sites.
- Floating progress indicator while multiple links are being processed.
- Persistent favicon cache with 30-day expiration and cache statistics display.

## Usage

### Convert as you write
1. Copy a URL to your clipboard.
2. Paste it into a Markdown editor in Obsidian.
3. The plugin briefly inserts the raw URL (or list of URLs), then replaces each entry with a `[Title — Description](url)` preview once metadata is fetched. A temporary floating progress banner appears when multiple links are being processed so you can tell work is underway. If emoji are disabled in settings, they are omitted from the final text.
4. When favicons are enabled, they appear dynamically in Live Preview mode before each link (not embedded in the Markdown).

If the page cannot be reached, the URL is left as-is so you never lose what you pasted.

### Update existing notes
Run **Convert existing links to inline previews…** from the command palette. Choose one of the available scopes:

- **Active note** – updates only the file you are editing.
- **Select note…** – opens a quick switcher to pick a single file.
- **Folder…** – scans every Markdown file in the chosen folder (recursively).
- **Entire vault** – processes every Markdown file in the vault.

Only bare HTTP/HTTPS links outside of existing Markdown links or code blocks are replaced.

The floating progress banner tracks how many notes remain and highlights the one currently processing. If the active note is being converted you’ll see a reminder not to edit it until the update finishes.

## Settings

Open **Settings → Community plugins → Inline link preview** to configure:

### Core Settings
- **Dynamic preview mode** – Enable or disable the plugin entirely. When enabled, bare URLs show rich previews in Live Preview mode.

### Preview Appearance
- **Preview style** – Choose between:
  - **Bubble**: Compact, subtle inline style (default)
  - **Card**: Prominent card style with more visual weight
- **Display mode** – Choose whether previews appear:
  - **Inline**: Flows with surrounding text on the same line
  - **Block**: Appears on its own line (default)
- **Preview background color** – Customize background color for both bubbles and cards (none, grey, or custom)

**Note**: URL display is automatic—cards show a small editable URL, bubbles hide the URL entirely.

### Preview Content
- **Include description** – Show page description after the title
- **Description length** – Maximum characters for descriptions (default: 60)
- **Show favicons** – Display site icons before preview text
- **Keep emoji** – Preserve emoji from page titles and descriptions
- **Request timeout** – Network timeout in milliseconds (default: 7000)

### Cache Management
- View cache statistics (cached domains, oldest entry)
- Clear favicon cache if needed

### Per-Page Overrides
Global settings can be overridden per-page using frontmatter. Supported properties include:

```yaml
---
preview-style: card              # or bubble
preview-display: inline          # or block
max-card-length: 400             # 100-5000
max-bubble-length: 200           # 50-5000
show-favicon: true               # or false
include-description: true        # or false
preview-color-mode: grey         # or none, custom
custom-preview-color: "#4a4a4a"  # hex color when using custom mode
---
```

**Notes**: 
- Minimum values (100 for cards, 50 for bubbles) prevent unusably short previews. Maximum value (5000) prevents performance issues with extremely long descriptions.
- URL display is automatic: Cards show a small editable URL, bubbles hide the URL entirely.

For detailed documentation and examples, see [FRONTMATTER-SUPPORT.md](FRONTMATTER-SUPPORT.md).

Changes apply immediately to future previews and when you navigate between notes.

## Cursor-Aware Previews

One of the plugin's most powerful UX features is **cursor-aware preview rendering**. Previews automatically hide when you position your cursor inside a URL, giving you instant visual feedback that you're editing the raw URL.

### How It Works

**When cursor is outside a URL:**
- URL shows rich preview with title, description, and favicon
- `https://github.com` → 🎨 **GitHub Preview Card**

**When cursor is inside a URL:**
- Preview instantly disappears, showing raw URL
- `https://github.com|` ← Raw URL visible, ready to edit

**When cursor moves away:**
- Preview automatically returns
- `https://github.com` → 🎨 **GitHub Preview Card**

### Why This Matters for UX

1. **Prevents Accidental Edits**
   - You can't accidentally modify a URL without seeing it first
   - Clear visual distinction between "viewing" and "editing" states

2. **No URL Corruption**
   - When cursor is at the end of a URL, you immediately see the raw URL
   - Prevents typing text that accidentally becomes part of the URL
   - No need to guess if you're about to edit the URL or type after it

3. **Familiar Editing Pattern**
   - Works like inline code, LaTeX, or other "expandable" elements in many editors
   - Click to edit, click away to see preview
   - Intuitive for users familiar with modern editing tools

4. **Uninterrupted Typing**
   - Type `[[https://www.amaz` without previews appearing mid-typing
   - Preview only appears when you move cursor away
   - No jarring visual changes while composing

5. **Easy URL Corrections**
   - Click anywhere in a preview to instantly see and edit the raw URL
   - Make changes, move cursor away → preview updates automatically
   - Fast iteration when fixing typos or updating links

This behavior applies to all URL formats: bare URLs, markdown links `[text](url)`, and wikilinks `[[url]]`.

### URL Error Detection

The plugin detects and flags broken URLs with a small warning indicator (⚠️). URLs with errors remain fully visible and editable—they are not replaced with previews.

**Types of errors detected:**

1. **HTTP Errors** (controllable via "HTTP Error Warnings" setting):
   - **403 Forbidden** - Site blocks automated requests (common for e-commerce sites with bot protection)
   - **404 Not Found** - Page doesn't exist or URL is incorrect
   - **500+ Server Error** - Website server encountered an error
   - **Soft 404s** - Page returns 200 OK but shows error content:
     - Reddit: "page not found", "this community doesn't exist"
     - YouTube: "video unavailable", "video has been removed"
     - Generic pages with titles like "404 Not Found"

2. **Network Errors** (always shown):
   - **DNS resolution failure** - Domain doesn't exist
   - **Connection timeout** - Can't reach the server
   - **SSL/TLS errors** - Certificate problems
   - **No internet connection** - You're offline

**Controlling error warnings:**

Go to **Settings → Inline Link Preview → Preview Content → HTTP Error Warnings**:
- **Enabled (default)**: Show ⚠️ for both HTTP errors and network failures
- **Disabled**: Only show ⚠️ for network failures; HTTP errors will show fallback previews without warnings

**Error indicator tooltips:**
- **HTTP errors**: "HTTP error (403/404). Disable warnings in settings."
- **Network errors**: "Network error at URL. Cannot generate preview."

**When to disable HTTP error warnings:**
- Sites that block bots (403 Forbidden) but you know the URL is valid
- You prefer to see fallback previews even for potentially broken pages
- You want to reduce visual clutter and manually verify broken URLs yourself

## Privacy and network usage

To build a preview, the plugin requests the linked page and parses its HTML locally. Favicons are fetched from Google's public favicon service at 32x32 resolution for consistent, high-quality icons across all sites. URLs are sent directly to their target domains; no additional third-party metadata service is used.

Favicon URLs are cached on disk for 30 days to improve performance and reduce network requests. The cache stores only the mapping between domains and their favicon URLs (e.g., `reddit.com → https://www.google.com/s2/favicons?domain=reddit.com`), not the actual images or page content. If a site is private or requires authentication, the plugin will not be able to fetch metadata.

**The plugin is completely non-destructive**: It never modifies your markdown source files. All previews are rendered dynamically in Live Preview mode only.

## Installation

Manual installation for testing:

1. Clone this repository into `<Vault>/.obsidian/plugins/obsidian-inline-link-preview/`.
2. Run `npm install`.
3. Run `npm run build` to generate `main.js`.
4. Enable **Inline Link Preview** inside **Settings → Community plugins**.

The release bundle consists of `manifest.json`, `main.js`, and optionally `styles.css`.

## Development

- `npm install` – install dependencies.
- `npm run dev` – watch mode with incremental builds.
- `npm run build` – type-check and create a production bundle.
- `npm test` – run unit tests for preview formatting and paste conversion helpers.
- `npm run set-version -- <x.y.z>` – update the plugin version across `package.json`, `package-lock.json`, `manifest.json`, and `versions.json`.

Contributions should keep `src/main.ts` focused on lifecycle wiring and place feature logic in dedicated modules. All commands must use Obsidian’s registration APIs so they clean up correctly when the plugin unloads.
