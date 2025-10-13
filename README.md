# Inline Link Preview

Inline Link Preview adds Trello- and Notion-style link cards to Obsidian. Whenever you paste a URL, the plugin fetches the page title and description and replaces the raw link with an inline preview such as:

```
[![](https://trello.com/favicon.ico) Trello – Boards to organize anything — Plan your day better](https://trello.com/)
```

Emoji in titles or descriptions are preserved (unless you turn them off), so Reddit headlines and other rich text sources keep their flair. The favicon is rendered at emoji size for a Trello-style look.

## Features

- **Hybrid approach**: Choose between automatic conversion (URLs replaced with markdown) or dynamic preview mode (URLs stay intact but show live previews in Live Preview).
- Convert pasted URLs—including multi-line lists—into inline previews automatically (can be toggled).
- **Dynamic preview mode**: When enabled, bare URLs show inline previews in Live Preview without modifying your markdown source.
  - **Three display modes**: URL + Preview, Preview Only, or Small URL + Preview (recommended)
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

Open **Settings → Community plugins → Inline link preview** to tune:

- **Convert links on paste** – enable or disable automatic conversion.
- **Dynamic preview mode** – when enabled, bare URLs show inline previews in Live Preview mode without modifying the markdown source. Great for keeping notes portable while still seeing rich link information.
- **URL display mode** – choose how previews appear in dynamic mode:
  - **URL + Preview**: Show the full URL in standard link style with preview bubble
  - **Preview Only**: Hide the URL completely, show only the preview (clickable bubble)
  - **Small URL + Preview**: Show a subtle, faded, smaller URL with preview (recommended - least intrusive)
- **Include description** – decide whether to append the description after the title.
- **Description length** – limit how many characters of the description are kept (default 60). Higher values enable word-wrapping for multi-line previews.
- **Show favicons** – toggle whether the preview starts with the site icon.
- **Keep emoji** – remove emoji if you prefer simpler text.
- **Request timeout** – abort metadata fetches that take too long (milliseconds).
- **Cache management** – view cache statistics (number of cached domains, oldest entry date) and clear the favicon cache if needed.

Changes apply immediately to future conversions.

### Dynamic vs. Conversion Modes

**Conversion mode** (default): When you paste a URL, it's automatically replaced with `[Title — Description](url)` in your markdown source. This creates a permanent, readable link in your notes.

**Dynamic preview mode**: URLs remain as plain text in your markdown source (e.g., `https://example.com`), but in Live Preview they appear with an inline preview bubble showing the title, description, and favicon. The source stays clean and portable, while you still get rich visual feedback.

The **URL display mode** setting controls how dynamic previews appear:
- **URL + Preview**: Best when you want standard link styling (blue/purple, underlined)
- **Preview Only**: Best for the cleanest reading experience - URLs are completely hidden but preview bubbles are clickable
- **Small URL + Preview** (recommended): Best for most users - URLs appear subtle and non-intrusive (75% size, faded, no underline) while remaining fully visible, clickable, and editable

All preview bubbles are clickable and will open the URL in a new tab. Settings changes apply immediately without needing to navigate away from your current note.

You can use both conversion and dynamic modes together or switch between them based on your workflow.

## Privacy and network usage

To build a preview the plugin requests the linked page and parses its HTML locally. Favicons are fetched from Google's public favicon service at 32x32 resolution for consistent, high-quality icons across all sites. URLs you paste are sent directly to their target domains; no additional third-party metadata service is used. 

Favicon URLs are cached on disk for 30 days to improve performance and reduce network requests. The cache stores only the mapping between domains and their favicon URLs (e.g., `reddit.com → https://www.google.com/s2/favicons?domain=reddit.com`), not the actual images or page content. If a site is private or requires authentication, the plugin keeps the original URL.

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
