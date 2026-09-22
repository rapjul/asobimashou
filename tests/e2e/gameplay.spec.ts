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
		await page.evaluate(() => {
			let call = 0;
			Math.random = () => {
				call += 1;
				if (call === 1) return 0.002;
				if (call === 2) return 0.999;
				return 0.5;
			};
		});

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

		// Answer the selected alternate reading, then skip the next question.
		await expect(question).toContainText("のち");
		await answerInput.fill("nochi");
		await answerInput.dispatchEvent("keyup", { key: "i" });

		// Verify one answer is recorded before skipping the next card.
		const score = page.locator("#score");
		await expect(score).toContainText("1/1");
		await page.locator("#skip").click();
		await expect(score).toContainText("1/2");

		// End game session
		await page.locator("#stop").click();

		// Result screen should be visible
		const resultSection = page.locator("#result");
		await expect(resultSection).toBeVisible();

		// Verify review table has at least 1 entry
		const rows = page.locator("#review-table tr");
		await expect(rows).toHaveCount(2);
		await expect(rows.nth(0).locator("td").first()).toHaveText("nochi");

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
			expect(csvContent).toContain("# Total Cards,2");
			expect(csvContent).toContain("# Answered,1");
			expect(csvContent).toContain("# Skipped,1");
			expect(csvContent).toContain(
				"Status,Kanji,Kana,Romaji,Your Answer,Meaning",
			);
			expect(csvContent).toContain("Correct,");
			expect(csvContent).toContain("Skipped,");
		}

		// Return to home
		await page.locator("#restart").click();
		await expect(startBtn).toBeVisible();
	});

	test("should return Home when result transitions are disabled", async ({
		page,
	}) => {
		await page.goto("/");
		await page.locator("#start").click();
		await page.locator("#stop").click();
		await page.addStyleTag({
			content: "#result { transition: none !important; }",
		});
		await page.locator("#restart").click();
		await expect(page.locator("#start")).toBeEnabled();
	});

	test("should apply the mobile keyboard layout while answering", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		await page.locator("#start").click();
		await expect(page.locator("#answer")).toBeFocused();
		await expect(page.locator("body")).toHaveClass(/keyboard-open/);
	});

	test("should accept a missing apostrophe and display the Romaji hint", async ({
		page,
	}) => {
		await page.goto("/");
		await page.evaluate(() => {
			let call = 0;
			Math.random = () => {
				call += 1;
				return call === 1 ? 0.524 : 0.5;
			};
		});
		await page.locator("#start").click();
		await expect(page.locator("#question")).toContainText("てんいん");
		await page.locator("#answer").fill("tenin");
		await page.locator("#answer").dispatchEvent("keyup", { key: "n" });
		await expect(page.locator("#score")).toContainText("1/1");
		await expect(page.locator(".toast-apostrophe")).toContainText("ten'in");
	});
});

test.describe("Startup recovery without a service worker", () => {
	test.use({ serviceWorkers: "block" });

	test("should recover from a failed deck load and accept another start attempt", async ({
		page,
	}) => {
		await page.route("**/assets/jlpt-*.js", (route) => route.abort());
		await page.goto("/");
		await page.locator("#start").click();
		await expect(page.locator("#toast-container")).toContainText(
			"Unable to load vocabulary",
		);
		await expect(page.locator("#start")).toBeEnabled();
	});
});
