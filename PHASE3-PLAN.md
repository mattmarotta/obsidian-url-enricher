# Phase 3: Editor Integration Testing - Implementation Plan

**Goal**: Test editor integration code (urlPreviewDecorator.ts and urlRangeDecorator.ts)

**Status**: NOT STARTED

**Current Coverage**: 39% overall, 0% editor files

**Target Coverage**: 50-60% overall (adding ~20% coverage from editor files)

---

## Overview

Phase 3 tackles the most challenging testing area: CodeMirror 6 editor integration. These files are large and complex, but we'll focus on **business logic** over UI rendering.

### Files to Test

1. **src/editor/urlPreviewDecorator.ts** (132 lines)
   - Frontmatter parsing
   - Settings merging (global + page-level)
   - URL detection logic
   - Decoration creation logic

2. **src/editor/urlRangeDecorator.ts** (1,139 lines)
   - Widget rendering (SKIP complex UI rendering)
   - Metadata display logic
   - Text truncation and formatting
   - Hover state management (business logic only)

---

## Strategy: Focus on Testable Logic

**Test**: Business logic, data transformation, decision-making
**Skip**: Widget rendering, DOM manipulation, visual styling

### What We CAN Test Effectively

✅ **Frontmatter parsing** (parsePageConfig function)
✅ **Settings merging** (global settings + page overrides)
✅ **URL extraction from editor state**
✅ **Text truncation algorithms**
✅ **Emoji stripping logic**
✅ **Metadata formatting** (title/description processing)
✅ **Display mode logic** (inline vs block decisions)

### What We SHOULD Skip

❌ Widget DOM rendering
❌ CodeMirror decoration positioning
❌ CSS class application
❌ Mouse event handling in widgets
❌ Visual hover effects

---

## Implementation Plan

### Step 1: Setup Test Infrastructure (30 min)

**Tasks**:
- [ ] Create `tests/editor/urlPreviewDecorator.test.ts`
- [ ] Create `tests/editor/urlRangeDecorator.test.ts`
- [ ] Add minimal CodeMirror mocks to `tests/mocks/codemirror.ts`
- [ ] Create editor state helper functions

**Mocks Needed**:
```typescript
// Mock just enough to test logic
- EditorView (minimal)
- EditorState (with document text)
- Decoration (stub)
- RangeSetBuilder (stub)
```

**Deliverable**: Test file structure ready, basic mocks created

---

### Step 2: Test urlPreviewDecorator.ts Logic (1-2 hours)

**Priority 1: Frontmatter Parsing** (Most testable, high value)

**Test File**: `tests/editor/urlPreviewDecorator.test.ts`

**Functions to Test**:
- [ ] `parsePageConfig()` - 25+ tests
  - Valid frontmatter parsing
  - Preview style detection (bubble/card)
  - Display mode detection (inline/block)
  - Numeric constraints (max-card-length, max-bubble-length)
  - Boolean flags (show-favicon, include-description)
  - Color mode parsing
  - Invalid/malformed frontmatter handling
  - Missing frontmatter
  - Edge cases (empty document, no closing ---, etc.)

**Priority 2: Helper Functions**

- [ ] `stripEmoji()` - 10+ tests
  - Basic emoji removal
  - Multiple emojis
  - Emoji + text
  - No emojis
  - Edge cases (emoji-like Unicode)

**Priority 3: Settings Merging Logic**

- [ ] Test how page config overrides global settings
- [ ] Test fallback to defaults
- [ ] Test partial overrides

**Estimated Coverage**: 60-70% of urlPreviewDecorator.ts

**Save Point**: After completing urlPreviewDecorator tests, commit with message:
```
test: Add urlPreviewDecorator.ts tests (frontmatter parsing, settings merging)

- 35+ tests for frontmatter parsing
- stripEmoji utility tests
- Settings override logic tests
```

---

### Step 3: Test urlRangeDecorator.ts Logic (2-3 hours)

**Priority 1: Text Processing Functions** (Highest ROI)

**Test File**: `tests/editor/urlRangeDecorator.test.ts`

Functions to identify and test:
- [ ] Text truncation logic - 15+ tests
  - Truncate to max length
  - Preserve word boundaries
  - Add ellipsis correctly
  - Handle short text (no truncation needed)
  - Handle edge cases (exact length, one char over, etc.)

- [ ] Title/description formatting - 10+ tests
  - Sanitize HTML in titles
  - Remove extra whitespace
  - Handle empty/null titles
  - Fallback to URL for missing titles

- [ ] URL display logic - 8+ tests
  - Extract hostname
  - Format display URLs
  - Handle different URL formats
  - Truncate long URLs

**Priority 2: Metadata Processing**

