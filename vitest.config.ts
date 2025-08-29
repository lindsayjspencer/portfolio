import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	test: {
		setupFiles: ['dotenv/config'],
		testTimeout: 60_000,
	},
	plugins: [tsconfigPaths()],
});
