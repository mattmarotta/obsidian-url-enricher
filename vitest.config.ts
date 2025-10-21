import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'happy-dom',
		setupFiles: ['./tests/setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			exclude: [
				'node_modules/**',
				'tests/**',
				'**/*.config.*',
				'**/types.ts',
				'main.js',
				'esbuild.config.mjs',
				'version-bump.mjs'
			],
			thresholds: {
				lines: 70,
				functions: 70,
				branches: 65,
				statements: 70
			}
		},
		alias: {
			obsidian: resolve(__dirname, './tests/mocks/obsidian.ts')
		}
	}
});
