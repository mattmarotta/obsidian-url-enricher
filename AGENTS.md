# Obsidian Inline Link Preview Plugin

## Project overview

This plugin adds rich, dynamic link previews to Obsidian. It is **completely non-destructive** — all previews are rendered dynamically in Live Preview mode without modifying markdown source files.

**Key principle**: URLs remain as plain text in your notes. The plugin enhances them with live preview bubbles or cards showing page metadata (title, description, favicon) in the editor view only.

- Target: Obsidian Community Plugin (TypeScript → bundled JavaScript)
- Entry point: `src/main.ts` compiled to `main.js` and loaded by Obsidian
- Required release artifacts: `main.js`, `manifest.json`, `styles.css`
- Current version: 0.4.0

## Environment & tooling

- Node.js: use current LTS (Node 18+ recommended)
- **Package manager: npm** (required)
- **Bundler: esbuild** (required - `esbuild.config.mjs` and build scripts depend on it)
- Types: `obsidian` type definitions
- **Key dependencies**:
  - `@codemirror/view` - ViewPlugin, Decoration API for Live Preview features
  - `@codemirror/state` - StateEffect for reactive settings updates
  - `@codemirror/language` - syntaxTree for syntax analysis and context detection

**Note**: This project has specific technical dependencies on npm and esbuild. Alternative bundlers like Rollup or webpack are acceptable if they bundle all external dependencies into `main.js`.

### Install

```bash
npm install
```

### Dev (watch)

```bash
npm run dev
```

### Production build

```bash
npm run build
```

## Linting

- To use eslint install eslint from terminal: `npm install -g eslint`
- To use eslint to analyze this project use this command: `eslint main.ts`
- eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder: `eslint ./src/`

## File & folder conventions

- **Organize code into multiple files**: Split functionality across separate modules rather than putting everything in `main.ts`
- Source lives in `src/`. Keep `main.ts` small and focused on plugin lifecycle (loading, unloading, registering commands)
- **Current file structure**:
  ```
  src/
    main.ts                    # Plugin entry point, lifecycle management
    settings.ts                # Settings interface, defaults, and UI
    editor/
      faviconDecorator.ts      # (Legacy - not used in non-destructive mode)
      urlPreviewDecorator.ts   # Dynamic URL preview bubbles/cards (key component)
    services/
      linkPreviewService.ts    # Core metadata fetching service
      faviconCache.ts          # Persistent favicon cache with expiration
      types.ts                 # Shared type definitions
      metadataHandlers/        # Domain-specific metadata extraction
        index.ts
        metadataHandler.ts
        googleSearchMetadataHandler.ts
        redditMetadataHandler.ts
    utils/
      editorHelpers.ts         # CodeMirror utilities
      markdown.ts              # Markdown parsing helpers
      stringReplace.ts         # Safe string replacement
      text.ts                  # Text processing and sanitization
      url.ts                   # URL validation and normalization
      vault.ts                 # Vault file operations
  tests/
    run-tests.mjs              # Test runner
    stubs/
      obsidian.ts              # Obsidian API mocks
  ```
- **Do not commit build artifacts**: Never commit `node_modules/`, `main.js`, or other generated files to version control
- Keep the plugin small. Avoid large dependencies. Prefer browser-compatible packages
- Generated output should be placed at the plugin root. Release artifacts must end up at the top level: `main.js`, `manifest.json`, `styles.css`

## Key architectural components

### CodeMirror 6 Decorations
This plugin uses CodeMirror 6's ViewPlugin and Decoration APIs to add visual enhancements to Live Preview mode:

- **urlPreviewDecorator**: Shows preview "bubbles" or "cards" next to bare URLs with title/description using `Decoration.widget()`, `Decoration.replace()`, and `Decoration.mark()`

The decorator:
- Uses `StateEffect` to trigger reactive updates when settings change
- Implements context-aware detection to avoid decorating inappropriate locations (markdown links, code blocks, etc.)
- Supports two preview styles: bubble (compact) and card (prominent)
- Supports two display modes: inline (flows with text, can wrap across lines) and block (appears on new line)
- URL display is automatic: bubbles hide URLs, cards show small editable URLs

## Core technical approaches

