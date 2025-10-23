# Git Hooks

This directory contains Git hooks managed for code quality enforcement.

## Setup

To enable Git hooks, run:

```bash
git config core.hooksPath .husky
```

To disable Git hooks temporarily:

```bash
# Skip hooks for a single commit
HUSKY=0 git commit -m "message"

# Or use the --no-verify flag
git commit --no-verify -m "message"
```

## Hooks

### pre-commit

Runs before each commit to ensure code quality:

1. **TypeScript Type Checking** - Ensures no type errors
2. **Tests** - Runs all unit tests

If any check fails, the commit will be aborted.

## Manual Installation

If you need to install husky as a dependency:

```bash
npm install --save-dev husky
npx husky install
git config core.hooksPath .husky
```

## Bypassing Hooks

While hooks help maintain code quality, you can bypass them if needed:

```bash
# For emergencies only
git commit --no-verify -m "emergency fix"
```

**Note:** Bypassing hooks should be rare and only for urgent situations. The CI/CD pipeline will still run these checks on pull requests.
