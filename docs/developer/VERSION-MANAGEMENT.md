# Version Management Guide

This guide explains how to manage plugin versions using the automated `version-bump.mjs` script.

## Overview

The version-bump script automates the process of updating version numbers across all files in the project, ensuring consistency and reducing manual errors.

**Key Integration**: CHANGELOG.md content automatically becomes GitHub release notes when you push a version tag. Write for end users!

## Quick Start

```bash
# Bump to a new version
npm run set-version 0.8.0

# Or use the script directly
node version-bump.mjs 1.0.0
```

## What Gets Updated

The script automatically updates version numbers in **6 files**:

### 1. **manifest.json**
```json
{
  "version": "0.8.0"
}
```

### 2. **package.json**
```json
{
  "version": "0.8.0"
}
```

### 3. **package-lock.json**
```json
{
  "version": "0.8.0",
  "packages": {
    "": {
      "version": "0.8.0"
    }
  }
}
```

### 4. **versions.json**
Adds new version with minAppVersion from manifest:
```json
{
  "0.7.0": "0.15.0",
  "0.8.0": "0.15.0"
}
```

### 5. **AGENTS.md**
Updates the version line:
```markdown
- Current version: 0.8.0
```

### 6. **CHANGELOG.md**
Promotes the current `Unreleased` notes into the new version section and seeds a fresh template for future work:
```markdown
## [Unreleased]

### Added
-

### Changed
-

### Fixed
-

## [0.8.0] - 2025-10-24
- <your existing Unreleased entries are moved here automatically>

```

