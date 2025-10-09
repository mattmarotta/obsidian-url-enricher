# Inline Link Preview

Inline Link Preview adds Trello- and Notion-style link cards to Obsidian. Whenever you paste a URL, the plugin fetches the page title and description and replaces the raw link with an inline preview such as:

```
[![](https://trello.com/favicon.ico) Trello – Boards to organize anything — Plan your day better](https://trello.com/)
```

Emoji in titles or descriptions are preserved (unless you turn them off), so Reddit headlines and other rich text sources keep their flair. The favicon is rendered at emoji size for a Trello-style look.

## Features

- Convert pasted URLs into inline previews automatically (can be toggled).
- Display the site favicon before the preview text (can be disabled).
- Keep emoji and other Unicode characters that appear in the source page.
- Command palette action to convert the current selection to a preview.
- Bulk conversion flow that can target the active note, a picked note, an entire folder, or the whole vault.
- Adjustable description length limit plus networking timeout controls.
- Optional status bar countdown when LinkPreview.net throttles requests.

## Usage

### Convert as you write
1. Copy a URL to your clipboard.
2. Paste it into a Markdown editor in Obsidian.
3. The plugin briefly inserts the raw URL, then replaces it with a `[![favicon](favicon) Title — Description](url)` preview once metadata is fetched. If favicons or emoji are disabled in settings, they are omitted from the final text.

If the page cannot be reached, the URL is left as-is so you never lose what you pasted.

### Update existing notes
Run **Convert existing links to inline previews…** from the command palette. Choose one of the available scopes:

- **Active note** – updates only the file you are editing.
- **Select note…** – opens a quick switcher to pick a single file.
- **Folder…** – scans every Markdown file in the chosen folder (recursively).
- **Entire vault** – processes every Markdown file in the vault.

Only bare HTTP/HTTPS links outside of existing Markdown links or code blocks are replaced.

## Settings

Open **Settings → Community plugins → Inline link preview** to tune:

- **Convert links on paste** – enable or disable automatic conversion.
- **Include description** – decide whether to append the description after the title.
- **Description length** – limit how many characters of the description are kept (default 60).
- **Show favicons** – toggle whether the preview starts with the site icon.
- **Keep emoji** – remove emoji if you prefer simpler text.
- **Use LinkPreview.net** – request metadata with your LinkPreview.net API key (falls back to local parsing if disabled or the request fails).
- **LinkPreview.net API key** – stored locally and used only for LinkPreview.net requests.
- **Show rate limit timer** – display a status bar countdown whenever LinkPreview.net throttles requests.
- **Request timeout** – abort metadata fetches that take too long (milliseconds).

Changes apply immediately to future conversions.

## Privacy and network usage

To build a preview the plugin requests the linked page and parses its HTML locally. URLs you paste are sent directly to their target domains; no third-party metadata service is used. Responses are cached in memory for the current Obsidian session and nothing is persisted to disk. If a site is private or requires authentication, the plugin keeps the original URL.

If you enable the LinkPreview.net integration, the pasted URL and your API key are sent to that service first. When the API cannot be reached the plugin silently falls back to local parsing. The plugin watches for rate-limit responses (HTTP 429 or "limit" errors) and pauses LinkPreview.net requests for the recommended wait time (or one hour when unspecified).

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
- `npm run set-version -- <x.y.z>` – update the plugin version across `package.json`, `package-lock.json`, `manifest.json`, and `versions.json`.

Contributions should keep `src/main.ts` focused on lifecycle wiring and place feature logic in dedicated modules. All commands must use Obsidian’s registration APIs so they clean up correctly when the plugin unloads.
