#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";

const [, , cliVersion] = process.argv;
const targetVersion = cliVersion ?? process.env.npm_package_version;

if (!targetVersion) {
	console.error("Usage: node version-bump.mjs <version>");
	process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(targetVersion)) {
	console.error(`Invalid semantic version: ${targetVersion}`);
	process.exit(1);
}

const PACKAGE_FILE = "package.json";
const MANIFEST_FILE = "manifest.json";
const VERSIONS_FILE = "versions.json";
const LOCK_FILE = "package-lock.json";
const AGENTS_FILE_PATHS = ["AGENTS.md", "docs/developer/AGENTS.md", "docs/AGENTS.md"];
const CHANGELOG_FILE = "CHANGELOG.md";

// Track which files were updated
const updatedFiles = [];
const failedFiles = [];
const skippedFiles = [];

// Update manifest.json (required)
let minAppVersion;
try {
	const manifest = readJson(MANIFEST_FILE);
	if (!manifest.minAppVersion) {
		console.error(`✗ ${MANIFEST_FILE} is missing 'minAppVersion' field`);
		console.error("This field is required for Obsidian plugin compatibility. Aborting.");
		process.exit(1);
	}
	minAppVersion = manifest.minAppVersion;
	manifest.version = targetVersion;
	writeJson(MANIFEST_FILE, manifest);
	console.log(`✓ Updated ${MANIFEST_FILE}`);
	updatedFiles.push(MANIFEST_FILE);
} catch (error) {
	console.error(`✗ Failed to update ${MANIFEST_FILE}: ${error.message}`);
	console.error("This file is required for the plugin to work. Aborting.");
	failedFiles.push(MANIFEST_FILE);
	process.exit(1);
}

// Update package.json (required)
try {
	const packageJson = readJson(PACKAGE_FILE);
	packageJson.version = targetVersion;
	writeJson(PACKAGE_FILE, packageJson);
	console.log(`✓ Updated ${PACKAGE_FILE}`);
	updatedFiles.push(PACKAGE_FILE);
} catch (error) {
	console.error(`✗ Failed to update ${PACKAGE_FILE}: ${error.message}`);
	console.error("This file is required for npm packages. Aborting.");
	failedFiles.push(PACKAGE_FILE);
	process.exit(1);
}

// Update package-lock.json (optional but recommended)
try {
	const lock = readJson(LOCK_FILE);
	lock.version = targetVersion;
	if (lock.packages && lock.packages[""]) {
		lock.packages[""].version = targetVersion;
	}
	writeJson(LOCK_FILE, lock);
	console.log(`✓ Updated ${LOCK_FILE}`);
	updatedFiles.push(LOCK_FILE);
} catch (error) {
	console.warn(`⚠ Could not update ${LOCK_FILE}: ${error.message}`);
	console.warn("This is optional but recommended. Run 'npm install' to regenerate it.");
	skippedFiles.push(`${LOCK_FILE} (${error.message})`);
}

// Update versions.json (required)
try {
	const versions = readJson(VERSIONS_FILE);
	versions[targetVersion] = minAppVersion;
	writeJson(VERSIONS_FILE, versions);
	console.log(`✓ Updated ${VERSIONS_FILE}`);
	updatedFiles.push(VERSIONS_FILE);
} catch (error) {
	console.error(`✗ Failed to update ${VERSIONS_FILE}: ${error.message}`);
	console.error("This file is required for Obsidian plugin compatibility. Aborting.");
	failedFiles.push(VERSIONS_FILE);
	process.exit(1);
}

// Update AGENTS.md (check multiple possible locations, optional)
let agentsFileFound = false;
for (const agentsPath of AGENTS_FILE_PATHS) {
	try {
		let agentsContent = readFileSync(agentsPath, "utf8");
		const versionLineRegex = /^- \*\*Current version\*\*: \d+\.\d+\.\d+$/m;

		if (versionLineRegex.test(agentsContent)) {
			agentsContent = agentsContent.replace(
				versionLineRegex,
				`- **Current version**: ${targetVersion}`
			);
			writeFileSync(agentsPath, agentsContent);
			console.log(`✓ Updated ${agentsPath}`);
			updatedFiles.push(agentsPath);
			agentsFileFound = true;
			break;
		} else {
			console.warn(`⚠ Could not find version line in ${agentsPath}`);
			skippedFiles.push(`${agentsPath} (version line not found)`);
			agentsFileFound = true;
			break;
		}
	} catch (error) {
		// File doesn't exist at this path, try next one
		continue;
	}
}

if (!agentsFileFound) {
	console.warn(`⚠ Could not find AGENTS.md in any expected location: ${AGENTS_FILE_PATHS.join(", ")}`);
	skippedFiles.push("AGENTS.md (file not found)");
}

