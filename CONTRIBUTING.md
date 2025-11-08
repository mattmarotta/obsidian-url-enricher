# Contributing Guide

Thank you for contributing to URL Enricher! This guide covers setup, standards, and workflows.

## Quick Setup

```bash
git clone https://github.com/mattmarotta/obsidian-url-enricher.git
cd obsidian-url-enricher
npm install
npm run dev    # Watch mode
```

**Link to test vault:**
```bash
ln -s "$(pwd)" "/path/to/vault/.obsidian/plugins/url-enricher"
```

**⚠️ IMPORTANT: Enable git hooks**
```bash
git config core.hooksPath .husky
```

This runs TypeScript validation and tests before each commit.

## Before You Commit

- [ ] `npm run build` passes (no TypeScript errors)
- [ ] `npm test` passes (all 558 tests)
- [ ] Used conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- [ ] Updated relevant documentation

**Both checks are required!** Pre-commit hooks verify this automatically.

## Code Standards

### Type Safety
- **NEVER use `any`** - Use `unknown` with type guards instead
- 100% type-safe codebase (build fails with `any` types)
- Enable strict mode for all TypeScript

```typescript
// ❌ Wrong
function parseData(value: any) { }

// ✅ Correct
function parseData(value: unknown): Data | null {
  if (!isValidData(value)) return null;
  return value;
}
```

### Constants
- **Always add to `constants.ts`** - Never inline magic numbers
- Use descriptive names

```typescript
// ❌ Wrong
if (cache.size > 1000) { }

// ✅ Correct
import { CACHE_MAX_SIZE } from "./constants";
if (cache.size > CACHE_MAX_SIZE) { }
```

### Obsidian Plugin Requirements

**⚠️ CRITICAL:** These patterns are **required for Obsidian plugin approval**. The automated review bot will flag violations.

#### No Inline Styles - Use CSS Classes

```typescript
// ❌ Wrong - Inline style assignments
element.style.color = "red";
element.style.fontSize = "16px";
element.style.cssText = "color: red; font-size: 16px;";

// ✅ Correct - CSS classes in styles.css
element.className = "my-custom-class";
element.addClass("another-class");

// ❌ Wrong - .style.setProperty() has NO EXCEPTIONS
// This includes CSS custom properties for user-provided values
document.documentElement.style.setProperty('--custom-color', userColor);

// ✅ Correct - Use CSS classes with predefined CSS variables
element.addClass('url-preview--subtle'); // Uses var(--background-modifier-border)
```

**Why No Custom Colors?**
Custom color pickers were removed for:
1. **Plugin Review Compliance**: `.style.setProperty()` is prohibited (no exceptions)
2. **Dark Mode Compatibility**: Hard-coded colors break readability in light/dark themes

Users needing custom colors can use CSS snippets (see README.md).

#### No innerHTML - Use DOM API

```typescript
// ❌ Wrong - Security risk
element.innerHTML = `<strong>Title:</strong> ${text}`;
textarea.innerHTML = htmlEntities;

// ✅ Correct - DOM API
const strong = document.createElement('strong');
strong.textContent = 'Title:';
element.appendChild(strong);
element.appendChild(document.createTextNode(text));
```

#### Minimize Console Logging

```typescript
// ❌ Wrong - Excessive debug logs
console.log('[plugin] Processing URL:', url);
console.log('[plugin] Metadata fetched:', metadata);

// ✅ Correct - Use Logger utility (disabled by default)
import { Logger } from './utils/logger';
const logger = new Logger('ModuleName');
logger.debug('Processing URL:', url);

// ✅ OK - Essential errors and warnings
console.warn('[url-enricher] Failed to fetch:', error);
console.error('[url-enricher] Critical failure:', error);

// ✅ OK - Intentional developer tools
console.log('API available at window.urlEnricher');
```

#### Real-Time Frontmatter Updates

Per-page frontmatter settings apply instantly as users type—no navigation required.

**Implementation:**
- CodeMirror 6's `ViewPlugin.update()` triggers on document changes
- `parsePageConfig()` parses frontmatter on every rebuild
- Widget-scoped CSS classes enable per-widget customization
- Frontmatter overrides global settings: `pageConfig.field ?? globalSettings.field`

**Example:**
```yaml
---
inline-color-mode: none    # Page-specific setting
card-color-mode: subtle
---
```

Changes apply immediately—decorations rebuild automatically on frontmatter edits.

### Style
- Tabs for indentation
- Double quotes for strings
- Semicolons required
- 100 character line length (soft limit)

### Testing
- All new features must include tests
- Bug fixes should include regression tests
- Maintain 100% pass rate

See tests/ for examples. Follow existing patterns.

