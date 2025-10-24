# Architecture Documentation

## Overview

The Inline Link Preview plugin adds rich, dynamic link previews to Obsidian notes in Live Preview mode. All previews are rendered non-destructively using CodeMirror decorations, meaning the markdown source files are never modified.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Plugin (main.ts)                        │
│  - Lifecycle management (onload, onunload)                      │
│  - Settings persistence                                          │
│  - Developer console API                                         │
└────────────────┬────────────────────────────────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
         ▼                ▼
┌─────────────────┐  ┌──────────────────────┐
│ Editor System   │  │ Service Layer        │
│ (decorators/)   │  │ (services/)          │
└─────────────────┘  └──────────────────────┘
         │                │
         └───────┬────────┘
                 │
                 ▼
         ┌──────────────┐
         │ Utilities    │
         │ (utils/)     │
         └──────────────┘
```

## Directory Structure

```
src/
├── main.ts                    # Plugin entry point
├── settings.ts                # Settings UI and configuration
├── constants.ts               # Application-wide constants
│
├── decorators/                # Editor decoration system
│   ├── DecorationBuilder.ts   # Core decoration creation logic
│   ├── PreviewWidget.ts       # Widget rendering (bubbles, cards)
│   ├── UrlMatcher.ts          # URL pattern matching
│   ├── MetadataEnricher.ts    # Text enrichment (hashtags, emojis)
│   └── FrontmatterParser.ts   # Per-note configuration
│
├── editor/                    # CodeMirror integration
│   └── urlPreviewDecorator.ts # View plugin coordinator
│
├── services/                  # Business logic layer
│   ├── linkPreviewService.ts  # Main orchestrator
│   ├── MetadataFetcher.ts     # HTTP request handling
│   ├── HtmlParser.ts          # HTML metadata parsing
│   ├── FaviconResolver.ts     # Favicon resolution
│   ├── MetadataValidator.ts   # Soft 404 detection
│   ├── faviconCache.ts        # Persistent favicon cache
│   ├── types.ts               # Service type definitions
│   └── metadataHandlers/      # Domain-specific enrichment
│       ├── index.ts
│       ├── metadataHandler.ts
│       ├── wikipediaMetadataHandler.ts
│       ├── redditMetadataHandler.ts
│       ├── twitterMetadataHandler.ts
│       └── googleSearchMetadataHandler.ts
│
├── utils/                     # Shared utilities
│   ├── logger.ts              # Structured logging
│   ├── performance.ts         # Performance tracking
│   ├── LRUCache.ts           # Memory-bounded cache
│   ├── text.ts               # Text processing
│   ├── url.ts                # URL utilities
│   ├── markdown.ts           # Markdown parsing
│   ├── vault.ts              # Obsidian vault helpers
│   └── editorHelpers.ts      # CodeMirror utilities
│
└── types/                     # TypeScript type definitions
    └── obsidian-extended.ts   # Extended Obsidian API types
```

## Core Components

### 1. Plugin Entry Point (`main.ts`)

**Responsibilities:**
- Plugin lifecycle management (load/unload)
- Settings persistence and normalization
- Service instantiation
- CodeMirror extension registration
- Developer console API exposure

**Key Methods:**
- `onload()` - Initialize services and register editor extensions
- `onunload()` - Cleanup and flush caches
- `saveSettings()` - Persist settings and update services
- `refreshDecorations()` - Force redraw of all previews

### 2. Editor Decoration System (`decorators/`)

#### DecorationBuilder
The heart of the decoration system. Processes markdown documents to create CodeMirror decorations.

**Responsibilities:**
- Parse document line-by-line
- Match URLs (wikilinks, markdown links, bare URLs)
- Create widget decorations for previews
- Handle loading states and errors
- Apply frontmatter configuration

**Key Algorithm:**
```typescript
for each line in document:
  if line is in code block or frontmatter:
    skip

  for each URL match in line:
    if metadata cached:
      create widget with data
    else:
      create loading widget
      fetch metadata asynchronously
      trigger decoration refresh on completion
