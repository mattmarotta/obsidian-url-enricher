# Developer Guide

This guide provides practical workflows, checklists, and gotchas for day-to-day development on the Inline Link Preview plugin.

## Quick Reference

### Common Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Watch mode (rebuilds on changes)
npm run build                  # Production build (type-check + bundle)
npm test                       # Run all 558 tests
npm run test:watch             # Test watch mode
npm run test:coverage          # Coverage report
npm run set-version X.Y.Z      # Bump version (updates 6 files)
```

### Before You Commit Checklist

- [ ] **Run tests**: `npm test` (all 558 tests passing)
- [ ] **Run build**: `npm run build` (zero TypeScript errors)
- [ ] **Update documentation** (see [What to Update](#documentation-update-guide) below)
- [ ] **Check git hooks enabled**: `git config core.hooksPath .husky`
- [ ] **Use conventional commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

⚠️ **CRITICAL**: Both build AND test must pass (not just one!)

### Release Checklist

- [ ] All tests passing
- [ ] Bump version: `npm run set-version X.Y.Z`
- [ ] Fill in CHANGELOG.md (user-facing language, not technical jargon)
- [ ] Build successful
- [ ] Commit: `git add . && git commit -m "chore: Bump version to X.Y.Z"`
- [ ] Tag: `git tag X.Y.Z`
- [ ] Push: `git push origin master --tags`
- [ ] GitHub Actions will auto-create release

**See**: [VERSION-MANAGEMENT.md](VERSION-MANAGEMENT.md) for detailed release workflow

---

## Common Workflows

### Adding a New Feature

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Write code following project standards**
   - ⚠️ **No `any` types** - 100% type-safe codebase
   - ⚠️ **Add constants to `constants.ts`**, not inline
   - ⚠️ **If adding decorators**, update `DecorationBuilder.ts` too
   - Use TypeScript strict mode
   - Add JSDoc to public methods

3. **Add tests** (maintain 100% pass rate)
   ```bash
   npm run test:watch
   ```

4. **Update documentation** (see [Documentation Update Guide](#documentation-update-guide))

5. **Test in real Obsidian**
   ```bash
   # Link to vault for testing
   ln -s "$(pwd)" "/path/to/vault/.obsidian/plugins/obsidian-inline-link-preview"
   npm run dev
   ```

   ⚠️ **GOTCHA**: Clear caches when testing metadata changes:
   ```javascript
   window.inlineLinkPreview.clearAllCaches()
   ```

6. **Commit with conventional commits**
   ```bash
   git add .
   git commit -m "feat: add my amazing feature"
   ```

### Fixing a Bug

1. **Reproduce the bug with a test first**
   ```typescript
   it("should handle edge case correctly", () => {
     // Arrange - set up the failing scenario
     // Act - trigger the bug
     // Assert - verify it fails (currently)
   });
   ```

   ⚠️ **BEST PRACTICE**: Write failing test before fixing

2. **Fix the bug**
   - ⚠️ **Check if bug affects multiple related areas**
   - Consider edge cases
   - Maintain type safety

3. **Verify test now passes**
   ```bash
   npm test
   ```

4. **Update CHANGELOG.md** under "Fixed" section
   - Use user-facing language
   - ❌ "Fixed null pointer in urlPreviewDecorator.ts"
   - ✅ "Fixed previews not showing for certain URL formats"

5. **Commit**
   ```bash
   git commit -m "fix: resolve preview issue with special characters"
   ```

### Adding a Metadata Handler

1. **Create handler file**
   ```bash
   # Example: src/services/metadataHandlers/githubMetadataHandler.ts
   ```

2. **Implement `MetadataHandler` interface**
   ```typescript
   export class GitHubMetadataHandler implements MetadataHandler {
     async matches(context: MetadataHandlerContext): Promise<boolean> {
       return context.url.hostname === "github.com";
     }

     async enrich(context: MetadataHandlerContext): Promise<void> {
       // Enrich metadata
     }
   }
   ```

3. **⚠️ CRITICAL: Register in `metadataHandlers/index.ts`**
   ```typescript
   export function createDefaultMetadataHandlers(): MetadataHandler[] {
     return [
       new GitHubMetadataHandler(),  // ← Add here!
       new WikipediaMetadataHandler(),
       // ...
     ];
   }
   ```

4. **Add comprehensive tests**
   ```typescript
   describe("GitHubMetadataHandler", () => {
     it("should match GitHub URLs", async () => { });
     it("should enrich with repository info", async () => { });
     it("should handle API errors gracefully", async () => { });
   });
   ```

5. **Update README.md** - Add to "Domain-Aware Metadata Enrichment" section

### Releasing a Version

See [VERSION-MANAGEMENT.md](VERSION-MANAGEMENT.md) for complete guide.

**Quick version:**
```bash
# 1. Bump version
npm run set-version 0.9.0

