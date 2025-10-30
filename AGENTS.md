# Obsidian URL Enricher Plugin

**Quick Reference** for AI agents and developers working on this plugin.

## Overview

This plugin adds rich, non-destructive link previews to Obsidian. URLs remain as plain text in your notes. The plugin enhances them with live inline previews or cards showing metadata (title, description, favicon) in editor view only.

- **Current version**: 1.0.1
- **Plugin ID**: `url-enricher` (renamed from `obsidian-inline-link-preview` in 0.9.0)
- **Entry point**: [src/main.ts](../../src/main.ts) → compiled to `main.js`
- **Release artifacts**: `main.js`, `manifest.json`, `styles.css`
- **Developer API**: `window.urlEnricher` (also `window.inlineLinkPreview` for compatibility)

## Obsidian Plugin Guidelines

**Important**: All development must comply with Obsidian's official policies and guidelines:

- **[Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)** - Submission requirements and process
- **[Developer policies](https://docs.obsidian.md/Developer+policies)** - Privacy, network usage, and telemetry policies
- **[Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)** - Best practices and requirements

**Key Requirements for This Plugin**:
- ✅ No client-side telemetry or analytics (enforced)
- ✅ Network usage clearly disclosed in README (see "Privacy & Network Usage" section)
- ✅ Uses only Obsidian's `requestUrl` API for HTTP requests (mobile-compatible)
- ✅ No Node.js or Electron APIs (mobile support required)
- ✅ `isDesktopOnly: false` in manifest.json

**Network Requests Made by This Plugin**:
- User-provided URLs (metadata extraction)
- Wikipedia API (article summaries)
- Twitter oEmbed API (tweet content)
- Google Favicon Service (high-res favicons)

All network activity is documented in README.md under "Privacy & Network Usage" section.

## Quick Start

```bash
npm install                    # Install dependencies
npm run dev                    # Watch mode (rebuilds on changes)
npm run build                  # Production build (type-check + bundle)
npm test                       # Run all 558 tests
npm run set-version X.Y.Z      # Bump version (updates 6 files)
```

**Node.js**: 18+ required
**Package manager**: npm (required)
**Bundler**: esbuild (required)

## Project Structure

```
src/
  main.ts                    # Plugin entry point (lifecycle only)
  settings.ts                # Settings interface, defaults, UI
  constants.ts               # Application-wide constants (20+ constants)
  decorators/                # Editor decoration components (5 modules)
    PreviewWidget.ts         # Widget rendering (inline, cards)
    DecorationBuilder.ts     # Core decoration creation logic
    UrlMatcher.ts            # URL pattern matching
    MetadataEnricher.ts      # Text enrichment (hashtags, emojis)
    FrontmatterParser.ts     # Per-note configuration
  editor/
    urlPreviewDecorator.ts   # CodeMirror ViewPlugin coordinator (120 lines)
  services/                  # Business logic services (6 modules + shared types)
    linkPreviewService.ts    # Core metadata fetching with LRU cache
    MetadataFetcher.ts       # HTTP request handling
    HtmlParser.ts            # HTML metadata parsing
    FaviconResolver.ts       # Favicon resolution
    MetadataValidator.ts     # Soft 404 detection
    faviconCache.ts          # Persistent favicon cache (30-day expiration)
    metadataHandlers/        # Domain-specific metadata extraction
    types.ts                 # Shared service contracts
  utils/                     # Utility functions (8 modules)
    LRUCache.ts              # Generic LRU cache (max 1000 items)
    logger.ts                # Structured logging (4 log levels)
    performance.ts           # Performance tracking and profiling
tests/
  # 558 tests across 12 test files, 100% pass rate
```

## Key Technical Concepts

**Non-Destructive Decorations**: CodeMirror 6 ViewPlugin adds visual previews without modifying markdown source. URLs remain as plain text.

**Preview Styles**: Two styles available:
- **Inline** (renamed from "bubble" in 0.9.0): Compact preview with favicon + title
- **Card**: Full preview with image, title, description, favicon, URL

**Type Safety**: 100% type-safe codebase. Zero `any` types. Use `unknown` with type guards for external data.

**LRU Cache**: Memory-bounded metadata cache (max 1000 items) with automatic eviction.

**Concurrency Limiting**: Max 10 parallel HTTP requests to prevent server overload.

**Performance Tracking**: Optional profiling via `window.urlEnricher` API (disabled by default).

**CSS Classes**: Base class is `.url-preview` with modifiers `.url-preview--inline` and `.url-preview--card` (simplified in 0.9.0).

## ⚠️ Critical Gotchas

**1. Frontmatter MUST start on line 1**
```yaml
# ❌ WRONG - Will not work!
# My Note Title

---
preview-style: card
---

# ✅ CORRECT - Frontmatter first!
---
preview-style: card  # Use "inline" or "card" (was "bubble" before 0.9.0)
---

# My Note Title
```

**2. Clear cache when testing metadata changes**
```javascript
// In browser console (Cmd+Option+I / Ctrl+Shift+I)
window.urlEnricher.clearAllCaches()  // or window.inlineLinkPreview for compatibility
window.urlEnricher.refreshDecorations()
```
Cache persists for 30 days. You won't see changes without clearing!

**3. Git hooks require manual setup**
```bash
# After cloning, run this:
git config core.hooksPath .husky

# Verify it worked:
git config core.hooksPath
# Should output: .husky
```

**4. 100% Type Safety Required**
```typescript
// ❌ NEVER use any
function parseData(value: any) { }

// ✅ Use unknown with type guards
function parseData(value: unknown): Data | null {
  if (!isValidData(value)) return null;
  return value;
}
```

**5. Both build AND test must pass**
```bash
# ❌ Only running one is not enough
npm run build

# ✅ Run both (pre-commit hook does this automatically)
npm run build && npm test
```

**6. Never commit build artifacts**
- ❌ `main.js` (generated)
- ❌ `node_modules/` (dependencies)
- ❌ `dist/` (build output)
- ✅ Only commit source files

**7. Constants must go in constants.ts**
```typescript
// ❌ Magic numbers inline
if (cache.size > 1000) { }

// ✅ Named constants
import { METADATA_CACHE_MAX_SIZE } from "./constants";
if (cache.size > METADATA_CACHE_MAX_SIZE) { }
```

## Documentation Structure (Updated for v1.0.0)

**New Modular Documentation** (as of v1.0.0):
- **README.md**: Concise (~130 lines, down from 619) with links to detailed docs
- **assets/**: Visual assets folder (demo.gif, screenshots) - see [assets/README.md](../../assets/README.md)
- **docs/**: Comprehensive documentation organized by audience

### For Users:
- [docs/USER-GUIDE.md](../USER-GUIDE.md) - Complete usage guide (~500 lines)
- [docs/QUICK-REFERENCE.md](../QUICK-REFERENCE.md) - Cheat sheet for settings/commands
- [docs/TROUBLESHOOTING.md](../TROUBLESHOOTING.md) - Common issues and solutions
- [docs/ADVANCED.md](../ADVANCED.md) - Console API, debugging, performance
- [docs/features/FRONTMATTER-SUPPORT.md](../features/FRONTMATTER-SUPPORT.md) - Per-page configuration

### For Developers:
- [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md) - Workflows, checklists, debugging guide
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contributing guidelines, code standards
- [VERSION-MANAGEMENT.md](VERSION-MANAGEMENT.md) - Release process, version bumping, **pre-release checklist**
- [TESTING.md](TESTING.md) - Testing infrastructure, coverage
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture, design patterns

**Documentation Index**: [docs/README.md](../README.md) - Navigation hub for all documentation

**Visual Assets Guide**: [assets/README.md](../../assets/README.md) - Instructions for creating demo GIFs and screenshots

**CHANGELOG Format**:
- Follows [Keep a Changelog](https://keepachangelog.com/) format where possible
- Use sections: `### Added`, `### Changed`, `### Fixed`, `### Removed`
- For breaking changes, use `### Breaking Changes` with nested `####` subsections
- **Critical**: CHANGELOG.md content becomes GitHub release notes automatically
- Write in user-facing language, not technical commit messages

**Pre-Release Checklist**: See [VERSION-MANAGEMENT.md](VERSION-MANAGEMENT.md#pre-release-documentation-checklist) for documentation and asset review checklist before releases.
