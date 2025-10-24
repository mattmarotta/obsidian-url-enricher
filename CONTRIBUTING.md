# Contributing Guide

Thank you for your interest in contributing to the URL Enricher plugin! This guide will help you get started and maintain consistency across the codebase.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [TypeScript Guidelines](#typescript-guidelines)
- [Testing](#testing)
- [Git Workflow](#git-workflow)
- [Version Management & Releases](#version-management--releases)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Performance Considerations](#performance-considerations)

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- TypeScript 4.9+
- Basic understanding of Obsidian plugin API
- Familiarity with CodeMirror 6

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/obsidian-inline-link-preview.git
   cd obsidian-inline-link-preview
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the plugin**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Development build with watch mode**
   ```bash
   npm run dev
   ```

6. **Link to Obsidian vault for testing**
   ```bash
   # Create symlink to your vault's plugins directory
   ln -s "$(pwd)" "/path/to/vault/.obsidian/plugins/obsidian-inline-link-preview"
   ```

7. **⚠️ IMPORTANT: Set up git hooks**
   ```bash
   git config core.hooksPath .husky
   ```
   This enables pre-commit hooks that run TypeScript validation and tests automatically before each commit.

## Coding Standards

### General Principles

1. **Readability First** - Code should be self-documenting
2. **Single Responsibility** - Each function/class should have one clear purpose
3. **DRY (Don't Repeat Yourself)** - Extract common logic into utilities
4. **KISS (Keep It Simple)** - Prefer simple solutions over clever ones
5. **Type Safety** - Never use `any` types (100% type-safe codebase)

### Code Style

- **Indentation:** Tabs (not spaces)
- **Line Length:** 100 characters max (soft limit)
- **Semicolons:** Required
- **Quotes:** Double quotes for strings (except for template literals)
- **Trailing Commas:** Use in multi-line objects/arrays

**Example:**
```typescript
const config = {
	name: "url-enricher",
	version: "1.0.0",
	author: "Your Name",
};
```

### File Organization

#### Directory Structure
```
src/
├── decorators/     # Editor decoration components
├── services/       # Business logic services
├── utils/          # Shared utilities
├── types/          # TypeScript type definitions
├── editor/         # CodeMirror integration
└── main.ts         # Plugin entry point
```

#### File Naming Conventions
- **PascalCase** for classes: `LinkPreviewService.ts`
- **camelCase** for utilities: `stringReplace.ts`
- **kebab-case** for config: `tsconfig.json`
- **Index files** for directory exports: `index.ts`

⚠️ **CRITICAL**: Never commit build artifacts (`main.js`, `node_modules/`, `dist/`). Only commit source files.

#### File Structure Template
```typescript
/**
 * Module description - What this file does
 *
 * More detailed explanation if needed.
 *
 * @module path/to/module
 */

// 1. External imports
import { Plugin } from "obsidian";

// 2. Internal imports (organized by directory)
import { LinkPreviewService } from "./services/linkPreviewService";
import { createLogger } from "./utils/logger";

// 3. Type definitions
export interface MyInterface {
	property: string;
}

// 4. Constants
const MAX_RETRIES = 3;

// 5. Implementation
export class MyClass {
	// ...
}

// 6. Helper functions (if any)
function helperFunction() {
	// ...
}
```

### Naming Conventions

#### Variables and Functions
- **camelCase** for variables and functions: `getUserData()`
- **SCREAMING_SNAKE_CASE** for constants: `MAX_CONCURRENT_REQUESTS`
- **Prefix booleans** with `is`, `has`, `should`: `isValid`, `hasError`, `shouldRetry`
- **Prefix private members** with underscore (optional): `_privateMethod()`

**Good:**
```typescript
const isLoading = true;
const maxRetries = 3;
const userSettings = loadUserSettings();

function fetchMetadata(url: string): Promise<Metadata> {
	// ...
}
```

**Bad:**
```typescript
const loading = true; // Unclear type
const max = 3; // What max?
const settings = loadUserSettings(); // What kind of settings?

function fetch(url: string): Promise<Metadata> { // Too generic
	// ...
}
```

#### Classes and Interfaces
- **PascalCase** for classes and interfaces
- **Prefix interfaces** with `I` only if needed to avoid naming conflicts
- **Suffix types** descriptively: `Handler`, `Service`, `Cache`, `Builder`

**Good:**
```typescript
class LinkPreviewService { }
interface MetadataHandler { }
type PreviewStyle = "inline" | "card";
```

#### Types
- **Use `type` for unions, intersections, and primitives**
- **Use `interface` for object shapes**
- **Prefer `readonly`** for immutable properties

```typescript
// Good
type PreviewMode = "inline" | "card" | "hidden";
interface LinkMetadata {
	readonly title: string;
	readonly description: string | null;
}

// Bad
interface PreviewMode { } // Should be type
type LinkMetadata = { title: string; description: string | null }; // Should be interface
```

## TypeScript Guidelines

### Type Safety Rules

1. **NEVER use `any`** - Use `unknown` and type guards instead
2. **Enable strict mode** - All strict TypeScript flags enabled
3. **Explicit return types** - Always specify return types for public methods
4. **Null safety** - Use `| null` instead of `| undefined` when possible

⚠️ **100% Type Safety**: This codebase has ZERO `any` types. All external data must use `unknown` with type guards. Build will fail with `any` types.

**Good:**
```typescript
function parseMetadata(value: unknown): LinkMetadata | null {
	if (!isValidMetadata(value)) {
		return null;
	}
	return value;
}

function isValidMetadata(value: unknown): value is LinkMetadata {
	return (
		typeof value === "object" &&
		value !== null &&
		"title" in value &&
		typeof value.title === "string"
	);
}
```

**Bad:**
```typescript
function parseMetadata(value: any): any { // Never use 'any'
	return value;
}
```

### Type Guards

Use type guards to narrow `unknown` types:

```typescript
function isString(value: unknown): value is string {
	return typeof value === "string";
}

function isValidUrl(value: unknown): value is URL {
	return value instanceof URL;
}

function isLinkMetadata(value: unknown): value is LinkMetadata {
	return (
		typeof value === "object" &&
		value !== null &&
		"title" in value &&
		"description" in value
	);
}
```

### Generics

Use generics for reusable, type-safe components:

```typescript
class LRUCache<K, V> {
	private cache = new Map<K, V>();

	get(key: K): V | undefined {
		return this.cache.get(key);
	}

	set(key: K, value: V): void {
		this.cache.set(key, value);
	}
}
```

### Error Handling

Always type errors properly:

```typescript
// Good
try {
	await fetchData();
} catch (error) {
	const errorMessage = error instanceof Error ? error.message : String(error);
	logger.error("Failed to fetch data", errorMessage);
}

// Bad
try {
	await fetchData();
} catch (error: any) { // Never use 'any'
	console.log(error.message); // Unsafe property access
}
```

## Testing

### Testing Requirements

- **All new features** must include tests
- **Bug fixes** should include regression tests
- **Maintain 100% pass rate** - All tests must pass before merging
- **Test edge cases** - Consider null, empty, invalid inputs

⚠️ **CRITICAL**: Both `npm run build` AND `npm test` must pass before committing. Pre-commit hooks check both automatically.

### Running Tests

```bash
npm test                  # Run all tests
npm run test:coverage     # Run with coverage report
npm test -- --watch       # Run in watch mode
```

### Test Organization

Tests should mirror the source structure:

```
tests/
├── decorators/
│   ├── DecorationBuilder.test.ts
│   └── UrlMatcher.test.ts
├── services/
│   ├── linkPreviewService.test.ts
│   └── HtmlParser.test.ts
└── utils/
    ├── LRUCache.test.ts
    └── text.test.ts
```

### Test Writing Guidelines

#### Test Structure
Use **Arrange-Act-Assert** pattern:

```typescript
describe("LinkPreviewService", () => {
	describe("getMetadata", () => {
		it("should return cached metadata if available", async () => {
			// Arrange
			const service = new LinkPreviewService(options, settings);
			const url = "https://example.com";
			const cachedMetadata = { title: "Example", description: null };
			service.cache.set(url, cachedMetadata);

			// Act
			const result = await service.getMetadata(url);

			// Assert
			expect(result).toEqual(cachedMetadata);
		});
	});
});
```

#### Test Naming
- **Describe blocks:** Component/function name
- **Test cases:** Should describe behavior in plain English

**Good:**
```typescript
describe("UrlMatcher", () => {
	it("should match wikilinks with display text", () => { });
	it("should ignore URLs inside code blocks", () => { });
	it("should return empty array for text without URLs", () => { });
});
```

**Bad:**
```typescript
describe("UrlMatcher", () => {
	it("test1", () => { }); // Non-descriptive
	it("wikilinks", () => { }); // Incomplete description
});
```

#### Mocking

Use minimal mocking - prefer real implementations when possible:

```typescript
// Good - Mock only external dependencies
const mockRequest = jest.fn().mockResolvedValue({
	status: 200,
	text: "<html>...</html>",
});

// Bad - Over-mocking
const mockEverything = {
	service: jest.fn(),
	cache: jest.fn(),
	parser: jest.fn(),
	// ... too much mocking
};
```

### Common Testing Pitfalls

⚠️ **Frontmatter must start on line 1**: When testing frontmatter features, ensure YAML frontmatter starts on the very first line of the test file. This is the #1 reason frontmatter tests fail.

```yaml
# ❌ WRONG - Will not work!
# My Note Title

---
preview-style: card
---

# ✅ CORRECT - Frontmatter first!
---
preview-style: card
---

# My Note Title
```

⚠️ **Clear caches when testing metadata changes**: The plugin caches metadata and favicons for 30 days. When testing metadata extraction or favicon handling, always clear caches first:

```javascript
// In browser console (Cmd+Option+I / Ctrl+Shift+I)
window.inlineLinkPreview.clearAllCaches()
window.inlineLinkPreview.refreshDecorations()
```

Otherwise, you won't see your changes!

## Git Workflow

### Branch Naming

- **Feature branches:** `feature/description` (e.g., `feature/add-twitter-handler`)
- **Bug fixes:** `fix/description` (e.g., `fix/cache-expiration-bug`)
- **Refactoring:** `refactor/description` (e.g., `refactor/split-large-files`)
- **Documentation:** `docs/description` (e.g., `docs/update-readme`)

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `test:` - Adding/updating tests
- `perf:` - Performance improvements
- `chore:` - Maintenance tasks

**Examples:**
```
feat(services): Add Twitter metadata handler

Implements domain-specific enrichment for Twitter/X URLs.
Extracts username and tweet ID from URLs.

Closes #123
```

```
fix(cache): Fix favicon cache expiration logic

The expiration check was using incorrect timestamp comparison.
Now correctly expires entries after 30 days.
```

```
refactor(decorators): Split urlPreviewDecorator into modules

- Extract PreviewWidget to separate file
- Extract UrlMatcher to separate file
- Extract DecorationBuilder to separate file

Reduces main file from 1224 to 120 lines.
```

### Commit Best Practices

1. **Atomic commits** - One logical change per commit
2. **Descriptive messages** - Explain why, not what (code shows what)
3. **Reference issues** - Use `Closes #123` or `Fixes #456`
4. **Keep commits clean** - Squash fixup commits before merging

## Version Management & Releases

### Bumping Versions

Use the automated version-bump script to update all version references:

```bash
npm run set-version 0.9.0
```

This will automatically update:
- `manifest.json` - Plugin version
- `package.json` & `package-lock.json` - npm version
- `versions.json` - Version-to-minAppVersion mapping
- `AGENTS.md` - Current version line
- `CHANGELOG.md` - Creates new unreleased section template

**Output:**
```
✓ Updated manifest.json
✓ Updated package.json
✓ Updated package-lock.json
✓ Updated versions.json
✓ Updated AGENTS.md
✓ Updated CHANGELOG.md (added unreleased section)

✅ Version bumped to 0.9.0

Next steps:
1. Fill in CHANGELOG.md with your changes
2. Commit: git add . && git commit -m "chore: Bump version to 0.9.0"
3. Tag: git tag 0.9.0
4. Push: git push origin master --tags
```

For detailed documentation, see [VERSION-MANAGEMENT.md](docs/developer/VERSION-MANAGEMENT.md).

⚠️ **IMPORTANT**: Fill in CHANGELOG.md immediately after bumping the version while changes are fresh in your mind!

### Release Process

1. **Complete your feature work** and ensure all tests pass
2. **Bump the version:**
   ```bash
   npm run set-version 1.0.0
   ```
3. **Fill in CHANGELOG.md** with your changes (Added/Changed/Fixed sections)
4. **Commit version bump:**
   ```bash
   git add .
   git commit -m "chore: Bump version to 1.0.0"
   ```
5. **Create and push tag:**
   ```bash
   git tag 1.0.0
   git push origin master --tags
   ```
6. **GitHub Actions will automatically:**
   - Run tests
   - Build the plugin
   - Create a GitHub release
   - Upload plugin files (main.js, manifest.json, styles.css)

### Semantic Versioning

Follow [semantic versioning](https://semver.org/):

- **MAJOR** (1.0.0) - Breaking changes that affect users
- **MINOR** (0.1.0) - New features (backward compatible)
- **PATCH** (0.0.1) - Bug fixes (backward compatible)

**Examples:**
- User-facing feature: `0.8.0 → 0.9.0` (MINOR)
- Bug fix: `0.8.0 → 0.8.1` (PATCH)
- Breaking change: `0.9.0 → 1.0.0` (MAJOR)
- Internal refactoring (no user impact): `0.7.0 → 0.8.0` (MINOR)

## Pull Request Process

### Before Submitting

1. **Run tests** - Ensure all tests pass
   ```bash
   npm test
   ```

2. **Run build** - Ensure code compiles without errors
   ```bash
   npm run build
   ```

3. **Update documentation** - Update README, ARCHITECTURE.md if needed

4. **Self-review** - Review your own changes first

### PR Template

When creating a pull request, include:

```markdown
## Description
Brief description of what this PR does.

## Motivation
Why is this change necessary? What problem does it solve?

## Changes
- List of specific changes made
- Be detailed and specific

## Testing
- How was this tested?
- What edge cases were considered?

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Tests added/updated and passing
- [ ] Build successful
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] Self-reviewed code
- [ ] Follows coding standards
```

### Review Process

- **Be respectful** - Constructive feedback only
- **Be specific** - Reference line numbers and explain suggestions
- **Be responsive** - Address review comments promptly
- **Be patient** - Reviews may take time

### After Approval

1. **Squash commits** if needed (maintainer will do this)
2. **Ensure CI passes** (if configured)
3. **Maintainer will merge** after approval

## Project Structure

### Adding New Features

#### 1. Determine Location
- **Decorations/UI:** `src/decorators/`
- **Business logic:** `src/services/`
- **Utilities:** `src/utils/`
- **Type definitions:** `src/types/`

#### 2. Create Files
```typescript
// src/services/MyNewService.ts
/**
 * MyNewService - Brief description
 *
 * Detailed explanation of what this service does.
 *
 * @module services/MyNewService
 */

import { createLogger } from "../utils/logger";

const logger = createLogger("MyNewService");

export class MyNewService {
	constructor(private options: MyServiceOptions) {
		logger.info("MyNewService initialized");
	}

	/**
	 * Public method description
	 * @param param - Parameter description
	 * @returns Return value description
	 */
	public async doSomething(param: string): Promise<Result> {
		// Implementation
	}

	/**
	 * Private method description
	 */
	private helperMethod(): void {
		// Implementation
	}
}
```

#### 3. Add Tests
```typescript
// tests/services/MyNewService.test.ts
import { MyNewService } from "../../src/services/MyNewService";

describe("MyNewService", () => {
	describe("doSomething", () => {
		it("should handle valid input", async () => {
			// Test implementation
		});

		it("should handle invalid input", async () => {
			// Test implementation
		});
	});
});
```

#### 4. Update Exports
```typescript
// src/services/index.ts
export { MyNewService } from "./MyNewService";
```

### Adding Constants

⚠️ **ALWAYS** add constants to `src/constants.ts`, never inline as magic numbers:

```typescript
// src/constants.ts
export const MY_NEW_CONSTANT = 42;
export const MY_CONFIG_SETTING = "default-value";
```

**Bad:**
```typescript
if (cache.size > 1000) { } // ❌ Magic number
```

**Good:**
```typescript
import { CACHE_MAX_SIZE } from "./constants";
if (cache.size > CACHE_MAX_SIZE) { } // ✅ Named constant
```

### Adding Utilities

Utilities should be pure functions when possible:

```typescript
// src/utils/myUtil.ts
/**
 * Utility description
 * @param input - Input description
 * @returns Output description
 */
export function myUtilFunction(input: string): string {
	return input.trim();
}
```

## Performance Considerations

### Guidelines

1. **Avoid unnecessary work** - Cache results, check if work needed first
2. **Limit concurrency** - Don't overwhelm with parallel requests
3. **Debounce expensive operations** - Especially user input handling
4. **Use LRU cache** - For bounded memory usage
5. **Measure before optimizing** - Use Timer and performance tracking

### Example: Caching

```typescript
class MyService {
	private cache = new LRUCache<string, Result>(1000);

	async getData(key: string): Promise<Result> {
		// Check cache first
		const cached = this.cache.get(key);
		if (cached) {
			return cached;
		}

		// Fetch and cache
		const result = await this.fetchData(key);
		this.cache.set(key, result);
		return result;
	}
}
```

### Example: Concurrency Limiting

```typescript
class MyService {
	private activeRequests = 0;
	private readonly MAX_CONCURRENT = 10;

	async fetchData(url: string): Promise<Data> {
		// Wait if too many concurrent requests
		while (this.activeRequests >= this.MAX_CONCURRENT) {
			await new Promise(resolve => setTimeout(resolve, 50));
		}

		this.activeRequests++;
		try {
			return await this.doFetch(url);
		} finally {
			this.activeRequests--;
		}
	}
}
```

### Example: Performance Tracking

```typescript
import { Timer } from "./utils/performance";

async function expensiveOperation(): Promise<void> {
	const timer = new Timer("expensiveOperation");

	// Do work
	await doWork();

	timer.end(); // Logs and records metrics
}
```

## Documentation

### JSDoc Requirements

All public methods must have JSDoc comments:

```typescript
/**
 * Fetch metadata for a URL
 *
 * This method checks the cache first, then fetches from the network if needed.
 * Results are cached for future requests.
 *
 * @param url - The URL to fetch metadata for
 * @returns Promise resolving to link metadata
 * @throws {Error} If the URL is invalid or fetch fails
 *
 * @example
 * ```typescript
 * const metadata = await service.getMetadata("https://example.com");
 * console.log(metadata.title);
 * ```
 */
async getMetadata(url: string): Promise<LinkMetadata> {
	// Implementation
}
```

### Inline Comments

Use inline comments for complex logic:

```typescript
// Check for "soft 404s" - pages that return 200 but show error content
if (this.validator.isSoft404(response.text, parsedMetadata, url)) {
	throw new Error("Soft 404");
}
```

### README Updates

Update README.md when adding:
- New features
- New configuration options
- Breaking changes
- Installation instructions

## Questions?

If you have questions:

1. **Check existing documentation** - README, ARCHITECTURE.md, this guide
2. **Search issues** - Someone may have asked before
3. **Open a discussion** - Use GitHub Discussions for questions
4. **Open an issue** - For bugs or feature requests

## Code of Conduct

- Be respectful and inclusive
- Assume good intentions
- Provide constructive feedback
- Focus on the code, not the person

Thank you for contributing!
