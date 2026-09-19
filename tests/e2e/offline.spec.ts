import { test, expect } from "@playwright/test";

test.describe("PWA Offline Support & Network State Transitions", () => {
	test("should display offline badge and offline toast notification on network disconnection", async ({
		page,
		context,
	}) => {
		await page.goto("/");
		await expect(page.locator("#start")).toBeEnabled();

		// Verify offline badge is initially hidden
		const badge = page.locator("#offline-badge");
		await expect(badge).toHaveClass(/d-none/);

		// Simulate going offline
		await context.setOffline(true);

		// Expect offline badge to appear
		await expect(badge).toBeVisible();
		await expect(badge).toHaveClass(/show/);

		// Expect offline toast notification
		const offlineToast = page.locator(".custom-toast.toast-offline");
		await expect(offlineToast).toBeVisible();
		await expect(offlineToast).toContainText("Offline");

		// Simulate reconnecting online
		await context.setOffline(false);

		// Expect online toast notification
		const onlineToast = page.locator(".custom-toast.toast-online");
		await expect(onlineToast).toBeVisible();
		await expect(onlineToast).toContainText("Back online");

		// Expect offline badge to be hidden again
		await expect(badge).not.toHaveClass(/show/);
	});

	test("should show offline font fallback toast when selecting non-cached font offline", async ({
		page,
		context,
	}) => {
		await page.goto("/");
		await expect(page.locator("#start")).toBeEnabled();

		// Open options panel
		await page.click("#option");
		await expect(page.locator("#option-wrapper")).toHaveClass(/collapsed/);

		// Disconnect network
		await context.setOffline(true);

		// Change font to a Japanese web font
		await page.selectOption("#game-font", "Klee One");

		// Assert font fallback toast is displayed
		const fontToast = page.locator(".custom-toast.toast-font-fallback");
		await expect(fontToast).toBeVisible();
		await expect(fontToast).toContainText(
			"Offline: Klee One is not cached",
		);
	});
});
