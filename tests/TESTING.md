# Testing Guide

## Quick Start

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
```

## Writing Tests

Follow the Arrange-Act-Assert pattern:

```typescript
describe("MyService", () => {
  it("should do something specific", async () => {
    // Arrange - Set up test data
    const service = new MyService(options);
    const input = "test";

    // Act - Execute functionality
    const result = await service.doSomething(input);

    // Assert - Verify outcome
    expect(result).toBe("expected");
  });
});
```

## Test Structure

Tests mirror source structure:

```
tests/
├── decorators/          # Decoration tests
├── services/            # Service tests
└── utils/               # Utility tests
```

See existing tests for examples.

## Coverage

Current coverage: ~40% overall
- Utilities: 91% coverage ✓
- Services: 73% coverage ✓
- UI rendering: Intentionally not tested

**Why 40%?** ~60% of codebase is CodeMirror widget rendering (UI code). Testing this requires extensive mocking with low ROI. The 40% business logic is tested at 90%+ coverage.

## Common Patterns

### Async Tests
```typescript
it("should fetch data", async () => {
  mockRequest.mockResolvedValue({ status: 200, text: "data" });
  const result = await service.fetchData();
  expect(result).toBeDefined();
});
```

### Error Tests
```typescript
it("should handle errors", async () => {
  mockRequest.mockRejectedValue(new Error("Network error"));
  const result = await service.fetchData();
  expect(result.error).toContain("network");
});
```

### Timer Tests
```typescript
it("should debounce", async () => {
  vi.useFakeTimers();
  service.doDebounced();
  await vi.advanceTimersByTimeAsync(1000);
  expect(mockSave).toHaveBeenCalledTimes(1);
  vi.useRealTimers();
});
```

## Testing Gotchas

### Frontmatter Must Start on Line 1
```yaml
# ✅ Correct
---
preview-style: card
---

# My Note
```

This is the #1 reason frontmatter tests fail!

### Clear Mocks
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Framework

- **Test Runner:** Vitest
- **DOM Environment:** happy-dom
- **Coverage:** V8 provider

See [Vitest docs](https://vitest.dev/) for more.
