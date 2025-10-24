# Version Management Guide

This guide explains how to manage plugin versions using the automated `version-bump.mjs` script.

## Overview

The version-bump script automates the process of updating version numbers across all files in the project, ensuring consistency and reducing manual errors.

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
Creates a new unreleased section template at the top:
```markdown
## [0.8.0] - 2025-10-24

### Added
-

### Changed
-

### Fixed
-

```

## Output

The script provides clear status for each file:

```
✓ Updated manifest.json
✓ Updated package.json
✓ Updated package-lock.json
✓ Updated versions.json
✓ Updated AGENTS.md
✓ Updated CHANGELOG.md (added unreleased section)

✅ Version bumped to 0.8.0

Next steps:
1. Fill in CHANGELOG.md with your changes
2. Commit: git add . && git commit -m "chore: Bump version to 0.8.0"
3. Tag: git tag 0.8.0
4. Push: git push origin master --tags
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

### 2. Error Handling

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

### 3. Validation

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

Edit the newly created section:

```markdown
## [1.0.0] - 2025-10-24

### Added
- New amazing feature
- Another cool feature

### Changed
- Improved performance

### Fixed
- Fixed critical bug
```

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
- Run tests
- Build the plugin
- Create a GitHub release
- Upload plugin files (main.js, manifest.json, styles.css)

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

- [CHANGELOG.md](CHANGELOG.md) - View release history
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contributing guidelines
- [.github/workflows/release.yml](.github/workflows/release.yml) - Automated release workflow