```

#### PreviewWidget
Renders the actual UI widgets in the editor.

**Widget Types:**
- `UrlPreviewWidget` - Main preview widget (bubble or card)
- `ErrorIndicatorWidget` - Error indicators for failed fetches

**Display Modes:**
- `bubble` - Inline compact preview (default)
- `card` - Expanded card view
- `hidden` - No preview

**Preview Styles:**
- `bubble` - Always inline
- `preview` - Hover-to-expand card
- `card` - Always expanded card

#### UrlMatcher
Pattern matching for different URL types.

**Supported Patterns:**
- Wikilinks: `[[URL|text]]`
- Markdown links: `[text](URL)`
- Bare URLs: `http://...` or `https://...`

**Code Block Detection:**
- Identifies code fences and inline code
- Prevents URL matching within code blocks

#### MetadataEnricher
Text processing utilities for enriching preview content.

**Features:**
- Emoji stripping/preservation (configurable)
- Social media URL cleanup
- Hashtag and @mention styling
- Bold text preservation

#### FrontmatterParser
Per-note configuration via YAML frontmatter.

**Supported Fields:**
```yaml
---
link-preview-mode: bubble|card|hidden
link-preview-style: bubble|preview|card
---
```

### 3. Service Layer (`services/`)

#### LinkPreviewService
Main orchestrator for metadata fetching and enrichment.

**Responsibilities:**
- Coordinate metadata pipeline
- Manage LRU cache (1000 items max)
- Request deduplication (prevent duplicate fetches)
- Concurrency limiting (max 10 parallel requests)
- Apply domain-specific handlers

**Key Features:**
- **Caching:** LRU cache with automatic eviction
- **Request Deduplication:** Multiple requests for same URL share one fetch
- **Concurrency Control:** Limits parallel HTTP requests
- **Error Handling:** Graceful fallbacks for network/HTTP errors

#### MetadataFetcher
HTTP request handling with timeout support.

**Responsibilities:**
- Execute HTTP requests with timeout
- Build proper request headers
- Handle redirects and errors

**Configuration:**
- Default timeout: 5000ms (configurable)
- User-Agent: Identifies as Obsidian plugin

#### HtmlParser
Extracts metadata from HTML responses.

**Parsing Strategy (in order of precedence):**
1. Open Graph tags (`og:*`)
2. Twitter Card tags (`twitter:*`)
3. JSON-LD structured data
4. Standard HTML meta tags
5. Fallback to `<title>` tag

**Extracted Fields:**
- Title
- Description
- Favicon URL
- Site name
- Images

#### FaviconResolver
Resolves and validates favicon URLs.

**Resolution Strategy:**
1. Check persistent cache (FaviconCache)
2. Use favicon from metadata (if provided)
3. Try `/favicon.ico` at domain root
4. Validate URL by attempting fetch
5. Cache successful results

**Validation:**
- HEAD request to check existence
- Content-Type verification
- Results cached to avoid repeated checks

#### MetadataValidator
Detects "soft 404s" - pages that return 200 but show error content.

**Detection Heuristics:**
- Reddit: "page not found" in title/description
- YouTube: "video unavailable" in title
- Generic: Common error patterns in content

#### FaviconCache
Persistent storage for favicon URLs across sessions.

**Features:**
- Persists to disk via plugin data
- Automatic expiration (30 days)
- Debounced saves (1 second)
- Statistics tracking

#### MetadataHandlers
Domain-specific enrichment for special sites.

**Available Handlers:**
- **WikipediaMetadataHandler** - Extract article titles, clean descriptions
- **RedditMetadataHandler** - Fix subreddit metadata
- **TwitterMetadataHandler** - Clean up tweet URLs
- **GoogleSearchMetadataHandler** - Parse search queries

**Handler Pattern:**
```typescript
interface MetadataHandler {
  matches(context: MetadataHandlerContext): Promise<boolean>
  enrich(context: MetadataHandlerContext): Promise<void>
}
```

### 4. Utilities (`utils/`)

#### Logger
Centralized logging with configurable levels.

**Log Levels:**
- `ERROR` (0) - Critical errors
- `WARN` (1) - Warnings
- `INFO` (2) - General info
- `DEBUG` (3) - Detailed debug info

**Usage:**
```typescript
const logger = createLogger("ComponentName")
logger.debug("Detailed debug info")
```

#### Performance
Performance monitoring and profiling.

