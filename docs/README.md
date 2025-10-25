# URL Enricher Documentation

Welcome to the URL Enricher documentation! This directory contains all documentation for the plugin.

## 📚 For Users

### Getting Started

- **[User Guide](USER-GUIDE.md)** - Complete usage documentation
  - Preview styles (inline vs card)
  - Supported URL formats
  - Features in detail
  - Settings reference
  - Domain-specific enhancements
  - Privacy and network usage
  - Tips and tricks

### Configuration

- **[Frontmatter Support](features/FRONTMATTER-SUPPORT.md)** - Per-page configuration
  - Available properties
  - Examples and usage
  - Settings hierarchy

- **[Quick Reference](QUICK-REFERENCE.md)** - Cheat sheet
  - Frontmatter properties table
  - Console API commands
  - Common workflows
  - Quick troubleshooting

### Help & Support

- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues and solutions
  - Quick fixes
  - Previews not appearing
  - Performance issues
  - Error warnings
  - Cache issues

- **[Frontmatter Troubleshooting](features/FRONTMATTER-TROUBLESHOOTING.md)** - Debug frontmatter problems
  - Step-by-step debugging
  - Common mistakes
  - Validation checklist

- **[Advanced Features](ADVANCED.md)** - Power user features
  - Developer console API
  - Cache management
  - Logging control
  - Performance tracking
  - Network and privacy details

## 🛠️ For Developers

### Contributing

- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute
  - Development setup
  - Coding standards
  - TypeScript guidelines
  - Testing requirements
  - Git workflow
  - Pull request process

- **[Developer Guide](developer/DEVELOPER-GUIDE.md)** - Development workflows
  - Common tasks
  - Debugging techniques
  - Troubleshooting builds
  - Best practices

### Technical Documentation

- **[Architecture](developer/ARCHITECTURE.md)** - System design and patterns
  - Component architecture
  - Data flow
  - Design patterns
  - Extension points
  - Performance considerations

- **[Testing](developer/TESTING.md)** - Testing infrastructure
  - Test coverage
  - Running tests
  - Writing tests
  - Test organization

- **[Version Management](developer/VERSION-MANAGEMENT.md)** - Release process
  - Version bumping
  - Release workflow
  - Changelog management
  - GitHub Actions
  - Pre-release documentation checklist

- **[Agents Guide](developer/AGENTS.md)** - Quick reference for AI agents
  - Project structure
  - Key concepts
  - Critical gotchas
  - Development commands

## 🗂️ Features

- **[Scroll Behavior](features/SCROLL-BEHAVIOR.md)** - Detailed scroll behavior documentation

## 📦 Archived Documentation

- **[Archived Docs](archived/)** - Historical documentation and migration guides
  - Previous feature specs
  - Migration guides for breaking changes
  - Release notes for major versions

## 🎨 Assets

- **[Visual Assets](../assets/)** - Demo GIFs, screenshots, and visual materials
  - Demo GIF showing plugin in action
  - Screenshots of preview styles
  - Settings UI screenshots

## 🆘 Getting Help

### Quick Troubleshooting

**Previews not showing?**
1. Check you're in Live Preview mode
2. Verify frontmatter is on line 1 (if using frontmatter)
3. Try clearing cache: `window.inlineLinkPreview.clearAllCaches()`

**More help:**
- See [Troubleshooting Guide](TROUBLESHOOTING.md)
- Check [GitHub Issues](https://github.com/YOUR_REPO/issues)
- Join [Discussions](https://github.com/YOUR_REPO/discussions)

### Console API Quick Reference

Open browser console (`Cmd+Option+I` or `Ctrl+Shift+I`):

```javascript
// Show help
window.inlineLinkPreview.help()

// Clear cache
window.inlineLinkPreview.clearAllCaches()

// Set log level
window.inlineLinkPreview.setLogLevel("debug")

// View cache stats
window.inlineLinkPreview.getCacheStats()
```

See [Advanced Features](ADVANCED.md) for complete API documentation.

## 📖 Documentation Organization

This documentation is organized by audience and purpose:

```
docs/
├── README.md (this file)           # Documentation index
├── USER-GUIDE.md                   # Complete user guide
├── TROUBLESHOOTING.md              # Common issues
├── ADVANCED.md                     # Power user features
├── QUICK-REFERENCE.md              # Cheat sheet
├── features/                       # Feature-specific docs
│   ├── FRONTMATTER-SUPPORT.md
│   ├── FRONTMATTER-TROUBLESHOOTING.md
│   └── SCROLL-BEHAVIOR.md
├── developer/                      # Developer documentation
│   ├── AGENTS.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPER-GUIDE.md
│   ├── TESTING.md
│   └── VERSION-MANAGEMENT.md
└── archived/                       # Historical documentation
```

## 🔗 External Resources

- **[GitHub Repository](https://github.com/YOUR_REPO)**
- **[Report Issues](https://github.com/YOUR_REPO/issues)**
- **[Discussions](https://github.com/YOUR_REPO/discussions)**
- **[Changelog](../CHANGELOG.md)**
- **[License](../LICENSE)** - MIT License

## ✨ Quick Links by Task

**I want to...**
- **Get started quickly** → [User Guide](USER-GUIDE.md)
- **Configure per-page settings** → [Frontmatter Support](features/FRONTMATTER-SUPPORT.md)
- **Fix a problem** → [Troubleshooting](TROUBLESHOOTING.md)
- **Look up a setting** → [Quick Reference](QUICK-REFERENCE.md)
- **Use console commands** → [Advanced Features](ADVANCED.md)
- **Contribute code** → [Contributing Guide](../CONTRIBUTING.md)
- **Understand the architecture** → [Architecture](developer/ARCHITECTURE.md)
- **Run tests** → [Testing Guide](developer/TESTING.md)
- **Make a release** → [Version Management](developer/VERSION-MANAGEMENT.md)

---

**Last Updated**: 2025-10-25 (v1.0.0 documentation structure)