## Common Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Watch mode (rebuilds on changes)
npm run build                  # Production build
npm test                       # Run all tests
npm run test:watch             # Test watch mode
npm run test:coverage          # Coverage report
npm run set-version X.Y.Z      # Bump version across all files
```

## Release Checklist

**For maintainers only:**

- [ ] All tests passing
- [ ] Bump version: `npm run set-version X.Y.Z`
- [ ] **Fill in CHANGELOG.md** with user-facing release notes
  - Use clear, non-technical language
  - Organize: Added / Changed / Fixed / Removed
  - This becomes your GitHub release notes automatically!
- [ ] Build successful: `npm run build`
- [ ] Commit: `git add . && git commit -m "chore: Bump version to X.Y.Z"`
- [ ] Tag: `git tag X.Y.Z`
- [ ] Push: `git push origin master --tags`
- [ ] GitHub Actions auto-creates release with CHANGELOG content

**⚠️ Fill CHANGELOG immediately after version bump while changes are fresh!**

## Common Gotchas

### Setup & Environment

**Git hooks require manual setup**
```bash
git config core.hooksPath .husky
# Verify: git config core.hooksPath  # Should output: .husky
```

**Never commit build artifacts**
- ❌ `main.js` (generated)
- ❌ `node_modules/` (dependencies)
- ✅ Only commit source files

### Code

**100% Type Safety Required**
- Build fails with `any` types
- Use `unknown` with type guards
- Always specify return types for public methods

**Decorations are view-only**
- Cannot modify markdown source files
- Decorations are purely visual (CodeMirror ViewPlugin)
- URLs remain as plain text in the file

**Multiple file updates when adding decorators**
- Add widget class to `PreviewWidget.ts`
- Update `DecorationBuilder.ts` to use it
- Add tests for both

### Testing & Debugging

**Frontmatter MUST start on line 1**
```yaml
# ❌ WRONG - Will not work!
# My Note Title

---
preview-style: card
---

# ✅ CORRECT
---
preview-style: card
---

# My Note Title
```

This is the #1 reason frontmatter tests fail!

**Clear caches when testing metadata changes**
```javascript
// In browser console (Cmd+Option+I / Ctrl+Shift+I)
window.inlineLinkPreview.clearAllCaches()
window.inlineLinkPreview.refreshDecorations()
```

The plugin caches metadata and favicons for 30 days. You won't see changes without clearing!

**Both checks required before commit**
```bash
# ❌ Only running one
npm run build

# ✅ Run both
npm run build && npm test

# ✅ Or let pre-commit hook do it
git commit -m "feat: my change"  # Runs both automatically
```

### Documentation

**CHANGELOG must use user-facing language**
```markdown
# ❌ Technical jargon
- Refactored urlPreviewDecorator.ts into modules

# ✅ User-facing language
- Improved preview rendering performance
```

### Performance

**LRU cache has max size (1000 items)**
- Monitor with: `window.inlineLinkPreview.getCacheStats()`

**Concurrency limited to 10 parallel requests**
- Prevents overwhelming servers
- Defined in `MAX_CONCURRENT_REQUESTS` constant

## Pull Request Process

### Before Submitting

1. Run tests: `npm test`
2. Run build: `npm run build`
3. Update documentation if needed
4. Self-review your changes

### PR Template

```markdown
## Description
Brief description of changes.

## Motivation
Why is this change necessary?

## Changes
- Specific change 1
- Specific change 2

## Testing
How was this tested?

## Checklist
- [ ] Tests pass
- [ ] Build successful
- [ ] Documentation updated
- [ ] No TypeScript errors
```

### After Approval

Maintainer will squash commits and merge.

## Adding Custom Metadata Handlers

Want to add support for a new website?

1. **Create handler file:** `src/services/metadataHandlers/myHandler.ts`

```typescript
export class MyHandler implements MetadataHandler {
  async matches(context: MetadataHandlerContext): Promise<boolean> {
    return context.url.hostname === "example.com";
  }

  async enrich(context: MetadataHandlerContext): Promise<void> {
    // Modify context.metadata
  }
}
```

2. **Register in `metadataHandlers/index.ts`:**

```typescript
export function createDefaultMetadataHandlers(): MetadataHandler[] {
  return [
    new MyHandler(),  // ← Add here!
    new WikipediaMetadataHandler(),
    // ...
  ];
}
```

3. **Add tests:** See existing handlers for examples

4. **Update README:** Add to "Domain Enhancements" section

## Project Structure

```
src/
├── main.ts              # Plugin entry point
├── settings.ts          # Settings UI
├── constants.ts         # Application constants
├── decorators/          # Editor widgets
├── editor/              # CodeMirror integration
├── services/            # Business logic
└── utils/               # Shared utilities

tests/                   # Mirror src/ structure
```

## Questions?

- **Check existing code** - Follow established patterns
- **Search issues** - Someone may have asked before
- **Open a discussion** - Ask in GitHub Discussions
- **Open an issue** - For bugs or feature requests

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on code, not people

Thank you for contributing!
