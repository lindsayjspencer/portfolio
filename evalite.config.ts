import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'evalite/config';

export default defineConfig({
	testTimeout: 120_000,
	maxConcurrency: 2,
	cache: true,
	server: {
		port: 3006,
	},
	setupFiles: ['evalite/env-setup-file'],
	forceRerunTriggers: ['src/**/*.ts', 'evals/**/*.ts', 'evalite.config.ts'],
	viteConfig: {
		plugins: [tsconfigPaths()],
	},
});
