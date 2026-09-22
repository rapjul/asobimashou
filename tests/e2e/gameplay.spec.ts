import { test, expect } from "@playwright/test";
import * as fs from "node:fs";

test.describe("Gameplay Loop & Automated CSV Download Verification", () => {
	test("should stop at the selected round length and keep unlimited rounds open", async ({
		page,
	}) => {
		await page.goto("/");
		await page.locator("#game-round-length").selectOption("10");
		await page.locator("#start").click();
		for (let card = 0; card < 10; card++) {
			await page.locator("#skip").click();
		}
		await expect(page.locator("#result")).toBeVisible();
		await expect(page.locator("#stats-skipped")).toHaveText("10");

		await page.locator("#restart").click();
		await expect(page.locator("#start")).toBeEnabled();
		await page.locator("#game-round-length").selectOption("unlimited");
		await page.locator("#start").click();
		for (let card = 0; card < 10; card++) {
			await page.locator("#skip").click();
		}
		await expect(page.locator("#game")).toBeVisible();
		await expect(page.locator("#result")).toHaveClass(/d-none/);
		await page.locator("#stop").click();
		await expect(page.locator("#stats-skipped")).toHaveText("10");
	});

	test("should start game, answer cards, skip card, end game, and download valid CSV", async ({
		page,
	}) => {
		await page.goto("/");

		// Verify home screen is visible
		const startBtn = page.locator("#start");
		await expect(startBtn).toBeVisible();

		// Start practice session
		await startBtn.click();

		// Verify game screen appears and question element has content
		const question = page.locator("#question");
		await expect(question).toBeVisible();
		await expect(question).not.toBeEmpty();

		const answerInput = page.locator("#answer");
		await expect(answerInput).toBeFocused();

		// Skip the first question
		await page.locator("#skip").click();

		// Verify score shows 0/1
		const score = page.locator("#score");
		await expect(score).toContainText("0/1");

		// End game session
		await page.locator("#stop").click();

		// Result screen should be visible
		const resultSection = page.locator("#result");
		await expect(resultSection).toBeVisible();

		// Verify review table has at least 1 entry
		const rows = page.locator("#review-table tr");
		await expect(rows).toHaveCount(1);

		// Test automated CSV download
		const downloadPromise = page.waitForEvent("download");
		await page.locator("#export-csv").click();
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toMatch(
			/^asobimashou-results-\d+\.csv$/,
		);

		const filePath = await download.path();
		expect(filePath).not.toBeNull();

		if (filePath) {
			const csvContent = fs.readFileSync(filePath, "utf-8");
			expect(csvContent).toContain(
				"# Asobimashou Practice Session Results",
			);
			expect(csvContent).toContain("# Total Cards,1");
			expect(csvContent).toContain("# Answered,0");
			expect(csvContent).toContain("# Skipped,1");
			expect(csvContent).toContain(
				"Status,Kanji,Kana,Romaji,Your Answer,Meaning",
			);
			expect(csvContent).toContain("Skipped,");
		}

		// Return to home
		await page.locator("#restart").click();
		await expect(startBtn).toBeVisible();
	});
});