# 2. Fill in CHANGELOG.md (Added/Changed/Fixed sections)

# 3. Commit and tag
git add .
git commit -m "chore: Bump version to 0.9.0"
git tag 0.9.0
git push origin master --tags

# 4. GitHub Actions auto-creates release
```

⚠️ **REMINDER**: Fill CHANGELOG immediately while changes are fresh!

---

## ⚠️ Common Pitfalls & Gotchas

### Setup & Environment

**Git hooks require manual setup**
```bash
# After cloning, run this:
git config core.hooksPath .husky

# Verify it worked:
git config core.hooksPath
# Should output: .husky
```

**Node version**
- Requires Node 18+
- Check: `node --version`

**Never commit build artifacts**
- ❌ `main.js` (generated)
- ❌ `node_modules/` (dependencies)
- ❌ `dist/` (build output)
- ✅ Only commit source files

### Code & Architecture

**100% Type Safety Required**
```typescript
// ❌ NEVER use any
function parseData(value: any) { }

// ✅ Use unknown with type guards
function parseData(value: unknown): Data | null {
  if (!isValidData(value)) return null;
  return value;
}

function isValidData(value: unknown): value is Data {
  return typeof value === "object" && value !== null && "title" in value;
}
```

**Constants must go in constants.ts**
```typescript
// ❌ Magic numbers inline
if (cache.size > 1000) { }

// ✅ Named constants
import { METADATA_CACHE_MAX_SIZE } from "./constants";
if (cache.size > METADATA_CACHE_MAX_SIZE) { }
```

**Decorations are view-only**
- ⚠️ **CRITICAL**: Cannot modify markdown source files
- Decorations are purely visual (CodeMirror ViewPlugin)
- URLs remain as plain text in the file

**URLs in code blocks should NOT be decorated**
- Already handled by syntax tree detection
- Test this if modifying URL matching logic

**Type guards required for cache data**
```typescript
// ❌ Trusting cache data
const data = cache.get(key);
data.title.toLowerCase(); // Could crash!

// ✅ Validating with type guard
const data = cache.get(key);
if (isValidCacheData(data)) {
  data.title.toLowerCase(); // Safe!
}
```

**Multiple file updates when adding decorators**
```typescript
// When creating new decorator widget:
// 1. Add widget class to PreviewWidget.ts
// 2. Update DecorationBuilder.ts to use it
// 3. Add tests for both
```

### Testing & Debugging

**Frontmatter MUST start on line 1**
```yaml
# ❌ WRONG - Will not work!
# My Note Title

---
preview-style: card
---

# ✅ CORRECT - Frontmatter first!
---
preview-style: card
---

# My Note Title
```

⚠️ **#1 REASON** frontmatter tests fail!

**Clear caches when testing metadata changes**
```javascript
// In browser console (Cmd+Option+I / Ctrl+Shift+I)
window.inlineLinkPreview.clearAllCaches()
window.inlineLinkPreview.refreshDecorations()
```

**Performance tracking disabled by default**
```javascript
// Must enable to profile
window.inlineLinkPreview.enablePerformanceTracking()

