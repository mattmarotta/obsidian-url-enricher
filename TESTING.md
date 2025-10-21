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

**Note**: Current coverage is ~18%. See [Future Testing Goals](#future-testing-goals) for the roadmap to reach these thresholds.

## Test Infrastructure

### Directory Structure

```
tests/
├── setup.ts                      # Global test setup/teardown
├── mocks/
│   └── obsidian.ts               # Obsidian API mocks
├── fixtures/
│   ├── html-samples.ts           # Sample HTML for metadata parsing tests
│   └── url-samples.ts            # URL test data
├── helpers/
│   ├── assertion-helpers.ts      # Custom assertion utilities
│   └── mock-helpers.ts           # Mock creation utilities
├── utils/
│   ├── text.test.ts              # Text utility tests (45 tests)
│   └── url.test.ts               # URL utility tests (63 tests)
└── services/
    ├── faviconCache.test.ts      # Favicon cache tests (41 tests)
    └── metadataHandlers.test.ts  # Metadata handler tests (45 tests)
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

### Current Coverage: ~18%

**Test Files**: 4 files, 194 tests

**Fully Tested (90%+ coverage):**

1. **src/utils/url.ts** (86% coverage, 63 tests)
   - `extractSingleUrl()`: Extracting URLs from text
   - `looksLikeUrl()`: URL validation
   - `extractUrlList()`: Finding multiple URLs in text
   - Edge cases: wrapped URLs, markdown links, special characters

2. **src/utils/text.ts** (67% coverage, 45 tests)
   - `decodeHtmlEntities()`: HTML entity decoding
   - `stripHtmlTags()`: Removing HTML tags
   - `collapseWhitespace()`: Normalizing whitespace
   - `sanitizeTextContent()`: Full text sanitization pipeline

3. **src/services/faviconCache.ts** (97% coverage, 41 tests)
   - Two-tier caching (memory + disk)
   - 30-day expiration
   - Debounced saves (1 second)
   - Error handling
   - Cache statistics

4. **src/services/metadataHandlers/** (90-96% coverage, 45 tests)
   - **Wikipedia Handler** (96%): Fetches Wikipedia article extracts via API
   - **Reddit Handler** (94%): Parses Reddit post metadata with special formatting
   - **Google Search Handler** (95%): Enriches Google search URLs with query text

### Not Yet Tested

**High Priority (large, testable files):**

- **src/services/linkPreviewService.ts** (700 lines)
  - Metadata fetching and caching
  - HTTP request handling
  - HTML parsing
  - Error handling (HTTP errors vs network errors)

**Medium Priority:**

- **src/settings.ts** (295 lines) - Settings UI and normalization
- **src/main.ts** (122 lines) - Plugin lifecycle
- **src/utils/*** - Remaining utilities (editorHelpers, markdown, vault, etc.)

**Low Priority (difficult to test):**

- **src/editor/urlRangeDecorator.ts** (1139 lines) - CodeMirror widget rendering
- **src/editor/urlPreviewDecorator.ts** (132 lines) - Editor integration

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

## Future Testing Goals

### Phase 1: Core Services (Target: 40% overall coverage)

**Priority 1: Link Preview Service**

Create `tests/services/linkPreviewService.test.ts` covering:

- Metadata caching (memory cache)
- URL normalization
- HTTP request handling with timeout
- HTML metadata parsing (OpenGraph, Twitter Cards)
- Error handling (HTTP vs network errors)
- Settings integration (`showHttpErrorWarnings`)
- Metadata handler integration

Target: 50% coverage of linkPreviewService.ts (~350 lines)

**Priority 2: Settings Normalization**

Create `tests/settings.test.ts` covering:

- Default settings
- Settings validation
- Frontmatter override logic (per-file settings)
- Settings migration

Target: 40% coverage of settings.ts (~120 lines)

### Phase 2: Remaining Utilities (Target: 50% overall coverage)

**Utilities to Test:**

- `src/utils/editorHelpers.ts`: Editor state utilities
- `src/utils/markdown.ts`: Markdown parsing
- `src/utils/stringReplace.ts`: String replacement utilities
- `src/utils/vault.ts`: Vault utilities

### Phase 3: Editor Integration (Target: 60% overall coverage)

**Challenging to Test (CodeMirror-specific):**

- `src/editor/urlPreviewDecorator.ts`: Frontmatter parsing, decoration logic
- `src/editor/urlRangeDecorator.ts`: Widget rendering (very difficult)

These require:
1. Mocking CodeMirror 6 APIs
2. Testing decoration creation without actual DOM rendering
3. Focus on business logic (frontmatter parsing, URL extraction) rather than widget rendering

### Phase 4: Plugin Lifecycle (Target: 70% overall coverage)

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
