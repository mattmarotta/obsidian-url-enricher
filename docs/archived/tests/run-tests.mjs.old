#!/usr/bin/env node

import { mkdirSync, rmSync } from "fs";
import { dirname, resolve } from "path";
import { pathToFileURL } from "url";
import esbuild from "esbuild";

const BUILD_DIR = resolve("tests/.tmp");
const ENTRY = resolve("tests/previewFormatter.spec.ts");
const OUT_FILE = resolve(BUILD_DIR, "previewFormatter.spec.cjs");
const OBSIDIAN_STUB = resolve("tests/stubs/obsidian.ts");

function ensureBuildDir() {
	mkdirSync(BUILD_DIR, { recursive: true });
}

async function bundleTests() {
	await esbuild.build({
		entryPoints: [ENTRY],
		bundle: true,
		platform: "node",
		format: "cjs",
		target: "node18",
		outfile: OUT_FILE,
		logLevel: "silent",
		plugins: [
			{
				name: "stub-obsidian",
				setup(build) {
					build.onResolve({ filter: /^obsidian$/ }, () => ({
						path: OBSIDIAN_STUB,
					}));
				},
			},
		],
	});
}

async function runBundle() {
	const moduleUrl = pathToFileURL(OUT_FILE).href;
	const imported = await import(moduleUrl);
	let run = imported?.default;
	if (run && typeof run === "object" && typeof run.default === "function") {
		run = run.default;
	}
	if (typeof run === "function") {
		await run();
	} else {
		throw new Error("Preview formatter tests did not export a callable default function.");
	}
}

function clean() {
	try {
		rmSync(BUILD_DIR, { recursive: true, force: true });
	} catch {
		// ignore
	}
}

async function main() {
	ensureBuildDir();
	await bundleTests();
	await runBundle();
}

main()
	.then(() => clean())
	.catch((error) => {
		console.error("Test run failed:", error);
		clean();
		process.exitCode = 1;
	});
