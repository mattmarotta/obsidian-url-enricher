# Visual Assets for URL Enricher

This directory contains visual assets for documentation and promotional materials.

## Required Assets for 1.0.0 Release

### Demo GIF
**File**: `demo.gif`
**Duration**: 15-30 seconds
**Content**:
1. Show a bare URL in a note: `https://github.com`
2. Demonstrate the URL automatically gaining a preview (inline style)
3. Show clicking to change to card style (via frontmatter or settings)
4. Demonstrate cursor-aware behavior (click on URL, preview disappears, click away, preview returns)
5. Show the preview is clickable (opens URL)

**Recording Tools**:
- macOS: QuickTime Player (record) + tool to convert to GIF, Kap, LICEcap
- Windows: ScreenToGif, ShareX
- Linux/Cross-platform: OBS Studio, Peek

**Recording Tips**:
- Use a clean vault with minimal other plugins
- Use default Obsidian theme or popular theme
- Keep the demo focused - one feature flow
- Use high contrast URLs that are recognizable (GitHub, Wikipedia, etc.)
- Record at 1080p, optimize GIF to <5MB

### Screenshots

#### 1. `inline-preview.png`
- Screenshot showing multiple inline-style previews in a note
- Should show:
  - Compact inline preview with favicon and title
  - How it flows with surrounding text
  - Different types of URLs (bare, markdown links)

#### 2. `card-preview.png`
- Screenshot showing multiple card-style previews in a note
- Should show:
  - Card with favicon, title, description
  - Site name footer
  - URL displayed below card
  - Material Design elevation/shadows

#### 3. `settings-ui.png`
- Screenshot of the plugin settings panel
- Should show all settings sections:
  - Plugin Activation
  - Preview Appearance
  - Preview Content
  - Cache Management
- Use standard Obsidian theme for consistency

### Screenshot Guidelines
- Resolution: At least 1440px width for retina displays
- Format: PNG with transparency where applicable
- Crop to relevant area (don't include entire screen)
- Use light mode OR dark mode consistently (pick one)
- Ensure text is readable
- Highlight key features with arrows/annotations if helpful (optional)

## Future Assets

### Community Showcase (Optional)
- User examples showing creative uses
- Integration with other plugins
- Theme compatibility examples

### Tutorial Videos (Optional)
- Full-length video tutorials for YouTube
- Feature deep-dives
- Advanced configuration guides

## Notes
- Keep all assets optimized for web (reasonable file sizes)
- Update screenshots when UI changes significantly
- See docs/developer/VERSION-MANAGEMENT.md for pre-release asset checklist
- GIFs should be optimized (<5MB) while maintaining quality