### Dynamic Preview Rendering with CodeMirror 6
The plugin uses **CodeMirror 6's decoration API** (`@codemirror/view`) to render live previews:

- `ViewPlugin.fromClass()` creates a stateful decorator that manages decorations
- `Decoration.widget()` inserts custom DOM elements (preview bubbles/cards) after URLs
- `Decoration.replace()` hides URLs for bubble previews; shows small URL widget for cards
- Decorations rebuild on: document changes, viewport changes, or explicit refresh effects
- **Non-destructive**: Source markdown never changes; decorations are view-only

Key capabilities:
- Two preview styles: compact "bubble" or prominent "card"
- Two display modes: "inline" (flows with text) or "block" (new line)
- Three URL display modes: full URL, hidden URL, or small URL
- Frontmatter support for per-page style/display overrides
- Clickable previews open URLs in new tab

### Context Detection
The urlPreviewDecorator uses a **hybrid detection approach** to determine when to show preview bubbles:

1. **Syntax tree analysis** (via `@codemirror/language`): Detects inline code blocks and code fences where URLs should not be decorated
2. **Text-based pattern matching**: Detects markdown links by searching backwards up to 1000 chars for `](` and forwards up to 100 chars for `)`, validating structure

**Why text analysis?** Live Preview mode doesn't expose full markdown structure in the syntax tree. Both bare URLs and URLs inside markdown links appear with parent type "Document", making syntax-only detection impossible.

**Performance**: The hybrid approach analyzes ~1100 chars maximum per URL. Typical performance: ~0.02ms per URL, ~0.3ms for a note with 15 URLs.

### Frontmatter Configuration
Page-level settings can override global preferences using frontmatter:

```yaml
---
preview-style: card      # or bubble
preview-display: inline  # or block
---
```

The decorator parses frontmatter on each render pass using simple regex:
- Checks if document starts with `---`
- Finds closing `---`
- Extracts `preview-style:` and `preview-display:` keys
- Falls back to global settings if not specified

Configuration hierarchy: `frontmatter > global settings`

### Material Design Card Styling
Card previews follow **Google's Material Design** principles:

- **Elevation system**: Multi-layer shadows (level 1 at rest, level 4 on hover)
- **Motion**: Smooth transitions using Material's standard easing `cubic-bezier(0.4, 0, 0.2, 1)`
- **Typography**: Optimized letter-spacing, line-height, and font weights for hierarchy
- **Spacing**: Based on 8dp grid system (padding: 16dp, 20dp)
- **Surface**: 12px border radius with subtle border and shadow
- **Interaction feedback**: Transform and shadow changes on hover/active states

**Reddit card enhancements:**
- Post title displayed prominently at top (font-weight: 600, 1.15em)
- Subreddit shown as caption-style label (0.85em, medium weight, muted color)
- Content preview below with proper line-height (1.6) and muted text
- Structured layout parses `r/Subreddit • Content` format for clean display

### Settings Reactivity
Settings changes trigger immediate updates across all open editor tabs:

```typescript
// In main.ts
refreshDecorations(): void {
  this.app.workspace.iterateAllLeaves((leaf) => {
    const cm = leaf.view.editor?.cm;
    if (cm) {
      cm.dispatch({
        effects: [
          faviconRefreshEffect.of(null),
          urlPreviewRefreshEffect.of(null)
        ]
      });
    }
  });
}
```

Each decorator's ViewPlugin listens for its StateEffect and rebuilds decorations when triggered.

### Metadata Enrichment Pipeline
The `LinkPreviewService` uses a handler chain pattern for domain-specific metadata extraction:

- Base handler: Generic HTML meta tag parsing
- Google Search handler: Extracts search query from URL parameters
- Reddit handler: Custom title formatting for Reddit posts
- **Extensible**: Additional handlers can be registered via `registerMetadataHandler()`

Handlers run in sequence; first match wins.

### Favicon Caching
`FaviconCache` provides persistent storage for favicons:

- Uses Obsidian's `loadData()`/`saveData()` for persistence
- 30-day expiration per domain
- Automatic flushing on plugin unload
- Cache statistics available in settings UI
- Falls back to Google's favicon service (32x32) for reliable coverage

### Settings Reactivity
Settings changes trigger immediate updates across all open editor tabs:

