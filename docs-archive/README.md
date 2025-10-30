# Documentation Archive

This folder contains legacy documentation that has been consolidated into the main docs.

## What Happened

The documentation was streamlined from 21,000 words across 16 files to ~3,000 words across 3 core files:

- **README.md** - User-facing documentation
- **CONTRIBUTING.md** - Development guide
- **TROUBLESHOOTING.md** - Common issues and solutions

## Archived Files

These files have been merged into the core documentation:

### User Documentation
- **ADVANCED.md** → Merged into TROUBLESHOOTING.md (console commands)
- **USER-GUIDE.md** → Merged into README.md (features, settings, examples)
- **QUICK-REFERENCE.md** → Distributed to README.md and TROUBLESHOOTING.md

### Developer Documentation
- **DEVELOPER-GUIDE.md** → Merged into CONTRIBUTING.md (workflows, gotchas, release checklist)
- **TESTING.md** → Condensed version kept at docs/developer/TESTING.md
- **VERSION-MANAGEMENT.md** → Merged into CONTRIBUTING.md (release checklist)

## Why Archive Instead of Delete?

These files contain detailed information that may be useful for:
- Historical reference
- Future documentation expansion
- Understanding past decisions
- Recovering specific examples

You can safely delete this folder if you don't need the archives.

## Current Documentation Structure

```
README.md                           # Main user docs (~1000 words)
CONTRIBUTING.md                     # Developer guide (~600 words)
TROUBLESHOOTING.md                  # Common issues (~1200 words)
docs/developer/ARCHITECTURE.md      # Architecture overview (~500 words)
docs/developer/AGENTS.md            # Quick project overview
```

Total: ~3,300 words (from 21,000 = 84% reduction)
