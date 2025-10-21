# Testing Guide

This document describes the testing infrastructure, current test coverage, and testing strategy for the Obsidian Inline Link Preview plugin.

## Table of Contents

- [Overview](#overview)
- [Running Tests](#running-tests)
- [Test Infrastructure](#test-infrastructure)
- [Test Coverage](#test-coverage)
- [Writing Tests](#writing-tests)
- [Continuous Integration](#continuous-integration)
- [Future Testing Goals](#future-testing-goals)

## Overview

The plugin uses [Vitest](https://vitest.dev/) as the testing framework with the following features:

- **Test Runner**: Vitest (fast, modern, ESM-native)
- **DOM Environment**: happy-dom (lightweight DOM implementation for Node.js)
- **Coverage**: V8 coverage provider
- **Mocking**: Vitest's built-in mocking utilities
- **CI/CD**: GitHub Actions

## Running Tests

### Basic Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with UI dashboard
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Coverage Thresholds

The project has coverage thresholds configured in `vitest.config.ts`:

- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 65%
- **Statements**: 70%

**Note**: Current coverage is ~39%. See [Future Testing Goals](#future-testing-goals) for the roadmap to reach these thresholds.

## Test Infrastructure

### Directory Structure

```
tests/
├── setup.ts                         # Global test setup/teardown
├── mocks/
│   ├── codemirror.ts                # Minimal CodeMirror 6 mocks for editor tests
│   └── obsidian.ts                  # Obsidian API mocks (TFile, TFolder, MockRequestUrlBuilder)
├── fixtures/
│   ├── html-samples.ts              # Sample HTML for metadata parsing tests
│   └── url-samples.ts               # URL test data
├── helpers/
│   ├── assertion-helpers.ts         # Custom assertion utilities
│   └── mock-helpers.ts              # Mock creation utilities
├── utils/
│   ├── editorHelpers.test.ts        # Editor helper tests (19 tests)
│   ├── markdown.test.ts             # Markdown utility tests (27 tests)
│   ├── stringReplace.test.ts        # String replacement tests (22 tests)
│   ├── text.test.ts                 # Text utility tests (45 tests)
│   ├── url.test.ts                  # URL utility tests (67 tests)
│   └── vault.test.ts                # Vault utility tests (30 tests)
├── editor/
│   └── urlPreviewDecorator.test.ts  # Editor decorator business logic (95 tests)
└── services/
    ├── faviconCache.test.ts         # Favicon cache tests (41 tests)
    ├── linkPreviewService.test.ts   # Link preview service tests (52 tests)
    └── metadataHandlers.test.ts     # Metadata handler tests (45 tests)
```

### Key Test Files

#### **tests/setup.ts**

Global test configuration that runs before/after each test:

```typescript
beforeEach(() => {
  mockRequestUrlBuilder.reset(); // Clear HTTP mocks
  vi.clearAllMocks();            // Clear mock call history
});

afterEach(() => {
  vi.clearAllTimers();           // Clean up timers
  vi.restoreAllMocks();          // Restore original implementations
});
```

#### **tests/mocks/obsidian.ts**

Provides mock implementations of Obsidian APIs that aren't available in the test environment:

- `MockRequestUrlBuilder`: Sophisticated HTTP request mocking
- Stub implementations of Obsidian classes (`Plugin`, `TFile`, `Notice`, etc.)

Example usage:

```typescript
import { mockRequestUrlBuilder } from '../mocks/obsidian';

mockRequestUrlBuilder.mockResponse('https://example.com', {
  status: 200,
  text: '<html>...</html>',
  headers: { 'content-type': 'text/html' }
});
```

#### **tests/fixtures/**

Reusable test data:

- **html-samples.ts**: Sample HTML pages for metadata parsing
- **url-samples.ts**: Valid/invalid URLs, markdown links, etc.

#### **tests/helpers/**

Test utilities:

- **assertion-helpers.ts**: Custom assertions like `expectValidUrl`, `expectMetadataStructure`
- **mock-helpers.ts**: Functions to create mock HTTP responses

## Test Coverage

### Current Coverage: ~39%

**Test Files**: 10 files, 407 tests

**Fully Tested (90%+ coverage):**

1. **src/utils/** (91% overall coverage, 210 tests)
   - **editorHelpers.ts** (100%, 19 tests): Editor position utilities, selection handling
   - **markdown.ts** (95%, 27 tests): Markdown link detection and range finding
   - **stringReplace.ts** (100%, 22 tests): Text replacement with position tracking
   - **text.ts** (67%, 45 tests): HTML entity decoding, tag stripping, whitespace normalization
   - **url.ts** (98%, 67 tests): URL extraction, validation, markdown link handling
   - **vault.ts** (100%, 30 tests): Vault file/folder traversal and filtering

2. **src/services/faviconCache.ts** (97% coverage, 41 tests)
   - Two-tier caching (memory + disk)
   - 30-day expiration
   - Debounced saves (1 second)
   - Error handling and cache statistics

3. **src/services/linkPreviewService.ts** (69% coverage, 52 tests)
   - HTTP request handling with timeout
   - Metadata caching (memory cache)
   - HTML metadata parsing (OpenGraph, Twitter Cards, JSON-LD)
   - Error handling (HTTP errors vs network errors)
   - Soft 404 detection (Reddit, YouTube, generic patterns)
   - Settings integration and metadata handler delegation

4. **src/services/metadataHandlers/** (92% coverage, 45 tests)
   - **Wikipedia Handler** (96%): Fetches Wikipedia article extracts via API
   - **Reddit Handler** (94%): Parses Reddit post metadata with special formatting
   - **Google Search Handler** (95%): Enriches Google search URLs with query text

5. **src/editor/urlPreviewDecorator.ts** (Business logic tested, 95 tests)
   - **parsePageConfig** (33 tests): Frontmatter parsing for all settings (preview-style, display-mode, etc.)
   - **stripEmoji** (11 tests): Emoji removal and whitespace normalization
   - **truncate** (10 tests): Text truncation with ellipsis
   - **deriveTitleFromUrl** (11 tests): Hostname extraction from URLs
   - **equalsIgnoreCase** (10 tests): Case-insensitive string comparison
   - **sanitizeLinkText** (10 tests): HTML sanitization with emoji handling
   - Note: Widget rendering intentionally not tested (UI/DOM code)

### Not Yet Tested

**Medium Priority:**

- **src/settings.ts** (295 lines)
  - Settings UI and normalization
  - Default settings and validation
  - Frontmatter override logic
  - Settings migration

- **src/main.ts** (122 lines)
  - Plugin lifecycle (initialization, unload)
  - Settings loading and management
  - Command registration
  - Editor decoration setup

**Low Priority (difficult to test):**

- **src/editor/urlRangeDecorator.ts** (1139 lines)
  - CodeMirror widget rendering
  - Card mode vs bubble mode rendering
  - Hover states and animations
  - Content loading and error states

- **src/editor/urlPreviewDecorator.ts** (132 lines)
  - Editor integration
  - Frontmatter parsing
  - Decoration logic and state management

## Writing Tests

### Test Structure

Follow the Arrange-Act-Assert pattern:

```typescript
describe('FeatureName', () => {
  let service: MyService;
  let mockDependency: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Arrange: Set up test data and mocks
    mockDependency = vi.fn();
    service = new MyService(mockDependency);
  });

  it('should do something specific', () => {
    // Arrange: Additional setup if needed
    const input = 'test';

    // Act: Execute the functionality
    const result = service.doSomething(input);

    // Assert: Verify the outcome
    expect(result).toBe('expected');
    expect(mockDependency).toHaveBeenCalledWith(input);
  });
});
```

### Testing Async Code

```typescript
it('should fetch data asynchronously', async () => {
  mockRequest.mockResolvedValue({
    status: 200,
    text: 'response data',
  });

  const result = await service.fetchData();

  expect(result).toBeDefined();
});
```

### Testing Errors

```typescript
it('should handle errors gracefully', async () => {
  mockRequest.mockRejectedValue(new Error('Network error'));

  const result = await service.fetchData();

  expect(result.error).toContain('network');
});
```

### Testing with Timers

```typescript
it('should debounce operations', async () => {
  vi.useFakeTimers();

  service.doSomethingDebounced();
  service.doSomethingDebounced();

  // Nothing happened yet
  expect(mockSave).not.toHaveBeenCalled();

  // Advance time
  await vi.advanceTimersByTimeAsync(1000);

  // Now it happened once (debounced)
  expect(mockSave).toHaveBeenCalledTimes(1);

  vi.useRealTimers();
});
```

### Best Practices

1. **Test behavior, not implementation**: Focus on what the code does, not how it does it
2. **One assertion per test when possible**: Makes failures easier to diagnose
3. **Use descriptive test names**: `should do X when Y` format
4. **Test edge cases**: Empty strings, null values, very long inputs, etc.
5. **Mock external dependencies**: Obsidian APIs, HTTP requests, file system
6. **Clean up after tests**: Use `beforeEach`/`afterEach` to reset state

## Continuous Integration

### GitHub Actions

The project uses GitHub Actions for CI/CD. Tests run automatically on:

- **Push** to `master` or `develop` branches
- **Pull requests** targeting `master` or `develop`

### Workflow: `.github/workflows/test.yml`

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup Node.js 20.x
      - Install dependencies
      - Run tests
      - Generate coverage report
      - Upload to Codecov (optional)
```

### Viewing Results

- **GitHub Actions**: Check the "Actions" tab in the repository
- **Pull Requests**: Test status appears as a check on PRs
- **Codecov**: Coverage reports (if configured)

## Testing Roadmap Progress

### ✅ Phase 1: Core Services (COMPLETED)

**Achieved: 39% overall coverage**

**✓ Link Preview Service** (`tests/services/linkPreviewService.test.ts` - 52 tests)

- ✓ Metadata caching (memory cache)
- ✓ HTTP request handling with timeout
- ✓ HTML metadata parsing (OpenGraph, Twitter Cards, JSON-LD)
- ✓ Error handling (HTTP vs network errors)
- ✓ Soft 404 detection (Reddit, YouTube, generic patterns)
- ✓ Settings integration (`showHttpErrorWarnings`)
- ✓ Metadata handler integration

Result: 69% coverage of linkPreviewService.ts

### ✅ Phase 2: Remaining Utilities (COMPLETED)

**Achieved: 91% utilities coverage (210 tests)**

**✓ Utilities Tested:**

- ✓ `src/utils/editorHelpers.ts` (100%, 19 tests): Editor position utilities
- ✓ `src/utils/markdown.ts` (95%, 27 tests): Markdown link detection
- ✓ `src/utils/stringReplace.ts` (100%, 22 tests): String replacement
- ✓ `src/utils/vault.ts` (100%, 30 tests): Vault file/folder traversal

**Enhanced Coverage:**

- ✓ `src/utils/url.ts`: 86% → 98% (added 4 tests for markdown link handling)
- ✓ `src/utils/text.ts`: 67% (comprehensive, limited by happy-dom environment)

Result: All utility files have excellent test coverage (90%+ except text.ts which is environment-limited)

### ✅ Phase 3: Editor Integration (COMPLETED)

**Achieved: 39% overall coverage (stable)**

**✓ urlPreviewDecorator.ts Business Logic** (`tests/editor/urlPreviewDecorator.test.ts` - 95 tests)

- ✓ parsePageConfig (33 tests): Frontmatter parsing with validation
- ✓ stripEmoji (11 tests): Emoji removal and whitespace handling
- ✓ truncate (10 tests): Text truncation with ellipsis
- ✓ deriveTitleFromUrl (11 tests): Hostname extraction
- ✓ equalsIgnoreCase (10 tests): Case-insensitive comparison
- ✓ sanitizeLinkText (10 tests): HTML sanitization + emoji handling

**Intentionally Skipped** (as planned):
- ❌ Widget rendering (DOM/UI code)
- ❌ CodeMirror decoration internals
- ❌ faviconDecorator.ts (simple wrapper, mostly UI)

Result: All testable business logic in editor files covered. Widget rendering appropriately excluded.

### Phase 4: Plugin Lifecycle (Not Started - Future work)

**Test:**

- `src/main.ts`: Plugin initialization, settings loading, command registration

This is the final phase because it requires mocking the full Obsidian plugin lifecycle.

## Troubleshooting

### Tests Failing in CI but Passing Locally

1. **Check Node version**: CI uses Node 20.x
2. **Check dependencies**: Run `npm ci` (clean install) instead of `npm install`
3. **Check for test isolation issues**: Tests may pass individually but fail when run together
4. **Check for timing issues**: Use `vi.useFakeTimers()` for time-dependent tests

### Coverage Not Updating

1. **Clear coverage cache**: `rm -rf coverage/`
2. **Reinstall dependencies**: `rm -rf node_modules && npm ci`
3. **Check vitest.config.ts**: Ensure coverage.include patterns are correct

### Happy-DOM Limitations

Happy-DOM is a lightweight DOM implementation and doesn't support all browser APIs:

- **Limited HTML entity decoding**: Extended entities like `&copy;`, `&ndash;` may not decode
- **No CSS rendering**: Can't test visual layout
- **Limited event simulation**: Some DOM events may not fire as expected

If you encounter happy-dom limitations, consider:
1. Testing the logic separately from the DOM interaction
2. Using mocks to simulate the behavior
3. Documenting the limitation in test comments

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Happy-DOM Documentation](https://github.com/capricorn86/happy-dom)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Obsidian Plugin Development](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## Contributing

When adding new features:

1. **Write tests first** (TDD approach) or alongside the feature
2. **Aim for 70%+ coverage** of new code
3. **Test edge cases** and error conditions
4. **Update fixtures** if adding new test data
5. **Document complex test scenarios** in comments

When fixing bugs:

1. **Add a failing test** that reproduces the bug
2. **Fix the bug** until the test passes
3. **Add regression tests** for related edge cases