```typescript
// In main.ts
refreshDecorations(): void {
  this.app.workspace.iterateAllLeaves((leaf) => {
    const cm = leaf.view.editor?.cm;
    if (cm) {
      cm.dispatch({
        effects: [
          faviconRefreshEffect.of(null),
          urlPreviewRefreshEffect.of(null)
        ]
      });
    }
  });
}
```

Each decorator's ViewPlugin listens for its StateEffect and rebuilds decorations when triggered.

### Metadata Enrichment Pipeline
The `LinkPreviewService` uses a handler chain pattern for domain-specific metadata extraction:

- **Base handler**: Generic HTML meta tag parsing (Open Graph, Twitter Cards, standard meta tags)
- **Wikipedia handler**: Fetches article descriptions via Wikipedia API
  - Extracts article title from URL path
  - Queries Wikipedia API for extract (intro, 2 sentences)
  - Falls back to short description if available
  - Truncates long extracts to ~200 characters
- **Google Search handler**: Extracts search query from URL parameters for cleaner titles
- **Reddit handler**: Custom formatting for Reddit posts with structured preview data:
  - **Title**: Shows actual post title (not subreddit)
  - **Description**: Formats as `r/Subreddit • Content preview` with ~150 char truncation
  - **Smart rendering**: Card style parses description to show subreddit label separately
- **Extensible**: Additional handlers can be registered via `registerMetadataHandler()`

Handlers run in sequence; first match wins.

**Wikipedia-specific enhancements:**
- Uses MediaWiki API (`/w/api.php?action=query`)
- Extracts clean, plain-text introductory section
- Prioritizes full extract over short description for richer previews
- Handles URL encoding for article titles

**Reddit-specific enhancements:**
- Fetches Reddit JSON API (`/comments/.../post.json`)
- Extracts: post title, subreddit name, selftext content
- Uses special marker format for structured data encoding
- **Card view**: Subreddit in header (beside favicon) → Post title (bold) → Content preview (200 chars)
- **Bubble view**: `r/Subreddit — Post Title` (compact, 100 chars)
- Separate length limits optimize for each display mode

**Favicon quality:**
- Requests 128px favicons from Google's service for high-DPI displays
- Uses Chromium's default `image-rendering: auto` for optimal quality
- GPU acceleration with `transform: translateZ(0)` prevents subpixel blur
- Card mode shows 2em favicons, bubble mode shows 1em
- High-resolution source ensures crisp display at all sizes

### Favicon Caching
`FaviconCache` provides persistent storage for favicons:

- Uses Obsidian's `loadData()`/`saveData()` for persistence
- 30-day expiration per domain
- Automatic flushing on plugin unload
- Cache statistics available in settings UI
- Falls back to Google's favicon service (32x32) for reliable coverage

## Manifest rules (`manifest.json`)

- Must include (non-exhaustive):  
  - `id` (plugin ID; for local dev it should match the folder name)  
  - `name`  
  - `version` (Semantic Versioning `x.y.z`)  
  - `minAppVersion`  
  - `description`  
  - `isDesktopOnly` (boolean)  
  - Optional: `author`, `authorUrl`, `fundingUrl` (string or map)
- Never change `id` after release. Treat it as stable API.
- Keep `minAppVersion` accurate when using newer APIs.
- Canonical requirements are coded here: https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml

## Testing

- Manual install for testing: copy `main.js`, `manifest.json`, `styles.css` (if any) to:
  ```
  <Vault>/.obsidian/plugins/<plugin-id>/
  ```
- Reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Commands & settings

- The plugin is non-destructive and does not provide any commands that modify markdown source.
- All configuration is done through the settings tab.
- Persist settings using `this.loadData()` / `this.saveData()`.
- Settings changes trigger immediate decoration refresh across all open editors.

## Versioning & releases

- Bump `version` in `manifest.json` (SemVer) and update `versions.json` to map plugin version → minimum app version.
- Create a GitHub release whose tag exactly matches `manifest.json`'s `version`. Do not use a leading `v`.
- Attach `manifest.json`, `main.js`, and `styles.css` (if present) to the release as individual assets.
- After the initial release, follow the process to add/update your plugin in the community catalog as required.

## Security, privacy, and compliance

Follow Obsidian's **Developer Policies** and **Plugin Guidelines**. In particular:

