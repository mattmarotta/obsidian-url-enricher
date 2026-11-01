# Obsidian URL Enricher Plugin

Quick reference for AI agents and developers working on this plugin.

## Overview

Adds non-destructive link previews to Obsidian's Live Preview editor. URLs stay as plain text in the note; a CodeMirror 6 ViewPlugin draws an inline preview or a card (favicon, title, description, site name) over them.

- **Current version**: 1.4.4
- **Plugin ID**: `url-enricher`
- **Entry point**: `src/main.ts`, bundled by esbuild to `main.js`
- **Release artifacts**: `main.js`, `manifest.json`, `styles.css`
- **Developer API**: `window.urlEnricher` (also `window.inlineLinkPreview`): `getCacheStats()`, `clearAllCaches()`, `refreshDecorations()`, `help()`

## Obsidian plugin guidelines

All changes must comply with:

- [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- [Developer policies](https://docs.obsidian.md/Developer+policies) (privacy, network use, telemetry)
- [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)

Key requirements for this plugin:

- No telemetry or analytics
- Every network request is disclosed in README.md ("Privacy and network usage")
- HTTP only through Obsidian's `requestUrl`; no Node.js or Electron APIs (mobile is supported, `isDesktopOnly: false`)

**Network requests made by the plugin** (keep README.md in sync when this changes):

- The URLs in the user's notes (HTML metadata). `www`/`new`/`np.reddit.com` links are fetched from `old.reddit.com` instead.
- Reddit posts: `old.reddit.com/…/.json`, then `www.reddit.com/oembed` as a fallback; share links (`/r/<sub>/s/<id>`) are resolved through `www.reddit.com`.
- Wikipedia: the article's own host, `/w/api.php` (intro extract).
- Twitter/X: `publish.twitter.com/oembed`.
- Favicons: `www.google.com/s2/favicons`, loaded as an image by the preview.

## Quick start

```bash
npm install                    # Install dependencies (Node.js 18+, npm)
git config core.hooksPath .husky   # Enable the pre-commit hook (once per clone)
npm run dev                    # Watch mode
npm run build                  # Type-check + production bundle
npm run lint                   # ESLint with eslint-plugin-obsidianmd
npm test                       # Vitest suite
npm run set-version X.Y.Z      # Bump the version everywhere (see release process)
```

## Project structure

```
src/
  main.ts                      # Plugin lifecycle and developer API
  settings.ts                  # Settings interface, defaults, normalization, settings tab
  constants.ts                 # Shared constants (length limits, cache sizes, ...)
  decorators/
    DecorationBuilder.ts       # Scans visible ranges, truncates text, builds decorations
    FrontmatterParser.ts       # Per-note overrides via getFrontMatterInfo + parseYaml
    MetadataEnricher.ts        # Emoji stripping, media-link cleanup, hashtag/mention styling
    PreviewWidget.ts           # Inline/card widget and error indicator
    UrlMatcher.ts              # Wikilink, markdown-link, and bare-URL matching
  editor/
    urlPreviewDecorator.ts     # CodeMirror ViewPlugin: when to rebuild, fetch queueing
  services/
    linkPreviewService.ts      # Fetch pipeline, in-memory LRU cache, concurrency limit
    MetadataFetcher.ts         # requestUrl wrapper with timeout
    HtmlParser.ts              # Open Graph / Twitter Card / JSON-LD parsing
    MetadataValidator.ts       # Soft-404 detection
    favicon.ts                 # Google favicon URL for a page
    types.ts                   # LinkMetadata
    metadataHandlers/
      index.ts                 # Default handler list
      metadataHandler.ts       # Handler interface and context
      googleSearchMetadataHandler.ts
      linkedinMetadataHandler.ts
      redditMetadataHandler.ts
      twitterMetadataHandler.ts
      wikipediaMetadataHandler.ts
  types/
    obsidian-extended.ts       # Editor typings Obsidian doesn't export
    window.d.ts                # window.urlEnricher typings
  utils/
    LRUCache.ts                # Size-bounded cache with hit/miss stats
    text.ts                    # HTML entity decoding, tag stripping, whitespace
    url.ts                     # rewriteUrlForFetch (Reddit → old.reddit.com)
tests/                         # Vitest; `obsidian` is aliased to tests/mocks/obsidian.ts
```

## Key technical concepts

- **Non-destructive decorations.** Inline mode replaces the URL range with a widget; card mode adds a widget before the URL and dims the URL. The note text never changes.
- **Visible ranges only.** Each rebuild scans `view.visibleRanges` (expanded to whole lines), so only on-screen links are matched and fetched. Scrolling triggers a rebuild that fetches newly visible links.
- **Rebuild triggers.** Doc changes, viewport changes, Live Preview toggles, and the refresh effect. A cursor move rebuilds only in inline mode, and only when the cursor enters or leaves a URL (the URL under the cursor shows as raw text).
- **Truncation happens once,** in `DecorationBuilder.processMetadata`. Widgets render what they are given.
- **`LinkMetadata.context`** is an optional leading label (Reddit sets `r/<sub>`). Inline renders `<context> — <title>`; cards put the context in the header, then the title and description.
- **Caching.** Metadata is cached in memory only (LRU, `METADATA_CACHE_MAX_SIZE`), so it is lost when Obsidian restarts. Favicon URLs are computed from the hostname, not cached.
- **Concurrency.** At most `MAX_CONCURRENT_REQUESTS` fetches run at once; duplicate requests for a URL share one promise.
- **Per-note settings.** Frontmatter overrides global settings (`pageConfig.x ?? settings.x`) and applies as you type. Only the frontmatter block is read, and its parse is cached on its text.
- **CSS classes.** Base `.url-preview`, with `--inline` / `--card`, color modes `--none` / `--subtle`, and `--loading`.

## Critical gotchas

1. **Frontmatter must start on line 1** with `---`. Values are read with standard YAML rules, so a value saved as `'"card"'` (what the Properties panel writes when you type the quotes) is the literal text `"card"` and is ignored. Keep it that way to match how Obsidian and other plugins read properties. "Require frontmatter to activate" needs at least one URL Enricher property (such as `preview-style`); other frontmatter like `tags` doesn't count.
2. **Reload to see metadata changes.** Run `window.urlEnricher.clearAllCaches()` then `window.urlEnricher.refreshDecorations()` in the console, or use Settings → URL Enricher → Clear cache.
3. **Build, lint, and test must all pass.** The pre-commit hook runs all three, but only after `git config core.hooksPath .husky`.
4. **No `any`.** Use `unknown` and narrow it (for example the result of `parseYaml`).
5. **No `innerHTML`/`outerHTML` and no `.style` assignments** (including `style.setProperty`). Use the DOM API and CSS classes in `styles.css`. Custom colors are left to user CSS snippets.
6. **Use popout-safe globals:** `createEl` / `createDiv` / `createSpan`, `activeDocument`, `window.setTimeout`.
7. **No console logging** beyond essential warnings and errors.
8. **Constants go in `src/constants.ts`,** not inline.
9. **Never commit build artifacts:** `main.js`, `node_modules/`, `data.json` are gitignored.

## Documentation

- `README.md`: users, including the privacy section
- `TROUBLESHOOTING.md`: common problems
- `CONTRIBUTING.md`: setup, code standards, **release checklist**
- `.github/workflows/README.md`: CI and release workflows
- `examples/demo-vault/`: sample notes for manual testing
- `CHANGELOG.md`: Keep a Changelog sections (`Added`, `Changed`, `Fixed`, `Removed`) under `## [Unreleased]`. It becomes the GitHub release notes, so write for users.

## Release process

Follow the [Release Checklist in CONTRIBUTING.md](CONTRIBUTING.md#release-checklist). `master` is protected: the version bump lands through its own PR, and the tag is pushed **after** that merge. Never run `git push origin master --tags`.
