# Phase 4: Plugin Lifecycle Testing - Implementation Plan

**Goal**: Test plugin lifecycle and settings (main.ts and settings.ts)

**Status**: IN PROGRESS

**Current Coverage**: 39% overall

**Target Coverage**: 50-55% overall (adding ~10-15% from plugin files)

---

## Overview

Phase 4 tests the plugin lifecycle and settings management - the "glue" that ties everything together. These files are much simpler than editor integration (no CodeMirror complexity).

### Files to Test

1. **src/settings.ts** (295 lines)
   - Default settings
   - Settings validation and normalization
   - Settings data structure

2. **src/main.ts** (122 lines)
   - Plugin initialization
   - Settings loading/saving
   - Command registration (if testable)

---

## Strategy: Focus on Data and Validation

**Test**: Settings defaults, validation, normalization, data structures
**Skip**: UI components (SettingTab rendering)

### What We CAN Test Effectively

✅ **DEFAULT_SETTINGS** constant
✅ **Settings validation** (value constraints)
✅ **Settings normalization** (ensure valid values)
✅ **Settings data structure** (all fields present)
✅ **Plugin initialization** (mocked Obsidian APIs)
✅ **Settings load/save** (localStorage mocking)

### What We SHOULD Skip

❌ SettingTab UI rendering
❌ Obsidian Modal interactions
❌ Live editor decoration updates (tested in Phase 3)

---

## Implementation Plan

### Step 1: Analyze Settings Structure (15 min)

**Tasks**:
- [ ] Read settings.ts to identify all setting fields
- [ ] List default values
- [ ] Identify validation rules
- [ ] Find edge cases

**Deliverable**: Clear understanding of what to test

---

### Step 2: Test settings.ts (1-2 hours)

**Priority 1: Default Settings** (10+ tests)

**Test File**: `tests/settings.test.ts`

**Tests to Write**:
- [ ] DEFAULT_SETTINGS has all required fields
- [ ] Each field has correct type
- [ ] Each field has valid default value
- [ ] Numeric fields within constraints
- [ ] Boolean fields are boolean
- [ ] String fields are non-empty where required

**Priority 2: Settings Validation** (15+ tests)

- [ ] Valid preview styles (bubble, card)
- [ ] Valid display modes (inline, block)
- [ ] Valid color modes (none, grey, custom)
- [ ] Max card length constraints (100-5000)
- [ ] Max bubble length constraints (50-5000)
- [ ] Invalid values rejected/normalized
- [ ] Edge case values (boundaries)

**Priority 3: Settings Data Structure** (10+ tests)

- [ ] InlineLinkPreviewSettings interface coverage
- [ ] All optional fields work
- [ ] Type safety checks

**Estimated Tests**: 30-40 tests
**Estimated Coverage**: 60-70% of settings.ts (UI excluded)

**Save Point**: After completing settings tests, commit with message:
```
test: Add settings.ts tests (default values, validation)

- 35+ tests for settings validation
- DEFAULT_SETTINGS comprehensive tests
- Type and constraint validation
```

---

### Step 3: Test main.ts (1 hour)

**Priority 1: Plugin Initialization** (10+ tests)

**Test File**: `tests/main.test.ts`

**Tests to Write**:
- [ ] Plugin loads successfully
- [ ] Settings loaded from storage
- [ ] Default settings used when no saved settings
- [ ] Services initialized correctly
- [ ] FaviconCache created
- [ ] LinkPreviewService created

**Priority 2: Settings Management** (8+ tests)

- [ ] Settings save to storage
- [ ] Settings load from storage
- [ ] Settings merge with defaults
- [ ] Invalid settings normalized

**Priority 3: Plugin Lifecycle** (5+ tests)

- [ ] onload() executes
- [ ] onunload() cleans up
- [ ] Services properly disposed

**Estimated Tests**: 20-30 tests
**Estimated Coverage**: 40-50% of main.ts (command/decoration setup may be hard to test)

**Save Point**: After completing main tests, commit with message:
```
test: Add main.ts tests (plugin lifecycle, settings management)

- 25+ tests for plugin initialization
- Settings load/save tests
- Service creation tests
```

---

### Step 4: Update Documentation (30 min)

- [ ] Update TESTING.md with Phase 4 results
- [ ] Update README.md with final test count
- [ ] Update PHASE4-PROGRESS.md
- [ ] Create final summary

**Save Point**: Final commit for Phase 4 completion

---

## Progress Tracking

### Completed Tasks
- [ ] Step 1: Analyze settings structure
- [ ] Step 2: Test settings.ts
  - [ ] DEFAULT_SETTINGS tests (10+ tests)
  - [ ] Validation tests (15+ tests)
  - [ ] Data structure tests (10+ tests)
- [ ] Step 3: Test main.ts
  - [ ] Initialization tests (10+ tests)
  - [ ] Settings management tests (8+ tests)
  - [ ] Lifecycle tests (5+ tests)
- [ ] Step 4: Documentation updates

### Current Status

**Last Completed**: Phase 3 (editor integration)
**Next Task**: Step 1 - Analyze settings structure
**Estimated Total Tests to Add**: 50-70 tests
**Estimated Coverage Gain**: 10-15 percentage points

---

## Mocking Strategy

**Obsidian APIs to Mock**:
- `Plugin` class
- `App` object
- `loadData()` / `saveData()`
- `addSettingTab()`
- `Vault`

**Already Available**:
- `tests/mocks/obsidian.ts` has basic stubs
- May need to enhance for plugin testing

---

## Risk Mitigation

**Challenge**: Obsidian Plugin class is complex

**Solution**: Focus on testable methods (loadData, saveData, initialization)

**Challenge**: SettingTab is all UI

**Solution**: Skip SettingTab.display(), only test settings logic

**Challenge**: Editor decoration setup is integration-heavy

**Solution**: Test that services are created, not that decorations work (Phase 3 covered that)

---

## Expected Outcomes

**Test Count**: 407 → 457-477 tests (+50-70 tests)
**Coverage**: 39% → 50-55% (+11-16 percentage points)
**Files Tested**: 10 → 12 files

**Quality Metrics**:
- 90%+ coverage of settings validation logic
- 50%+ coverage of plugin lifecycle
- Comprehensive default settings tests
- Complete test suite for all business logic

---

## Success Criteria

✅ Phase 4 is complete when:
- [ ] DEFAULT_SETTINGS fully tested (10+ tests)
- [ ] Settings validation comprehensive (15+ tests)
- [ ] Plugin initialization tested (10+ tests)
- [ ] Settings load/save tested (8+ tests)
- [ ] Overall coverage reaches 50%+
- [ ] All tests passing
- [ ] Documentation updated

---

**Last Updated**: Phase 4 start
**Next Review**: After Step 1 completion