- Default to local/offline operation. Only make network requests when essential to the feature.
- No hidden telemetry. If you collect optional analytics or call third-party services, require explicit opt-in and document clearly in `README.md` and in settings.
- Never execute remote code, fetch and eval scripts, or auto-update plugin code outside of normal releases.
- Minimize scope: read/write only what's necessary inside the vault. Do not access files outside the vault.
- Clearly disclose any external services used, data sent, and risks.
- Respect user privacy. Do not collect vault contents, filenames, or personal information unless absolutely necessary and explicitly consented.
- Avoid deceptive patterns, ads, or spammy notifications.
- Register and clean up all DOM, app, and interval listeners using the provided `register*` helpers so the plugin unloads safely.

## UX & copy guidelines (for UI text, commands, settings)

- Prefer sentence case for headings, buttons, and titles.
- Use clear, action-oriented imperatives in step-by-step copy.
- Use **bold** to indicate literal UI labels. Prefer "select" for interactions.
- Use arrow notation for navigation: **Settings → Community plugins**.
- Keep in-app strings short, consistent, and free of jargon.

## Performance

- Keep startup light. Defer heavy work until needed.
- Avoid long-running tasks during `onload`; use lazy initialization.
- Batch disk access and avoid excessive vault scans.
- Debounce/throttle expensive operations in response to file system events.

## Coding conventions

- TypeScript with `"strict": true` preferred.
- **Keep `main.ts` minimal**: Focus only on plugin lifecycle (onload, onunload, addCommand calls). Delegate all feature logic to separate modules.
- **Split large files**: If any file exceeds ~200-300 lines, consider breaking it into smaller, focused modules.
- **Use clear module boundaries**: Each file should have a single, well-defined responsibility.
- Bundle everything into `main.js` (no unbundled runtime deps).
- Avoid Node/Electron APIs if you want mobile compatibility; set `isDesktopOnly` accordingly.
- Prefer `async/await` over promise chains; handle errors gracefully.

## Mobile

- Where feasible, test on iOS and Android.
- Don't assume desktop-only behavior unless `isDesktopOnly` is `true`.
- Avoid large in-memory structures; be mindful of memory and storage constraints.

## Agent do/don't