// Update CHANGELOG.md - Promote Unreleased section (if present) and add new version section (optional)
try {
	let changelogContent = readFileSync(CHANGELOG_FILE, "utf8");

	// Check if this version already exists in changelog
	const versionHeaderRegex = new RegExp(`^## \\[${escapeRegex(targetVersion)}\\]`, "m");

	if (!versionHeaderRegex.test(changelogContent)) {
		// Find the first ## header (should be after "# Changelog" and any preamble)
		const firstVersionMatch = changelogContent.match(/^## \[/m);

		if (firstVersionMatch) {
			const today = new Date().toISOString().split("T")[0];
			const emptySection = `### Added
-

### Changed
-

### Fixed
-

`;

			const unreleasedRegex = /^## \[Unreleased\]\s*\n([\s\S]*?)(?=^## \[|\Z)/m;
			const unreleasedMatch = changelogContent.match(unreleasedRegex);

			let newSectionBody = emptySection;
			let insertPosition = firstVersionMatch.index;

			if (unreleasedMatch) {
				const [unreleasedBlock, unreleasedBodyRaw] = unreleasedMatch;
				const unreleasedContent = unreleasedBodyRaw.trim();

				if (unreleasedContent.length > 0) {
					newSectionBody = `${unreleasedContent}\n\n`;
				}

				const placeholder = `## [Unreleased]\n\n${emptySection}`;
				const startIndex = unreleasedMatch.index;
				const endIndex = startIndex + unreleasedBlock.length;

				changelogContent =
					changelogContent.slice(0, startIndex) +
					placeholder +
					changelogContent.slice(endIndex);

				insertPosition = startIndex + placeholder.length;
			}

			const newSection = `## [${targetVersion}] - ${today}\n\n${newSectionBody}`;

			changelogContent =
				changelogContent.slice(0, insertPosition) +
				newSection +
				changelogContent.slice(insertPosition);

			writeFileSync(CHANGELOG_FILE, changelogContent);
			console.log(`✓ Updated ${CHANGELOG_FILE} (promoted Unreleased entries)`);
			updatedFiles.push(CHANGELOG_FILE);
		} else {
			console.warn(`⚠ Could not find version header in ${CHANGELOG_FILE}`);
			console.warn("CHANGELOG.md exists but doesn't have the expected format.");
			skippedFiles.push(`${CHANGELOG_FILE} (invalid format)`);
		}
	} else {
		console.log(`ℹ Version ${targetVersion} already exists in ${CHANGELOG_FILE}`);
		updatedFiles.push(CHANGELOG_FILE);
	}
} catch (error) {
	console.warn(`⚠ Could not update ${CHANGELOG_FILE}: ${error.message}`);
	console.warn("This is optional but recommended. You may need to update it manually.");
	skippedFiles.push(`${CHANGELOG_FILE} (${error.message})`);
}

// Print summary
console.log(`\n✅ Version bumped to ${targetVersion}`);
console.log(`\n📊 Summary:`);
console.log(`  ✓ Successfully updated: ${updatedFiles.length} file(s)`);
if (updatedFiles.length > 0) {
	updatedFiles.forEach(file => console.log(`    - ${file}`));
}
if (skippedFiles.length > 0) {
	console.log(`  ⚠ Skipped: ${skippedFiles.length} file(s)`);
	skippedFiles.forEach(file => console.log(`    - ${file}`));
}
if (failedFiles.length > 0) {
	console.log(`  ✗ Failed: ${failedFiles.length} file(s)`);
	failedFiles.forEach(file => console.log(`    - ${file}`));
}

console.log(`\nNext steps:`);
console.log(`1. Fill in CHANGELOG.md with your changes`);
console.log(`2. Branch:  git checkout -b chore/bump-${targetVersion}`);
console.log(`3. Commit:  git add . && git commit -m "chore: Bump version to ${targetVersion}"`);
console.log(`4. Push:    git push -u origin chore/bump-${targetVersion}`);
console.log(`5. Open a PR into master and merge it (use a merge commit, not squash)`);
console.log(`6. Tag AFTER the merge lands, from an up-to-date master:`);
console.log(`     git checkout master && git pull`);
console.log(`     git tag ${targetVersion} && git push origin ${targetVersion}`);
console.log(`\n⚠ Do not tag before the bump is on master. Tags push independently of`);
console.log(`  branches, so a rejected branch push still publishes the tag - which`);
console.log(`  releases assets that Obsidian cannot see, because it reads`);
console.log(`  manifest.json from the default branch.`);

function readJson(filePath) {
	return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
	writeFileSync(filePath, `${JSON.stringify(data, null, "\t")}\n`);
}

function escapeRegex(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