**Features:**
- Timer class for measuring execution time
- Automatic metrics collection
- Statistics aggregation (count, avg, min, max)
- Enable/disable tracking

**Usage:**
```typescript
const timer = new Timer("operation")
// ... do work ...
timer.end() // Logs and records metrics
```

#### LRUCache
Generic least-recently-used cache with bounded memory.

**Features:**
- Configurable size limit
- Automatic eviction of oldest items
- Statistics tracking (hits, misses, evictions, hit rate)
- O(1) get/set operations

**Usage:**
```typescript
const cache = new LRUCache<string, Metadata>(1000)
cache.set(key, value)
const hit = cache.get(key)
```

## Data Flow

### URL Preview Rendering Flow

```
1. User Types/Opens Note
   ↓
2. CodeMirror Update Event
   ↓
3. urlPreviewDecorator (View Plugin)
   ↓
4. DecorationBuilder.buildDecorations()
   ├─→ FrontmatterParser (get per-note config)
   ├─→ UrlMatcher (find URLs in text)
   └─→ For each URL:
       ├─→ LinkPreviewService.getMetadata()
       │   ├─→ Check LRU cache
       │   ├─→ Check pending requests
       │   ├─→ MetadataFetcher.fetchUrl()
       │   ├─→ HtmlParser.parseHtmlMetadata()
       │   ├─→ Apply MetadataHandlers
       │   └─→ FaviconResolver.resolveFavicon()
       │       └─→ FaviconCache (persistent storage)
       └─→ Create UrlPreviewWidget
   ↓
5. Render Decorations in Editor
```

### Settings Update Flow

```
1. User Changes Setting in UI
   ↓
2. Plugin.saveSettings()
   ├─→ Normalize settings (bounds checking)
   ├─→ Save to disk (plugin.saveData())
   ├─→ Update LinkPreviewService options
   ├─→ Update bubble color CSS
   └─→ Refresh all decorations
   ↓
3. All Open Notes Re-render
```

### Cache Management Flow

```
Metadata Cache (LRUCache):
  - Max 1000 items
  - In-memory only
  - Cleared on timeout setting change
  - Statistics: hits, misses, evictions

Favicon Cache (FaviconCache):
  - Persistent to disk
  - 30-day expiration
  - Debounced saves (1 second)
  - Flushed on plugin unload
```

## Design Patterns

### 1. Service Layer Pattern
All business logic isolated in `services/` directory. Editor decorations only handle rendering.

### 2. Strategy Pattern
MetadataHandlers use strategy pattern for domain-specific enrichment:
```typescript
handlers.forEach(handler => {
  if (await handler.matches(context)) {
    await handler.enrich(context)
  }
})
```

### 3. Builder Pattern
DecorationBuilder builds complex CodeMirror decorations step-by-step.

### 4. Singleton Pattern
- Logger configuration (LoggerConfig)
- Performance tracker (PerformanceTracker)
- Plugin instance

### 5. Dependency Injection
Services receive dependencies via constructor:
```typescript
constructor(
  options: LinkPreviewServiceOptions,
  settings: InlineLinkPreviewSettings,
  metadataHandlers: MetadataHandler[] = createDefaultMetadataHandlers()
)
```

### 6. Lazy Loading
Metadata fetched on-demand and cached. Loading states shown while fetching.

### 7. Request Deduplication
Multiple simultaneous requests for same URL share single fetch promise.

## Performance Considerations

### Memory Management
- **LRU Cache:** Bounded to 1000 items to prevent memory bloat
- **Automatic Eviction:** Oldest items removed when cache is full
- **Favicon Cache Expiration:** 30-day TTL prevents stale data

### Concurrency Control
- **Max Concurrent Requests:** 10 parallel HTTP fetches
- **Request Queuing:** Additional requests wait for slots
- **Request Deduplication:** Prevents duplicate fetches

### Rendering Optimization
- **Non-Destructive:** Decorations don't modify markdown source
- **Incremental Updates:** Only changed lines re-decorated
- **Lazy Fetching:** Metadata fetched only for visible URLs

### Caching Strategy
- **Multi-Layer Caching:**
  - L1: In-memory LRU cache (metadata)
  - L2: Persistent disk cache (favicons)
  - L3: Favicon validation cache (in-memory)

