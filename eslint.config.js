import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

export default tseslint.config(
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
			"@typescript-eslint/no-unused-vars": ["error", { "args": "none", "caughtErrors": "none" }],
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-misused-promises": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-unnecessary-type-assertion": "off",

			// Base ESLint rules
			"no-prototype-builtins": "off",
			"no-undef": "off", // TypeScript handles this
			"no-useless-escape": "off",

			// Obsidian-specific rules
			"obsidianmd/no-sample-code": "off",
			"obsidianmd/no-static-styles-assignment": "error", // This is the important one!
			"obsidianmd/settings-tab/no-manual-html-headings": "off",
			"obsidianmd/ui/sentence-case": "off",

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
