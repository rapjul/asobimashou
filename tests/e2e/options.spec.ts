import { test, expect } from "@playwright/test";

test.describe("Options Panel & Theme Configuration", () => {
	test("should toggle options panel and paginate between settings screens", async ({
		page,
	}) => {
		await page.goto("/");

		const optionBtn = page.locator("#option");
		await expect(optionBtn).toBeVisible();
		await optionBtn.click();

		const optionWrapper = page.locator("#option-wrapper");
		await expect(optionWrapper).toHaveClass(/collapsed/);

		const primaryPage = page.locator("#options-page-primary");
		const extraPage = page.locator("#options-page-extra");
		await expect(primaryPage).toBeVisible();
		await expect(extraPage).toBeVisible();

		// Paginate to extra options (scroll container)
		const moreBtn = page.locator("#options-btn-more");
		await moreBtn.click();

		// Verify back button is visible and click back
		const backBtn = page.locator("#options-btn-back");
		await expect(backBtn).toBeVisible();
		await backBtn.click();
	});

	test("should toggle dark and light themes and update DOM classes", async ({
		page,
	}) => {
		await page.goto("/");

		// Open options
		await page.locator("#option").click();
		await expect(page.locator("#option-wrapper")).toHaveClass(/collapsed/);

		// Click dark theme button
		const darkBtn = page.locator('.game-theme[value="dark"]');
		await darkBtn.click();

		const body = page.locator("body");
		await expect(body).toHaveClass(/bg-dark/);

		// Click light theme button
		const lightBtn = page.locator('.game-theme[value="light"]');
		await lightBtn.click();
		await expect(body).toHaveClass(/bg-light/);
	});
});
