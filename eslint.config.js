import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import { defineConfig } from "eslint/config";

export default defineConfig(
	// Base ESLint recommended rules
	eslint.configs.recommended,

	// TypeScript ESLint recommended rules (not strict)
	...tseslint.configs.recommended,

	// Obsidian plugin recommended rules
	...obsidianmd.configs.recommended,

	// Your custom configuration
	{
		plugins: {
			obsidianmd,
			"@eslint-community/eslint-comments": eslintComments,
		},
		languageOptions: {
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: import.meta.dirname,
			},
			globals: {
				// Browser globals for Obsidian plugins
				document: "readonly",
				window: "readonly",
				setTimeout: "readonly",
				clearTimeout: "readonly",
			},
		},
		rules: {
			// TypeScript rules
			"@typescript-eslint/no-unused-vars": ["error"],
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-unnecessary-type-assertion": "error",
			"@typescript-eslint/require-await": "error",
			"@typescript-eslint/no-deprecated": "error",

			// ESLint comments rules
			"@eslint-community/eslint-comments/require-description": "error",

			// Base ESLint rules
			"no-prototype-builtins": "off",
			"no-undef": "off", // TypeScript handles this
			"no-useless-escape": "error",

			// Obsidian-specific rules
			"obsidianmd/no-sample-code": "off",
			"obsidianmd/no-static-styles-assignment": "error", // This is the important one!
			"obsidianmd/settings-tab/no-manual-html-headings": "error",
			"obsidianmd/ui/sentence-case": "error",

			// Import rules - dev dependencies are fine
			"import/no-extraneous-dependencies": "off",
			"import/no-nodejs-modules": "off",
		},
	},

	// Ignore patterns
	{
		ignores: [
			"main.js",
			"*.test.ts",
			"tests/**/*",
			"node_modules/**",
			"*.config.js",
			"*.config.mjs",
			"*.config.ts",
			"version-bump.mjs",
			"esbuild.config.mjs",
		],
	}
);
