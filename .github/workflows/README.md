# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Inline Link Preview plugin.

## Workflows

### Test Workflow (`test.yml`)

**Triggers:** Push and pull requests to `master` and `develop` branches

**Purpose:** Ensure code quality through automated testing

**Jobs:**
1. **Test** - Runs unit tests with coverage reporting
   - Runs on Node.js 20.x
   - Executes all tests via `npm test`
   - Generates coverage report
   - Uploads coverage to Codecov (optional)

2. **Lint** - Validates code style
   - Runs linter if available
   - Continues on error (informational only)

### Build Workflow (`build.yml`)

**Triggers:** Push and pull requests to `master` and `develop` branches

**Purpose:** Verify the plugin builds successfully

**Jobs:**
1. **Build** - Compiles the plugin
   - Runs on Node.js 20.x
   - Installs dependencies
   - Builds plugin via `npm run build`
   - Checks for TypeScript errors
   - Uploads build artifacts (main.js, manifest.json, styles.css)
   - Artifacts retained for 7 days

### Release Workflow (`release.yml`)

**Triggers:** Push of version tags (e.g., `v1.0.0`, `1.0.0`)

**Purpose:** Automate the release process

**Jobs:**
1. **Release** - Creates a GitHub release with plugin files
   - Runs tests to ensure quality
   - Builds plugin
   - Extracts version from git tag
   - Generates changelog from commit messages
   - Creates release archive (ZIP)
   - Creates GitHub release with:
     - Changelog
     - Installation instructions
     - Release assets (ZIP, main.js, manifest.json, styles.css)

## Using the Workflows

### Testing Pull Requests

When you create a pull request, the **Test** and **Build** workflows automatically run:

```bash
git checkout -b feature/my-feature
# Make changes
git add .
git commit -m "feat: Add new feature"
git push origin feature/my-feature
# Create PR on GitHub - workflows run automatically
```

### Creating a Release

To create a new release:

1. **Update version** using the version bump script:
   ```bash
   npm run set-version 1.2.3
   ```

2. **Commit the version changes:**
   ```bash
   git add .
   git commit -m "chore: Bump version to 1.2.3"
   ```

3. **Create and push a tag:**
   ```bash
   git tag 1.2.3
   git push origin master --tags
   ```

4. **Release workflow runs automatically:**
   - Runs tests
   - Builds plugin
   - Creates GitHub release
   - Uploads plugin files

5. **GitHub release will be created** at:
   ```
   https://github.com/your-username/obsidian-inline-link-preview/releases
   ```

### Monitoring Workflows

View workflow runs at:
```
https://github.com/your-username/obsidian-inline-link-preview/actions
```

## Workflow Status Badges

Add these badges to your README.md:

```markdown
![Test](https://github.com/your-username/obsidian-inline-link-preview/actions/workflows/test.yml/badge.svg)
![Build](https://github.com/your-username/obsidian-inline-link-preview/actions/workflows/build.yml/badge.svg)
```

## Secrets Configuration

Some workflows use GitHub secrets:

### Optional Secrets

- `CODECOV_TOKEN` - For uploading test coverage to Codecov
  - Not required - workflow continues if missing
  - Get token from https://codecov.io/

### Built-in Secrets

- `GITHUB_TOKEN` - Automatically provided by GitHub Actions
  - Used for creating releases
  - No configuration needed

## Troubleshooting

### Workflow Fails on Release

If the release workflow fails, check:

1. **Tag format** - Should be numeric version (e.g., `1.0.0` or `v1.0.0`)
2. **Tests passing** - All tests must pass before release
3. **Build successful** - Plugin must build without errors
4. **Permissions** - Repository must allow GitHub Actions to create releases

### Workflow Doesn't Trigger

If workflows don't run:

1. **Check workflow file syntax** - YAML syntax errors prevent running
2. **Check branch names** - Workflows only run on `master` and `develop`
3. **Check repository settings** - GitHub Actions must be enabled

### Coverage Upload Fails

Coverage upload to Codecov is optional and can fail without breaking the workflow:

1. **Missing CODECOV_TOKEN** - Add token to repository secrets
2. **Network issues** - Transient failures, retry usually works
3. **Codecov service down** - Wait and retry

## Customization

### Changing Node.js Version

Edit the `node-version` in each workflow:

```yaml
strategy:
  matrix:
    node-version: [20.x]  # Change to [18.x, 20.x] for multiple versions
```

### Changing Trigger Branches

Edit the `on` section:

```yaml
on:
  push:
    branches: [ master, develop, feature/* ]  # Add more branches
```

### Adding Additional Checks

Add steps to the test workflow:

```yaml
- name: Run linter
  run: npm run lint

- name: Check formatting
  run: npm run format:check
```

## Local Testing

Test workflows locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run test workflow
act -j test

# Run build workflow
act -j build
```

## Best Practices

1. **Always run tests locally** before pushing
2. **Keep workflows fast** - Developers wait for CI
3. **Fail fast** - Run quick checks before slow ones
4. **Use caching** - npm dependencies cached automatically
5. **Monitor workflow runs** - Fix failures promptly
6. **Update actions regularly** - Keep action versions current

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
