# Archived Documentation

This directory contains historical implementation notes and detailed release documentation. These files document features that have already been implemented and integrated into the plugin.

**For current documentation, see:**
- [README.md](../../README.md) - Main user guide
- [AGENTS.md](../developer/AGENTS.md) - Technical architecture
- [CHANGELOG.md](../../CHANGELOG.md) - Version history
- [FRONTMATTER-SUPPORT.md](../features/FRONTMATTER-SUPPORT.md) - Frontmatter configuration guide

---

## Organization

### Feature Implementation Notes
These documents describe specific features and bug fixes during development:

**Favicon & Quality Fixes:**
- `FAVICON-FIX-EXPLAINED.md` - Favicon blur problem solution
- `FAVICON-WIKIPEDIA-FIXES.md` - Favicon + Wikipedia enhancements
- `FINAL-FIXES.md` - Consolidated favicon, Reddit, and card fixes
- `CARD-IMPROVEMENTS.md` - Comprehensive card design and Wikipedia support

**Card & Layout Evolution:**
- `URL-IN-CARD-FOOTER.md` - URL in card footer implementation
- `CARD-URL-BELOW-IMPLEMENTATION.md` - URL below card layout
- `SCROLL-BEHAVIOR.md` - Card height and scrolling behavior
- `COMPACT-CARD-UPDATE.md` - Card compactness refinements
- `CLICK-BEHAVIOR-FIX.md` - Click handling fixes

**Length Settings Evolution:**
- `CONFIGURABLE-LENGTHS.md` - Configurable card/bubble lengths
- `DESCRIPTION-LENGTH-FIX.md` - Independent length settings bug fix
- `MAX-LENGTH-REDESIGN.md` - Settings rename from "description" to "max length"
- `MAX-LENGTH-LIMITS-FIX.md` - Validation limits implementation

**Content Enhancements:**
- `REDDIT-PREVIEW-ENHANCEMENT.md` - Reddit post preview improvements
- `URL-DISPLAY-SIMPLIFICATION.md` - URL display mode simplification
- `CACHE-CLEARING-DOCS.md` - Cache management documentation

**Bug Fixes:**
- `BUGFIXES.md` - v0.5.0 bug fixes compilation

### Migration Guides
- `MIGRATION.md` - Historical migration guide from v0.3.x to v0.5.0

### Release Documentation
Detailed release notes for specific versions:
- `releases/RELEASE-0.5.0.md` - Version 0.5.0 detailed release notes
- `releases/RELEASE-0.7.0.md` - Version 0.7.0 detailed release notes

---

## Why These Are Archived

These documents served an important purpose during development:
1. **Planning**: Outlined implementation approaches
2. **Communication**: Documented decisions for stakeholders
3. **Debugging**: Tracked bug fixes and their solutions
4. **Historical Context**: Preserved reasoning behind changes

However, they created maintenance overhead:
- **Redundancy**: Same features documented in multiple files
- **Outdated Info**: Some solutions were superseded by better approaches
- **Fragmentation**: Information scattered across 20+ files

The current documentation consolidates all accurate, up-to-date information into fewer, better-maintained files.

---

## Usage

These files are preserved for:
- **Historical reference**: Understanding why certain decisions were made
- **Git archaeology**: Tracing the evolution of specific features
- **Learning**: Seeing how the plugin evolved from v0.4.0 to v0.7.0

If you're implementing a new feature or fixing a bug, start with the current documentation instead.