**Do**
- Add commands with stable IDs (don't rename once released).
- Provide defaults and validation in settings.
- Write idempotent code paths so reload/unload doesn't leak listeners or intervals.
- Use `this.register*` helpers for everything that needs cleanup.

**Don't**
- Introduce network calls without an obvious user-facing reason and documentation.
- Ship features that require cloud services without clear disclosure and explicit opt-in.
- Store or transmit vault contents unless essential and consented.

## Common tasks

### Organize code across multiple files

**main.ts** (minimal, lifecycle only):
```ts
import { Plugin } from "obsidian";
import { MySettings, DEFAULT_SETTINGS } from "./settings";
import { registerCommands } from "./commands";

export default class MyPlugin extends Plugin {
  settings: MySettings;

  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    registerCommands(this);
  }
}
```

**settings.ts**:
```ts
export interface MySettings {
  enabled: boolean;
  apiKey: string;
}

export const DEFAULT_SETTINGS: MySettings = {
  enabled: true,
  apiKey: "",
};
```

**commands/index.ts**:
```ts
import { Plugin } from "obsidian";
import { doSomething } from "./my-command";

export function registerCommands(plugin: Plugin) {
  plugin.addCommand({
    id: "do-something",
    name: "Do something",
    callback: () => doSomething(plugin),
  });
}
```

### Add a command

```ts
this.addCommand({
  id: "your-command-id",
  name: "Do the thing",
  callback: () => this.doTheThing(),
});
```

### Persist settings

```ts
interface MySettings { enabled: boolean }
const DEFAULT_SETTINGS: MySettings = { enabled: true };

async onload() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  await this.saveData(this.settings);
}
```

### Register listeners safely

```ts
this.registerEvent(this.app.workspace.on("file-open", f => { /* ... */ }));
this.registerDomEvent(window, "resize", () => { /* ... */ });
this.registerInterval(window.setInterval(() => { /* ... */ }, 1000));
```

### Create a CodeMirror 6 ViewPlugin decorator

```ts
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { StateEffect } from "@codemirror/state";

// Define a StateEffect for triggering updates
export const refreshEffect = StateEffect.define<null>();

export function createMyDecorator() {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      // Rebuild on document changes or when refresh effect is dispatched
      if (update.docChanged || update.transactions.some(tr => 
        tr.effects.some(e => e.is(refreshEffect))
      )) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      // Your decoration logic here
      return Decoration.none;
    }
  }, {
    decorations: v => v.decorations
  });
}
```

### Trigger decoration updates from settings

```ts
// In main.ts
refreshDecorations(): void {
  this.app.workspace.iterateAllLeaves((leaf) => {
    if (leaf.view.getViewType() === "markdown") {
      const view = leaf.view as any;
      const cm = view.editor?.cm;
      
      if (cm) {
        cm.dispatch({
          effects: [refreshEffect.of(null)]
        });
      }
    }
  });
}

// In settings.ts - call after settings change
await this.plugin.saveSettings();
this.plugin.refreshDecorations();
```

### Add a metadata handler for domain-specific enrichment

```ts
import type { MetadataHandler, MetadataHandlerContext } from "./metadataHandler";

export const myDomainMetadataHandler: MetadataHandler = {
  canHandle(url: string): boolean {
    return url.includes("mydomain.com");
  },

  async enrich(context: MetadataHandlerContext): Promise<void> {
    // Modify context.metadata.title or description
    context.metadata.title = "Custom title for " + context.url;
  }
};

// Register in linkPreviewService.ts
this.linkPreviewService.registerMetadataHandler(myDomainMetadataHandler);
```

## Troubleshooting

- Plugin doesn't load after build: ensure `main.js` and `manifest.json` are at the top level of the plugin folder under `<Vault>/.obsidian/plugins/<plugin-id>/`. 
- Build issues: if `main.js` is missing, run `npm run build` or `npm run dev` to compile your TypeScript source code.
- Commands not appearing: verify `addCommand` runs after `onload` and IDs are unique.
- Settings not persisting: ensure `loadData`/`saveData` are awaited and you re-render the UI after changes.
- Mobile-only issues: confirm you're not using desktop-only APIs; check `isDesktopOnly` and adjust.

### Testing Changes and Cache Management

**CRITICAL**: This plugin caches metadata (titles, descriptions) and favicons for 30 days to improve performance and reduce network requests. When testing changes to metadata extraction or favicon handling:

1. **Always clear the cache** before testing:
   - Go to **Settings → Community plugins → Inline Link Preview**
   - Scroll to **Cache Management** section
   - Click **Clear cache** button
   - This clears both metadata and favicon caches

2. **When to clear cache**:
   - After modifying metadata handlers (Reddit, Wikipedia, etc.)
   - After changing favicon fetching logic
   - After updating CSS that affects rendering
   - When testing improvements to title/description extraction
   - If you're not seeing expected changes after a rebuild

3. **Cache behavior**:
   - Metadata is cached per URL (titles, descriptions)
   - Favicons are cached per domain for 30 days
   - Cache persists across Obsidian restarts
   - Cached data won't update until cache is cleared or expires

4. **Proper testing workflow**:
   ```bash
   # 1. Make code changes
   npm run build
   
   # 2. Reload plugin in Obsidian
   # Ctrl+P (Cmd+P) → "Reload app without saving"
   
   # 3. Clear cache in settings
   # Settings → Inline Link Preview → Clear cache
   
   # 4. Test with URLs
   # Create/view notes with target URLs
   ```

5. **Agent guidance**:
   - When making changes to metadata extraction, favicon handling, or preview rendering
   - Always remind the user to clear the cache before testing
   - Explain that cached data will prevent them from seeing changes
   - This applies to: metadata handlers, favicon logic, service layer changes

**Example agent message after making changes:**
> "I've updated the [feature]. Please clear the cache to test the changes:
> 1. Open Settings → Inline Link Preview
> 2. Click 'Clear cache' button
> 3. Test with a fresh URL or one you haven't previewed recently"

## References

- Obsidian sample plugin: https://github.com/obsidianmd/obsidian-sample-plugin
- API documentation: https://docs.obsidian.md
- Developer policies: https://docs.obsidian.md/Developer+policies
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Style guide: https://help.obsidian.md/style-guide