// Use feature...

// Check metrics
window.inlineLinkPreview.getPerformanceMetrics()
```

**Log levels**
```javascript
// Default is INFO
// Set to DEBUG for detailed logs
window.inlineLinkPreview.setLogLevel("debug")
```

**Both checks required**
```bash
# ❌ Only running one
npm run build

# ✅ Run both
npm run build && npm test

# ✅ Or let pre-commit hook do it
git commit -m "feat: my change"  # Runs both automatically
```

### Performance & Limits

**LRU cache has max size (1000 items)**
- Consider when adding features that increase cache usage
- Monitor with: `window.inlineLinkPreview.getCacheStats()`

**Concurrency limited to 10 parallel requests**
- Defined in `MAX_CONCURRENT_REQUESTS` constant
- Prevents overwhelming servers
- Adjust if adding bulk operations

**Settings changes require explicit refresh**
```typescript
// After changing settings:
this.plugin.refreshDecorations();

// User changes in settings UI already do this
// Only needed for programmatic changes
```

### Documentation & Releases

**CHANGELOG must use user-facing language**
```markdown
# ❌ Technical jargon
- Refactored urlPreviewDecorator.ts into multiple modules
- Added LRU cache implementation for metadata

# ✅ User-facing language
- Improved preview rendering performance
- Reduced memory usage with smarter caching
```

**Version script only handles semantic versions**
```bash
# ✅ Works
npm run set-version 1.0.0

# ❌ Doesn't work (must edit manually)
npm run set-version 1.0.0-beta.1
```

**Fill CHANGELOG.md immediately after version bump**
- Do it while changes are fresh in memory
- Easier than trying to remember later

---

## Documentation Update Guide

### When Adding a User-Facing Feature

Update these files:
- [ ] **README.md** - Main features section
- [ ] **CHANGELOG.md** - Under "Added" in current version
- [ ] **ARCHITECTURE.md** (if architecture changed)

### When Fixing a Bug

Update these files:
- [ ] **CHANGELOG.md** - Under "Fixed" in current version
- [ ] **TESTING.md** (if added regression test)

### When Refactoring Code

Update these files:
- [ ] **ARCHITECTURE.md** (if structure changed)
- [ ] **AGENTS.md** (if file structure changed)
- [ ] **CHANGELOG.md** - Under "Changed" (if user-impacting)

### When Adding Developer Tooling

Update these files:
- [ ] **CONTRIBUTING.md** - Development process section
- [ ] **DEVELOPER-GUIDE.md** (this file) - Workflows section
- [ ] **CHANGELOG.md** - Under "Added" (developer tools)

### When Changing Tests

Update these files:
- [ ] **TESTING.md** - Test counts and coverage
- [ ] **README.md** - Test counts in Testing section
- [ ] **AGENTS.md** - Test counts in file structure

---

## Debugging Guide

### Console API Commands

All commands available under `window.inlineLinkPreview` in browser console (open with `Cmd+Option+I` or `Ctrl+Shift+I`):

**Get help:**
```javascript
window.inlineLinkPreview.help()
```

**Cache Management:**
```javascript
// View detailed statistics
window.inlineLinkPreview.getCacheStats()
// Shows: size, hits, misses, evictions, hit rate

// Clear all caches (metadata + favicon)
window.inlineLinkPreview.clearAllCaches()
```

**Logging:**
```javascript
// Set log level: "error", "warn", "info", "debug"
window.inlineLinkPreview.setLogLevel("debug")

// ⚠️ Default level is "info"
```

**Performance Profiling:**
```javascript
// ⚠️ GOTCHA: Disabled by default to avoid overhead!
window.inlineLinkPreview.enablePerformanceTracking()

// Use the plugin normally for a minute...

