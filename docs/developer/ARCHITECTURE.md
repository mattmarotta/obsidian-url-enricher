# Architecture

High-level overview of URL Enricher's design.

## Overview

URL Enricher adds non-destructive link previews to Obsidian using CodeMirror decorations. The markdown source is never modified — previews are purely visual.

## Structure

```
src/
├── main.ts                    # Plugin entry, lifecycle management
├── settings.ts                # Settings UI
├── constants.ts               # Application constants
│
├── decorators/                # Editor decoration system
│   ├── DecorationBuilder.ts   # Finds URLs, creates widgets
│   ├── PreviewWidget.ts       # Renders preview bubbles/cards
│   ├── UrlMatcher.ts          # URL pattern matching
│   └── FrontmatterParser.ts   # Per-page config
│
├── editor/                    # CodeMirror integration
│   └── urlPreviewDecorator.ts # View plugin coordinator
│
├── services/                  # Business logic
│   ├── linkPreviewService.ts  # Main orchestrator, caching
│   ├── MetadataFetcher.ts     # HTTP requests
│   ├── HtmlParser.ts          # HTML metadata extraction
│   ├── FaviconResolver.ts     # Favicon resolution
│   ├── MetadataValidator.ts   # Soft 404 detection
│   ├── faviconCache.ts        # Persistent favicon cache
│   └── metadataHandlers/      # Domain-specific enrichment
│       ├── wikipediaMetadataHandler.ts
│       ├── redditMetadataHandler.ts
│       ├── twitterMetadataHandler.ts
│       └── googleSearchMetadataHandler.ts
│
└── utils/                     # Shared utilities
    ├── logger.ts              # Structured logging
    ├── performance.ts         # Performance tracking
    ├── LRUCache.ts           # Memory-bounded cache
    ├── text.ts               # Text processing
    ├── url.ts                # URL utilities
    └── markdown.ts           # Markdown parsing
```

## Key Components

### Plugin (`main.ts`)
- Lifecycle management (load/unload)
- Settings persistence
- Service instantiation
- Console API exposure

### DecorationBuilder
- Processes markdown line-by-line
- Matches URLs (wikilinks, markdown links, bare URLs)
- Creates CodeMirror widget decorations
- Handles loading states and errors

### LinkPreviewService
- Coordinates metadata fetching
- LRU cache (1000 items max)
- Request deduplication (multiple requests → single fetch)
- Concurrency limiting (max 10 parallel requests)
- Applies domain-specific handlers

### MetadataHandlers
Domain-specific enrichment using strategy pattern:
- Wikipedia: API extracts, shows "WIKIPEDIA"
- Reddit: Custom formatting, extracts post content
- Twitter/X: oEmbed API, shows @username
- Google Search: Extracts query
- LinkedIn: Cleans hashtags

## Data Flow

```
1. User types URL in note
2. CodeMirror update event
3. urlPreviewDecorator triggers
4. DecorationBuilder.buildDecorations()
   ├─ FrontmatterParser (get page config)
   ├─ UrlMatcher (find URLs)
   └─ For each URL:
       ├─ LinkPreviewService.getMetadata()
       │   ├─ Check LRU cache
       │   ├─ Check pending requests
       │   ├─ MetadataFetcher.fetchUrl()
       │   ├─ HtmlParser.parseHtmlMetadata()
       │   ├─ Apply MetadataHandlers
       │   └─ FaviconResolver.resolveFavicon()
       └─ Create PreviewWidget
5. Render decorations in editor
```

## Settings Update Flow

```
1. User changes setting
2. Plugin.saveSettings()
   ├─ Normalize (bounds checking)
   ├─ Save to disk
   ├─ Update LinkPreviewService
   └─ Refresh decorations
3. All notes re-render
```

## Design Patterns

- **Service Layer:** Business logic isolated from UI
- **Strategy:** MetadataHandlers for domain-specific logic
- **Builder:** DecorationBuilder for complex decorations
- **Singleton:** Logger, PerformanceTracker
- **Dependency Injection:** Services receive dependencies via constructor
- **Lazy Loading:** Metadata fetched on-demand, cached
- **Request Deduplication:** Simultaneous requests share promise

## Performance

### Memory Management
- LRU cache: 1000 item limit
- Automatic eviction of oldest items
- Favicon cache: 30-day TTL

### Concurrency Control
- Max 10 concurrent HTTP requests
- Request queueing for excess
- Request deduplication

### Caching Strategy
- L1: In-memory LRU (metadata)
- L2: Persistent disk (favicons)

## Error Handling

**Network errors:** Timeout, connection failures, DNS errors
**HTTP errors:** 4xx, 5xx, soft 404s (configurable warnings)
**Parsing errors:** Invalid HTML, missing metadata

**All errors → graceful fallback:** Show URL or basic metadata

## Extension Points

### Custom Metadata Handlers

```typescript
class MyHandler implements MetadataHandler {
  async matches(context: MetadataHandlerContext): Promise<boolean> {
    return context.url.hostname === "example.com";
  }

  async enrich(context: MetadataHandlerContext): Promise<void> {
    // Modify context.metadata
  }
}

// Register in metadataHandlers/index.ts
```

### Custom Widgets

Extend `PreviewWidget` for custom rendering.

## Testing

558 tests covering:
- Utilities (91% coverage)
- Services (73% coverage)
- Business logic extraction

UI rendering intentionally not tested (heavy mocking, low ROI).

See [TESTING.md](TESTING.md) for details.

---

For detailed information, see code comments and existing implementations.