**⚠️ IMPORTANT**: This section becomes your GitHub release notes!
- Write in **user-facing language** (not technical commit messages)
- Follow [Keep a Changelog](https://keepachangelog.com/) format
- See existing entries (0.8.0, 0.9.0) for examples
- GitHub Actions automatically extracts this content when you push a tag

## Output

The script provides clear status for each file:

```
✓ Updated manifest.json
✓ Updated package.json
✓ Updated package-lock.json
✓ Updated versions.json
✓ Updated AGENTS.md
✓ Updated CHANGELOG.md (promoted Unreleased entries)

✅ Version bumped to 0.8.0

Next steps:
1. Fill in CHANGELOG.md with your changes (becomes GitHub release notes!)
2. Commit: git add . && git commit -m "chore: Bump version to 0.8.0"
3. Tag: git tag 0.8.0
4. Push: git push origin master --tags (triggers automated release)
```

## Smart Features

### 1. Duplicate Detection

If the version already exists in CHANGELOG.md, it won't create a duplicate:

```
✓ Updated manifest.json
✓ Updated package.json
✓ Updated package-lock.json
✓ Updated versions.json
✓ Updated AGENTS.md
ℹ Version 0.8.0 already exists in CHANGELOG.md
```

### 2. Automatic Unreleased Promotion

The script moves everything under `## [Unreleased]` into the new version section, then recreates a blank `Unreleased` template. Keep logging day-to-day changes under `Unreleased`; they will ship automatically the next time you bump the version.

### 3. Error Handling

The script handles missing or malformed files gracefully:

```
✓ Updated manifest.json
✓ Updated package.json
✓ Updated package-lock.json
✓ Updated versions.json
⚠ Could not find version line in AGENTS.md
⚠ Could not update CHANGELOG.md: File not found
```

The script continues even if optional files fail, ensuring core version files are always updated.

### 4. Validation

Version format is validated before making any changes:

```bash
# Invalid version
npm run set-version 0.8

# Error output:
Invalid semantic version: 0.8
```

Valid version format: `X.Y.Z` (semantic versioning)

## Release Workflow

### Step 1: Bump Version

```bash
npm run set-version 1.0.0
```

### Step 2: Fill in CHANGELOG.md

Edit the newly created section with **user-facing** release notes:

```markdown
## [1.0.0] - 2025-10-24

### Added
- New amazing feature that improves user experience
- Another cool feature users will love

### Changed
- Improved performance by 50%
- Simplified settings UI

### Fixed
- Fixed critical bug that affected card previews
- Resolved issue with long URLs
```

**⚠️ CRITICAL**: This becomes your GitHub release notes!
- Write for **end users**, not developers
- Avoid technical jargon ("refactored", "implemented", etc.)
- Focus on **user benefits** and **impacts**
- Follow [Keep a Changelog](https://keepachangelog.com/) format

**Standard sections** (use as needed):
- `### Added` - New features
- `### Changed` - Changes to existing functionality
- `### Fixed` - Bug fixes
- `### Removed` - Removed features
- `### Deprecated` - Soon-to-be removed features
- `### Security` - Security fixes

**For breaking changes**, use nested structure:
```markdown
### Breaking Changes

#### Plugin Renamed
- **Old name**: "Old Name"
- **New name**: "New Name"
- **Migration**: Update your settings

#### Setting Removed
- **Removed**: "Display mode" setting
- **Reason**: Simplified UX
- **Alternative**: Use manual line breaks
```

**Examples**:
- Simple release: See [CHANGELOG.md](../../CHANGELOG.md) version 0.8.0
- Complex release with breaking changes: See version 0.9.0

### Step 3: Commit Changes

```bash
git add .
git commit -m "chore: Bump version to 1.0.0"
```

### Step 4: Tag Release

```bash
git tag 1.0.0
```

### Step 5: Push to GitHub

```bash
git push origin master --tags
```

This will trigger the GitHub Actions release workflow, which will:
1. **Extract release notes** from CHANGELOG.md for this version
2. **Run tests** to ensure everything passes
3. **Build the plugin** (compile TypeScript, bundle with esbuild)
4. **Create GitHub release** with CHANGELOG content as release body
5. **Upload plugin files** (main.js, manifest.json, styles.css)
6. **Add comparison link** to see full diff from previous version

**What users see**:
- Your CHANGELOG content formatted as the release description
- Installation instructions
- Downloadable plugin files
- Link to full changelog comparing versions

**No manual release creation needed** - it's all automated from your CHANGELOG!

## Pre-Release Documentation Checklist

Before each release, verify documentation and visual assets are up-to-date. This ensures users see accurate screenshots and documentation that matches the current version.

### Documentation Review

- [ ] **README.md** reflects current features and quick start instructions
- [ ] **CHANGELOG.md** has complete release notes for this version
- [ ] **docs/USER-GUIDE.md** matches current functionality
- [ ] **docs/QUICK-REFERENCE.md** has accurate settings and commands
- [ ] All documentation links are working (run link checker if available)

### Visual Assets Review

- [ ] **`assets/demo.gif`** shows current UI and behavior
- [ ] **`assets/settings-ui-1.png`** and **`assets/settings-ui-2.png`** matche current settings panel layout
- [ ] **`assets/inline-preview.png`** shows current inline preview style
- [ ] **`assets/card-preview.png`** shows current card preview style
- [ ] All screenshots show current Obsidian theme/styling
- [ ] No outdated UI elements visible in screenshots

### Settings Changes Check

Run through these checks if UI or settings changed:

- [ ] If settings panel layout changed → update `settings-ui-1.png` and `settings-ui-2.png`
- [ ] If preview styles changed significantly → update preview screenshots
- [ ] If new major features added → consider updating `demo.gif`
- [ ] If frontmatter properties added/changed → update `QUICK-REFERENCE.md`
- [ ] If console API commands added/changed → update `QUICK-REFERENCE.md` and `ADVANCED.md`

### When to Update Screenshots

**Always update when:**
- Settings panel layout changes (new settings, reorganization)
- New settings are added or removed
- Preview style appearance changes significantly (colors, spacing, layout)
- Plugin UI has visual bugs that were fixed

**Optional update when:**
- Minor text changes in settings descriptions
- Small styling tweaks (<5% visual difference)
- Non-visible functionality changes (internal refactoring)

**Never update when:**
- Only code changes (no UI impact)
- Documentation-only changes
- Test updates

### Screenshot and GIF Creation Tools

**Screenshots:**
- **macOS**: `Cmd+Shift+4` (selection), `Cmd+Shift+5` (screenshot tool)
- **Windows**: Snipping Tool, `Win+Shift+S`
- **Linux**: gnome-screenshot, Spectacle, Flameshot

**GIF Recording:**
- **macOS**: QuickTime Player (record) + [Gifski](https://gif.ski) (convert), [Kap](https://getkap.co), LICEcap
- **Windows**: [ScreenToGif](https://www.screentogif.com/), [ShareX](https://getsharex.com/)
- **Cross-platform**: [OBS Studio](https://obsproject.com/), [Peek](https://github.com/phw/peek) (Linux)

**GIF Optimization:**
- Keep file size under 5MB for GitHub
- Use tools like Gifski, gifsicle, or online optimizers
- Balance quality vs file size (aim for 720p-1080p source, 60-120% speed)

### Documentation Standards

When updating documentation:
- **Consistency**: Ensure terminology is consistent across all docs
- **Accuracy**: All code examples must work with current version
- **Completeness**: Cover all user-facing features
- **Clarity**: Write for users, not developers
- **Links**: Verify all internal links work

### Pre-Release Checklist Summary

Run this quick check before creating a release:

```bash
# 1. Visual check
ls assets/
# Verify: demo.gif, inline-preview.png, card-preview.png, settings-ui-1.png, settings-ui-2.png

# 2. Build check
npm run build
npm test

# 3. Documentation check
# - Open README.md - does it match current features?
# - Open docs/QUICK-REFERENCE.md - are settings accurate?
# - Open CHANGELOG.md - are release notes complete?

# 4. If all checks pass:
npm run set-version X.Y.Z
# Fill in CHANGELOG.md
git add .
git commit -m "chore: Bump version to X.Y.Z"
git tag X.Y.Z
git push origin master --tags
```

### Asset Update Workflow

If screenshots/GIF need updating before release:

1. **Capture new assets** using tools above
2. **Optimize** (compress images, optimize GIF size)
3. **Replace** old files in `assets/` directory
4. **Commit** asset changes before version bump:
   ```bash
   git add assets/
   git commit -m "docs: Update screenshots for v X.Y.Z"
   ```
5. **Then proceed** with normal release workflow

### Common Documentation Mistakes

**❌ Don't:**
- Ship with outdated screenshots showing old UI
- Reference features that don't exist yet
- Include broken links to non-existent docs
- Use screenshots from development/debug builds
- Forget to update version numbers in examples

**✅ Do:**
- Test all documentation links before release
- Verify screenshots match production UI
- Keep README concise and up-to-date
- Update QUICK-REFERENCE when settings change
- Review CHANGELOG for completeness

## Advanced Usage

### Using in Scripts

The script can be imported and used programmatically:

```javascript
import { exec } from 'child_process';

// Bump version as part of release script
exec('node version-bump.mjs 1.0.0', (error, stdout) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  console.log(stdout);
});
```

### Pre-release Versions

For pre-release versions (not following semantic versioning), you can manually edit the files instead of using the script:

```bash
# For beta releases (manual edit)
# manifest.json: "version": "1.0.0-beta.1"
```

**Note:** The script only accepts semantic versions (X.Y.Z), so pre-release versions must be managed manually.

## File Structure Reference

```
project/
├── manifest.json         # Obsidian plugin manifest
├── package.json          # npm package info
├── package-lock.json     # npm dependency lock
├── versions.json         # Version-to-minAppVersion mapping
├── AGENTS.md             # Developer guide with version line
├── CHANGELOG.md          # User-facing changelog
└── version-bump.mjs      # The version bump script
```

## Troubleshooting

### Script Fails to Update AGENTS.md

**Symptom:**
```
⚠ Could not find version line in AGENTS.md
```

**Solution:**
Ensure AGENTS.md has this line (case-sensitive):
```markdown
- Current version: X.Y.Z
```

### CHANGELOG.md Not Updated

**Symptom:**
```
⚠ Could not find version header in CHANGELOG.md
```

**Solution:**
Ensure CHANGELOG.md has at least one version header in this format:
```markdown
## [X.Y.Z] - YYYY-MM-DD
```

The script looks for `## [` to determine where to insert the new version.

### Version Already Exists

**Symptom:**
```
ℹ Version 1.0.0 already exists in CHANGELOG.md
```

**Solution:**
This is expected if you've already run the script for this version. The script won't create duplicates. If you need to bump to a different version, use that version number instead.

### Permissions Error

**Symptom:**
```
Error: EACCES: permission denied
```

**Solution:**
Ensure the script is executable:
```bash
chmod +x version-bump.mjs
```

## Best Practices

### 1. Semantic Versioning

Follow [semantic versioning](https://semver.org/) principles:

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features (backward compatible)
- **PATCH** (0.0.1): Bug fixes (backward compatible)

### 2. Changelog Entries

Use clear, user-facing language in changelog:

**Good:**
```markdown
### Added
- Developer Console API for debugging with 8 commands
- LRU cache for better memory management (max 1000 items)
```

**Bad:**
```markdown
### Added
- New code stuff
- Fixed things
```

### 3. Test Before Release

Always test after bumping version:

```bash
npm run build
npm test
```

### 4. Changelog First

Fill in CHANGELOG.md immediately after bumping version, while changes are fresh in your mind.

### 5. Atomic Commits

Commit version bump separately from feature work:

```bash
# Feature work
git commit -m "feat: Add new feature"

# Version bump (separate commit)
npm run set-version 0.9.0
# Edit CHANGELOG.md
git add .
git commit -m "chore: Bump version to 0.9.0"
git tag 0.9.0
```

## Script Implementation

The script is located at `version-bump.mjs` and uses:

- **ES modules** - Modern import/export syntax
- **Node.js fs** - File system operations
- **Regex patterns** - Smart find-and-replace
- **Error handling** - Graceful failures with warnings
- **Validation** - Version format checking

Key functions:
- `readJson(filePath)` - Parse JSON files
- `writeJson(filePath, data)` - Write formatted JSON
- `escapeRegex(string)` - Escape special regex characters

## See Also

- [CHANGELOG.md](../../CHANGELOG.md) - View release history
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contributing guidelines
- [.github/workflows/release.yml](../../.github/workflows/release.yml) - Automated release workflow
