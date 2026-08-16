import obsidianmd from "eslint-plugin-obsidianmd";
import { defineConfig } from "eslint/config";

export default defineConfig([
	{
		ignores: [
			"main.js",
			"node_modules/**",
			"coverage/**",
			"version-bump.mjs",
			"esbuild.config.mjs",
			"vitest.config.ts",
			"tests/**",
		],
	},

	// Obsidian plugin recommended rules (spread at top level — do NOT nest
	// this inside a files-scoped block, it carries its own per-language
	// `files` entries, e.g. a json/json language block for package.json)
	...obsidianmd.configs.recommended,

	{
		files: ["**/*.ts"],
		languageOptions: {
			parserOptions: {
				projectService: true,
			},
		},
		rules: {
			// Preset default is "off"; Obsidian's plugin scanner enables it.
			"obsidianmd/prefer-active-doc": "warn",
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
		},
	},
]);
