import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: "http://127.0.0.1:5199",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
		{
			name: "iphone-13",
			use: { ...devices["iPhone 13"] },
		},
		{
			name: "iphone-17-pro-max",
			use: { ...devices["iPhone 17 Pro Max"] },
		},
	],
	webServer: {
		command:
			"npm run build && npm run preview -- --host 127.0.0.1 --port 5199 --strictPort",
		url: "http://127.0.0.1:5199",
		reuseExistingServer: false,
	},
});