// View metrics table
window.inlineLinkPreview.getPerformanceMetrics()
// Shows: operation, count, avg time, min, max, total

// Reset metrics
window.inlineLinkPreview.resetPerformanceMetrics()

// Disable tracking
window.inlineLinkPreview.disablePerformanceTracking()
```

**Utilities:**
```javascript
// Force refresh all previews
window.inlineLinkPreview.refreshDecorations()
```

### Common Debugging Scenarios

**Problem: Previews not showing**
```javascript
// 1. Verify in Live Preview mode (not Source mode)
// 2. Enable debug logging
window.inlineLinkPreview.setLogLevel("debug")
// 3. Check browser console for errors
// 4. Verify URL format is supported (bare URL, markdown link, wikilink)
```

**Problem: Metadata not updating**
```javascript
// Clear caches
window.inlineLinkPreview.clearAllCaches()
window.inlineLinkPreview.refreshDecorations()

// Check cache stats
window.inlineLinkPreview.getCacheStats()
```

**Problem: Slow performance**
```javascript
// Enable profiling
window.inlineLinkPreview.enablePerformanceTracking()

// Use feature normally for 1 minute...

// Check metrics
window.inlineLinkPreview.getPerformanceMetrics()

// Look for operations with:
// - High average time
// - High max time (indicates bottleneck)
// - High count (might need optimization)
```

**Problem: Frontmatter not working**
1. ⚠️ **#1 GOTCHA**: Frontmatter MUST start on line 1
2. Check property names (case-insensitive but must match)
3. Verify values are in valid ranges:
   - `max-card-length`: 100-5000
   - `max-bubble-length`: 50-5000
4. See [FRONTMATTER-TROUBLESHOOTING.md](FRONTMATTER-TROUBLESHOOTING.md)

**Problem: TypeScript errors in tests**
```bash
# Make sure to build first
npm run build

# If still errors, check imports
# Type definitions might need updating
```

**Problem: Pre-commit hook not running**
```bash
# Check if hooks are configured
git config core.hooksPath
# Should output: .husky

# If not set:
git config core.hooksPath .husky
```

---

## Testing Tips

### Running Specific Tests

```bash
# Run specific file
npm test -- urlPreviewDecorator.test.ts

# Run tests matching pattern
npm test -- -t "should handle frontmatter"

# Watch mode for specific file
npm run test:watch -- urlPreviewDecorator.test.ts
```

### Testing in Obsidian

```bash
# 1. Link plugin to test vault
ln -s "$(pwd)" "/path/to/test-vault/.obsidian/plugins/obsidian-inline-link-preview"

# 2. Run dev watch mode
npm run dev

# 3. In Obsidian:
#    - Reload plugin: Cmd+R (Mac) or Ctrl+R (Windows)
#    - Open console: Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows)
```

### Writing Good Tests

```typescript
// ✅ Good test structure (Arrange-Act-Assert)
it("should return cached metadata if available", async () => {
  // Arrange - set up test data
  const service = new LinkPreviewService(options, settings);
  const url = "https://example.com";
  const cachedMetadata = { title: "Example", description: null };
  service.cache.set(url, cachedMetadata);

  // Act - trigger the behavior
  const result = await service.getMetadata(url);

  // Assert - verify the outcome
  expect(result).toEqual(cachedMetadata);
});

// ✅ Good test name
it("should handle network errors gracefully", async () => { });

// ❌ Bad test name
it("test1", () => { }); // Non-descriptive
```

---

## See Also

- [CONTRIBUTING.md](CONTRIBUTING.md) - Contributing guidelines and code standards
- [VERSION-MANAGEMENT.md](VERSION-MANAGEMENT.md) - Detailed release process
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and design
- [TESTING.md](TESTING.md) - Testing infrastructure and coverage
- [AGENTS.md](AGENTS.md) - Quick project overview
- [README.md](README.md) - User-facing documentation