### Performance Monitoring
- **Timer Class:** Measure operation execution time
- **Metrics Collection:** Track counts, averages, min/max
- **Enable/Disable:** Performance tracking optional (disabled by default)

## Error Handling

### Network Errors
- Timeout errors (default 5000ms)
- Connection failures
- DNS resolution failures

**Handling:** Show error indicator, use fallback metadata

### HTTP Errors
- 4xx errors (404, 403, etc.)
- 5xx errors (500, 502, etc.)
- Soft 404s (200 with error content)

**Handling:**
- Configurable via `showHttpErrorWarnings` setting
- If enabled: Show error indicator
- If disabled: Use fallback metadata silently

### Parsing Errors
- Invalid HTML
- Missing metadata tags
- Malformed JSON-LD

**Handling:** Graceful degradation to fallback metadata

### Fallback Metadata
When errors occur, fallback metadata is generated:
```typescript
{
  title: domain name or URL,
  description: null,
  favicon: derived from URL (https://domain/favicon.ico)
}
```

## Developer Tools

### Console API
Accessible via `window.inlineLinkPreview` in browser console:

```javascript
// Cache management
window.inlineLinkPreview.getCacheStats()
window.inlineLinkPreview.clearAllCaches()

// Logging
window.inlineLinkPreview.setLogLevel("debug")

// Performance
window.inlineLinkPreview.enablePerformanceTracking()
window.inlineLinkPreview.getPerformanceMetrics()
window.inlineLinkPreview.resetPerformanceMetrics()

// Utilities
window.inlineLinkPreview.refreshDecorations()
window.inlineLinkPreview.help()
```

### Logging
```typescript
// Set log level
Logger.setGlobalLevel(LogLevel.DEBUG)

// Create logger for component
const logger = createLogger("MyComponent")
logger.debug("Debug message")
```

### Performance Tracking
```typescript
// Enable tracking
enablePerformanceTracking()

// Measure function
await measure("operation", async () => {
  // ... work ...
})

// Get metrics
const metrics = getAllPerformanceMetrics()
// Returns: { name, count, totalTime, averageTime, minTime, maxTime }
```

## Testing

### Test Coverage
- **558 tests** covering core functionality
- Unit tests for each module
- Integration tests for decoration system
- Type safety tests

### Test Organization
```
tests/
├── decorators/      # Decoration system tests
├── services/        # Service layer tests
└── utils/           # Utility tests
```

### Running Tests
```bash
npm test              # Run all tests
npm run test:coverage # Run with coverage report
```

## Configuration

### Plugin Settings
- `previewColorMode` - Background color mode (none/grey/custom)
- `customPreviewColor` - Custom color value
- `maxCardLength` - Max description length for cards (100-5000)
- `maxBubbleLength` - Max description length for bubbles (50-5000)
- `requestTimeoutMs` - HTTP timeout in milliseconds (min 500)
- `showFavicon` - Display favicons in previews
- `keepEmoji` - Preserve emojis in preview text
- `showHttpErrorWarnings` - Show error indicators for HTTP errors

### Per-Note Configuration (Frontmatter)
```yaml
---
link-preview-mode: bubble|card|hidden
link-preview-style: bubble|preview|card
---
```

## Extension Points

### Custom Metadata Handlers
Create domain-specific enrichment:

```typescript
class MyCustomHandler implements MetadataHandler {
  async matches(context: MetadataHandlerContext): Promise<boolean> {
    return context.url.hostname === "example.com"
  }

  async enrich(context: MetadataHandlerContext): Promise<void> {
    // Modify context.metadata
  }
}

// Register handler
linkPreviewService.registerMetadataHandler(new MyCustomHandler())
```

### Custom Widget Rendering
Extend `UrlPreviewWidget` to customize rendering:

```typescript
class CustomPreviewWidget extends UrlPreviewWidget {
  toDOM(): HTMLElement {
    const el = super.toDOM()
    // Customize element
    return el
  }
}
```

## Future Enhancements

### Planned Features
- Virtual scrolling for large documents
- Web workers for heavy parsing
- More aggressive caching strategies
- Pre-commit hooks
- GitHub Actions CI/CD
- Automated release process

### Extensibility
- Plugin API for third-party handlers
- Custom widget templates
- Theme integration
- Custom cache backends
