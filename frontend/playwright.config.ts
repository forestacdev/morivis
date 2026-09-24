import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}/morivis/`;

export default defineConfig({
	forbidOnly: !!process.env.CI,
	workers: process.env.CI ? 1 : undefined,
	use: {
		baseURL,
		browserName: 'chromium',
		channel: process.env.PLAYWRIGHT_CHANNEL,
		trace: 'retain-on-failure'
	},
	webServer: {
		command: `pnpm run preview --host 127.0.0.1 --port ${port} --strictPort`,
		url: baseURL,
		reuseExistingServer: false
	},

	testDir: 'e2e'
});
