import { test, expect } from "@playwright/test";

test.describe("Options Panel & Theme Configuration", () => {
	test("should toggle options panel and paginate between settings screens", async ({
		page,
	}) => {
		await page.goto("/");

		const optionBtn = page.locator("#option");
		await expect(optionBtn).toBeVisible();
		await expect(page.locator('.game-card[value="JLPT"]')).toHaveClass(
			/active/,
		);
		await expect(page.locator("#game-round-length")).toHaveValue("20");
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

	test("should restore legacy options and persist a selected round length", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem(
				"SETTINGS",
				JSON.stringify({
					type: "game-katakana",
					kanji: true,
					card: "JLPT",
					font: "Klee One",
				}),
			);
		});
		await page.goto("/");
		await expect(page.locator("#game-katakana")).toHaveClass(/active/);
		await expect(page.locator("#game-kanji")).toHaveClass(/active/);
		await expect(page.locator("#game-font")).toHaveValue("Klee One");
		await expect(page.locator('.game-card[value="JLPT"]')).toHaveClass(
			/active/,
		);

		await page.locator("#option").click();
		await page.locator("#game-hiragana").click();
		await page.locator("#game-kanji").click();
		await page.locator('.game-card[value="Random"]').click();
		await page.selectOption("#game-font", "Noto Serif JP");
		await expect
			.poll(() =>
				page.evaluate(() => {
					const settings = JSON.parse(
						localStorage.getItem("SETTINGS") || "{}",
					);
					return [
						settings.kana,
						settings.showKanji,
						settings.card,
						settings.font,
					];
				}),
			)
			.toEqual(["Hiragana", false, "Random", "Noto Serif JP"]);
		await page.locator("#game-katakana").click();
		await page.locator("#options-btn-more").click();
		const filterOptions: Array<[string, string]> = [
			["game-dakuten", "dakuten"],
			["game-tsu", "doubledConsonants"],
			["game-combo", "comboKana"],
			["game-smallvowel", "smallVowels"],
			["game-vowellength", "vowelLength"],
		];
		for (const [id, key] of filterOptions) {
			await page.locator(`#${id}`).click();
			await expect
				.poll(() =>
					page.evaluate((settingKey) => {
						const settings = JSON.parse(
							localStorage.getItem("SETTINGS") || "{}",
						);
						return settings[settingKey];
					}, key),
				)
				.toBe(false);
		}

		const roundLength = page.locator("#game-round-length");
		await expect(roundLength).toHaveValue("20");
		await expect(roundLength.locator("option")).toHaveCount(8);
		for (const value of ["10", "20", "50", "100", "150", "200", "250"]) {
			await roundLength.selectOption(value);
			await expect
				.poll(() =>
					page.evaluate(
						() =>
							JSON.parse(localStorage.getItem("SETTINGS") || "{}")
								.roundLength,
					),
				)
				.toBe(Number(value));
		}
		await roundLength.selectOption("unlimited");
		expect(
			await page.evaluate(
				() =>
					JSON.parse(localStorage.getItem("SETTINGS") || "{}")
						.roundLength,
			),
		).toBeNull();
	});

	test("should fit the round length setting on a narrow screen", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto("/");
		await page.locator("#option").click();
		await expect(page.locator("#option-wrapper")).toHaveClass(/collapsed/);
		await expect(page.locator("#game-round-length")).toBeVisible();
		await page.locator("#game-round-length").selectOption("250");
	});

	test("should allow zoom and keep options and game controls reachable", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto("/");
		const viewport = await page
			.locator('meta[name="viewport"]')
			.getAttribute("content");
		expect(viewport).not.toMatch(/maximum-scale\s*=\s*1(?:\D|$)/i);
		expect(viewport).not.toMatch(
			/user-scalable\s*=\s*0|user-scalable\s*=\s*no/i,
		);

		await page.addStyleTag({
			content: "html { font-size: 200% !important; }",
		});
		await page.locator("#option").click();
		await page.locator("#game-round-length").scrollIntoViewIfNeeded();
		await expect(page.locator("#game-round-length")).toBeVisible();
		await page.locator("#start").scrollIntoViewIfNeeded();
		await page.locator("#start").click();
		const answerFontSize = await page
			.locator("#answer")
			.evaluate((input) =>
				Number.parseFloat(getComputedStyle(input).fontSize),
			);
		expect(answerFontSize).toBeGreaterThanOrEqual(16);
		await page.locator("#skip").scrollIntoViewIfNeeded();
		await expect(page.locator("#skip")).toBeVisible();
		await page.locator("#stop").click();
		await page.locator("#restart").scrollIntoViewIfNeeded();
		await expect(page.locator("#restart")).toBeVisible();
	});

	test("should follow system theme changes only in system mode", async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme: "light" });
		await page.goto("/");
		await page.emulateMedia({ colorScheme: "dark" });
		await expect(page.locator("body")).toHaveClass(/bg-dark/);
		await page.locator("#option").click();
		await page.locator('.game-theme[value="light"]').click();
		await page.emulateMedia({ colorScheme: "light" });
		await expect(page.locator("body")).toHaveClass(/bg-light/);
	});
});