- [ ] Favicon URL handling - 5+ tests
  - Valid favicon URLs
  - Fallback for missing favicons
  - Error handling

- [ ] Description processing - 8+ tests
  - Truncate descriptions
  - Remove HTML
  - Handle missing descriptions

**Priority 3: Display Mode Logic**

- [ ] Inline vs block display decisions - 5+ tests
  - Based on settings
  - Based on context

**Estimated Coverage**: 20-30% of urlRangeDecorator.ts (due to UI focus in this file)

**Save Point**: After completing urlRangeDecorator tests, commit with message:
```
test: Add urlRangeDecorator.ts tests (text processing, metadata formatting)

- 40+ tests for text truncation and formatting
- Metadata display logic tests
- URL formatting tests
```

---

### Step 4: Integration Tests (1 hour)

**Test File**: `tests/editor/integration.test.ts`

Test how the two decorators work together:
- [ ] Frontmatter affects widget rendering
- [ ] Settings changes trigger updates
- [ ] URL detection → metadata fetching → display

**Save Point**: Commit integration tests

---

### Step 5: Update Documentation (30 min)

- [ ] Update TESTING.md with Phase 3 results
- [ ] Update README.md with new test count and coverage
- [ ] Update coverage thresholds if needed

**Save Point**: Final commit for Phase 3 completion

---

## Progress Tracking

### Completed Tasks
- [ ] Step 1: Setup Test Infrastructure
- [ ] Step 2: urlPreviewDecorator.ts tests
  - [ ] parsePageConfig tests (25+ tests)
  - [ ] stripEmoji tests (10+ tests)
  - [ ] Settings merging tests (5+ tests)
- [ ] Step 3: urlRangeDecorator.ts tests
  - [ ] Text truncation tests (15+ tests)
  - [ ] Title/description formatting tests (10+ tests)
  - [ ] URL display tests (8+ tests)
  - [ ] Favicon handling tests (5+ tests)
  - [ ] Description processing tests (8+ tests)
  - [ ] Display mode tests (5+ tests)
- [ ] Step 4: Integration tests (10+ tests)
- [ ] Step 5: Documentation updates

### Current Status

**Last Completed**: Phase 2 (Utilities testing)
**Next Task**: Step 1 - Setup Test Infrastructure
**Estimated Total Tests to Add**: 100-120 tests
**Estimated Coverage Gain**: 15-20 percentage points

---

## Token Usage Strategy

**Save frequently after each major milestone**:
1. After test infrastructure setup
2. After parsePageConfig tests (largest chunk)
3. After stripEmoji tests
4. After each urlRangeDecorator function group
5. After integration tests
6. After documentation

**Resume Instructions**:
If you need to resume after token reset:
1. Read this file (PHASE3-PLAN.md)
2. Check "Completed Tasks" section
3. Look at "Current Status" → "Next Task"
4. Run `npm test` to see current state
5. Continue from the next unchecked task

---

## Risk Mitigation

**Challenge**: CodeMirror APIs are complex to mock

**Solution**: Extract pure functions where possible, test those independently

**Challenge**: Widget rendering is hard to test

**Solution**: Focus on data transformation logic that feeds the widgets

**Challenge**: Large files with mixed concerns

**Solution**: Test small, focused units of business logic

---

## Expected Outcomes

**Test Count**: 322 → 420-440 tests (+100-120 tests)
**Coverage**: 39% → 50-55% (+11-16 percentage points)
**Files Tested**: 9 → 11 files

**Quality Metrics**:
- 90%+ coverage of testable business logic in editor files
- Comprehensive frontmatter parsing tests
- Good coverage of text processing algorithms
- Integration tests validate end-to-end flows

---

## Notes for Resuming

**Key Files to Remember**:
- This plan: `PHASE3-PLAN.md`
- Test files: `tests/editor/*.test.ts`
- Source files: `src/editor/urlPreviewDecorator.ts` (132 lines)
- Source files: `src/editor/urlRangeDecorator.ts` (1,139 lines)

**Commands**:
```bash
# Check progress
npm test

# Check coverage
npm run test:coverage

# Run specific test file
npm test tests/editor/urlPreviewDecorator.test.ts
```

**Git Commits**:
Make small, focused commits after each major section. This allows easy rollback and clear progress tracking.

---

## Success Criteria

✅ Phase 3 is complete when:
- [ ] parsePageConfig has 25+ tests with edge cases
- [ ] All text processing functions have comprehensive tests
- [ ] Integration tests validate decorator interactions
- [ ] Overall coverage reaches 50%+
- [ ] All tests pass in CI
- [ ] Documentation is updated

---

**Last Updated**: Initial plan creation
**Next Review**: After Step 1 completion
