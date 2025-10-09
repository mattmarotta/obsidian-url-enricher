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

const manifest = readJson(MANIFEST_FILE);
const minAppVersion = manifest.minAppVersion;
manifest.version = targetVersion;
writeJson(MANIFEST_FILE, manifest);

const packageJson = readJson(PACKAGE_FILE);
packageJson.version = targetVersion;
writeJson(PACKAGE_FILE, packageJson);

const lock = readJson(LOCK_FILE);
lock.version = targetVersion;
if (lock.packages && lock.packages[""]) {
	lock.packages[""].version = targetVersion;
}
writeJson(LOCK_FILE, lock);

const versions = readJson(VERSIONS_FILE);
versions[targetVersion] = minAppVersion;
writeJson(VERSIONS_FILE, versions);

console.log(`Version bumped to ${targetVersion}`);

function readJson(filePath) {
	return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
	writeFileSync(filePath, `${JSON.stringify(data, null, "\t")}\n`);
}
