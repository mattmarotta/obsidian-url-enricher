# Repository Reorganization Plan

## Problem
Current root: **34 files** (70% more than typical Obsidian plugins)
Industry standard: **15-20 files** in root

## Proposed Structure

### Root (Keep - 18 files)
```
.editorconfig
.eslintignore
.eslintrc
.gitignore
.npmrc
CHANGELOG.md          ← STAYS (version history)
CONTRIBUTING.md       ← STAYS (GitHub standard)
LICENSE
README.md             ← STAYS (GitHub entry point)
esbuild.config.mjs
main.js
manifest.json
package-lock.json
package.json
styles.css
tsconfig.json
version-bump.mjs
versions.json
vitest.config.ts
```

### New `docs/` Structure (Move 11 files + reorganize)
```
docs/
├── developer/
│   ├── AGENTS.md                    ← FROM ROOT (AI agent reference)
│   ├── ARCHITECTURE.md              ← FROM ROOT
│   ├── DEVELOPER-GUIDE.md           ← FROM ROOT
│   ├── TESTING.md                   ← FROM ROOT
│   └── VERSION-MANAGEMENT.md        ← FROM ROOT
├── features/
│   ├── FRONTMATTER-SUPPORT.md       ← FROM ROOT
│   ├── FRONTMATTER-TROUBLESHOOTING.md ← FROM ROOT
│   └── SCROLL-BEHAVIOR.md           ← FROM ROOT
├── images/
│   └── (future screenshots)
└── archived/
    ├── README.md                     ← ALREADY EXISTS
    └── releases/                     ← ALREADY EXISTS
```

### Files to DELETE (4 files - temporary/internal)
```
✗ Refactoring and Documentation Updates Summary.md  (temporary)
✗ RESUME.md                                         (internal session note)
✗ plan-refactor.md                                  (planning, completed)
✗ opus-prompt-obsilp-20251022                       (temporary file)
✗ test-sites.txt                                    (dev notes, optional)
```

## Link Updates Required

### Files with Internal Links (Must Update)

**1. README.md** (4 links to update)
- `[FRONTMATTER-SUPPORT.md](FRONTMATTER-SUPPORT.md)` → `docs/features/FRONTMATTER-SUPPORT.md`
- `[FRONTMATTER-TROUBLESHOOTING.md](FRONTMATTER-TROUBLESHOOTING.md)` → `docs/features/FRONTMATTER-TROUBLESHOOTING.md`
- `[VERSION-MANAGEMENT.md](VERSION-MANAGEMENT.md)` → `docs/developer/VERSION-MANAGEMENT.md`
- `[CONTRIBUTING.md](CONTRIBUTING.md)` → NO CHANGE (stays in root)
- `[TESTING.md](TESTING.md)` → `docs/developer/TESTING.md`
- `[ARCHITECTURE.md](ARCHITECTURE.md)` → `docs/developer/ARCHITECTURE.md`

**2. CONTRIBUTING.md** (1 link to update)
- `[VERSION-MANAGEMENT.md](VERSION-MANAGEMENT.md)` → `docs/developer/VERSION-MANAGEMENT.md`

**3. AGENTS.md** (7 links to update)
- All internal doc links need `docs/developer/` or `docs/features/` prefix
- Links to README, CONTRIBUTING, CHANGELOG stay the same (in root)

**4. DEVELOPER-GUIDE.md** (6 links to update)
- Links to other developer docs → `docs/developer/`
- Link to README stays same

**5. VERSION-MANAGEMENT.md** (2 links to update)
- Link to CHANGELOG → `../../CHANGELOG.md` (up from docs/developer/)
- Link to CONTRIBUTING → `../../CONTRIBUTING.md`

**6. docs/archived/README.md** (Update existing links)
- Links already use `../../` but may need adjustment

### Scripts that Reference Files

**version-bump.mjs** (CRITICAL - Must Update)
```javascript
// Currently updates:
const AGENTS_FILE = "AGENTS.md";          // ← Must change to docs/developer/AGENTS.md
const CHANGELOG_FILE = "CHANGELOG.md";    // ← NO CHANGE (stays in root)
```

## Migration Steps

### Step 1: Create docs/ structure
```bash
mkdir -p docs/developer
mkdir -p docs/features
mkdir -p docs/images
```

### Step 2: Move files
```bash
# Developer docs
mv AGENTS.md docs/developer/
mv ARCHITECTURE.md docs/developer/
mv DEVELOPER-GUIDE.md docs/developer/
mv TESTING.md docs/developer/
mv VERSION-MANAGEMENT.md docs/developer/

# Feature docs
mv FRONTMATTER-SUPPORT.md docs/features/
mv FRONTMATTER-TROUBLESHOOTING.md docs/features/
mv SCROLL-BEHAVIOR.md docs/features/
```

### Step 3: Update version-bump.mjs
```javascript
const AGENTS_FILE = "docs/developer/AGENTS.md";
const CHANGELOG_FILE = "CHANGELOG.md"; // unchanged
```

### Step 4: Update all internal links in markdown files
(See detailed link updates above)

### Step 5: Delete temporary files
```bash
rm "Refactoring and Documentation Updates Summary.md"
rm RESUME.md
rm plan-refactor.md
rm opus-prompt-obsilp-20251022
rm test-sites.txt  # optional - if you want to keep, add to .gitignore
```

### Step 6: Update .gitignore if needed
```
# Add temporary/dev files
*.prompt
*-prompt-*
test-sites.txt
plan-*.md
```

### Step 7: Commit reorganization
```bash
git add -A
git commit -m "docs: Reorganize repository structure

- Move 8 documentation files to docs/ subdirectories
- Create docs/developer/ for technical docs
- Create docs/features/ for user-facing feature docs
- Delete 4 temporary/planning files
- Update all internal documentation links
- Update version-bump.mjs to reference new AGENTS.md path

Reduces root directory from 34 to 18 files, aligning with
industry-standard Obsidian plugin structure.
"
```

## Benefits

1. **Cleaner Root** - 34 → 18 files (47% reduction)
2. **Better Organization** - Developer vs feature docs separated
3. **Industry Standard** - Matches 85% of popular Obsidian plugins
4. **Easier Discovery** - Related docs grouped together
5. **Future-Ready** - Room for images/, examples/, etc.

## Risks & Considerations

1. **Version-bump script** - Must update path to AGENTS.md
2. **External links** - If anyone linked to your docs externally, their links break
3. **Git history** - File moves preserve history with `git mv` (recommended over `mv`)
4. **GitHub rendering** - All relative links must be correct for GitHub to render
5. **README remains primary** - Root README.md is still the main entry point

## Recommended: Use `git mv` Instead

For better Git history preservation:
```bash
git mv AGENTS.md docs/developer/AGENTS.md
git mv ARCHITECTURE.md docs/developer/ARCHITECTURE.md
# etc...
```

This preserves file history better than regular `mv` + `git add`.
