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
const AGENTS_FILE = "docs/developer/AGENTS.md";
const CHANGELOG_FILE = "CHANGELOG.md";

// Update manifest.json
const manifest = readJson(MANIFEST_FILE);
const minAppVersion = manifest.minAppVersion;
manifest.version = targetVersion;
writeJson(MANIFEST_FILE, manifest);
console.log(`✓ Updated ${MANIFEST_FILE}`);

// Update package.json
const packageJson = readJson(PACKAGE_FILE);
packageJson.version = targetVersion;
writeJson(PACKAGE_FILE, packageJson);
console.log(`✓ Updated ${PACKAGE_FILE}`);

// Update package-lock.json
const lock = readJson(LOCK_FILE);
lock.version = targetVersion;
if (lock.packages && lock.packages[""]) {
	lock.packages[""].version = targetVersion;
}
writeJson(LOCK_FILE, lock);
console.log(`✓ Updated ${LOCK_FILE}`);

// Update versions.json
const versions = readJson(VERSIONS_FILE);
versions[targetVersion] = minAppVersion;
writeJson(VERSIONS_FILE, versions);
console.log(`✓ Updated ${VERSIONS_FILE}`);

// Update AGENTS.md
try {
	let agentsContent = readFileSync(AGENTS_FILE, "utf8");
	const versionLineRegex = /^- Current version: \d+\.\d+\.\d+$/m;

	if (versionLineRegex.test(agentsContent)) {
		agentsContent = agentsContent.replace(
			versionLineRegex,
			`- Current version: ${targetVersion}`
		);
		writeFileSync(AGENTS_FILE, agentsContent);
		console.log(`✓ Updated ${AGENTS_FILE}`);
	} else {
		console.warn(`⚠ Could not find version line in ${AGENTS_FILE}`);
	}
} catch (error) {
	console.warn(`⚠ Could not update ${AGENTS_FILE}: ${error.message}`);
}

// Update CHANGELOG.md - Add new unreleased section at top
try {
	let changelogContent = readFileSync(CHANGELOG_FILE, "utf8");

	// Check if this version already exists in changelog
	const versionHeaderRegex = new RegExp(`^## \\[${escapeRegex(targetVersion)}\\]`, "m");

	if (!versionHeaderRegex.test(changelogContent)) {
		// Find the first ## header (should be after "# Changelog" and any preamble)
		const firstVersionMatch = changelogContent.match(/^## \[/m);

		if (firstVersionMatch) {
			const today = new Date().toISOString().split('T')[0];
			const newSection = `## [${targetVersion}] - ${today}

### Added
-

### Changed
-

### Fixed
-

`;
			// Insert new section before the first existing version
			const insertPosition = firstVersionMatch.index;
			changelogContent =
				changelogContent.slice(0, insertPosition) +
				newSection +
				changelogContent.slice(insertPosition);

			writeFileSync(CHANGELOG_FILE, changelogContent);
			console.log(`✓ Updated ${CHANGELOG_FILE} (added unreleased section)`);
		} else {
			console.warn(`⚠ Could not find version header in ${CHANGELOG_FILE}`);
		}
	} else {
		console.log(`ℹ Version ${targetVersion} already exists in ${CHANGELOG_FILE}`);
	}
} catch (error) {
	console.warn(`⚠ Could not update ${CHANGELOG_FILE}: ${error.message}`);
}

console.log(`\n✅ Version bumped to ${targetVersion}`);
console.log(`\nNext steps:`);
console.log(`1. Fill in CHANGELOG.md with your changes`);
console.log(`2. Commit: git add . && git commit -m "chore: Bump version to ${targetVersion}"`);
console.log(`3. Tag: git tag ${targetVersion}`);
console.log(`4. Push: git push origin master --tags`);

function readJson(filePath) {
	return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
	writeFileSync(filePath, `${JSON.stringify(data, null, "\t")}\n`);
}

function escapeRegex(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
