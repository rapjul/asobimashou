import { test, expect } from "@playwright/test";
import * as fs from "node:fs";

/**
 * Counts CSV fields while respecting quoted commas.
 *
 * @param {string} record - One single-line CSV record.
 * @returns {number} Number of comma-separated fields.
 */
function countCSVColumns(record: string): number {
	let columns = 1;
	let inQuotes = false;
	for (let index = 0; index < record.length; index++) {
		const character = record[index];
		if (character === '"') {
			if (inQuotes && record[index + 1] === '"') {
				index++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (character === "," && !inQuotes) {
			columns++;
		}
	}
	return columns;
}

test.describe("Gameplay Loop & Automated CSV Download Verification", () => {
	test("should stop at the selected round length and keep unlimited rounds open", async ({
		page,
	}) => {
		await page.goto("/");
		await page.locator("#game-round-length").selectOption("10");
		await page.locator("#start").click();
		await expect(page.locator("#game")).not.toHaveClass(/d-none/);
		await expect(page.locator("#answer")).toBeFocused();

		const firstKana = await page
			.locator("#question")
			.evaluate((element) => element.firstChild?.textContent ?? "");
		await page.locator("#answer").fill(firstKana);
		await page.locator("#answer").dispatchEvent("keyup", { key: "a" });
		await expect(page.locator("#score")).toContainText("1/1");

		await page.locator("#skip").click();
		await expect(page.locator("#score")).toContainText("1/2");
		for (let total = 3; total < 10; total++) {
			await page.locator("#answer").press("Space");
			await expect(page.locator("#score")).toContainText(`1/${total}`);
		}
		await page.locator("#answer").press("Space");
		await expect(page.locator("#result")).toBeVisible();
		await expect(page.locator("#stats-answered")).toHaveText("1");
		await expect(page.locator("#stats-skipped")).toHaveText("9");

		await page.locator("#restart").click();
		await expect(page.locator("#start")).toBeEnabled();
		await page.locator("#game-round-length").selectOption("unlimited");
		await page.locator("#start").click();
		await expect(page.locator("#game")).not.toHaveClass(/d-none/);
		await expect(page.locator("#question")).not.toBeEmpty();
		await expect(page.locator("#answer")).toBeFocused();
		await expect(page.locator("body")).toHaveClass(/keyboard-open/);
		await expect(page.locator("#score")).toContainText("0/0");
		await page.locator("#skip").click();
		await expect(page.locator("#score")).toContainText("0/1");
		for (let total = 2; total <= 10; total++) {
			await page.locator("#answer").press("Space");
			await expect(page.locator("#score")).toContainText(`0/${total}`);
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
			const csvRecords = csvContent.trim().split(/\r?\n/);
			expect(csvRecords[0]).toBe(
				"Status,Kanji,Kana,Romaji,Your Answer,Meaning,Response Time (s),Seconds per Kana Character",
			);
			expect(csvRecords).toHaveLength(3);
			for (const record of csvRecords) {
				expect(countCSVColumns(record)).toBe(8);
			}
			expect(csvRecords[1]).toMatch(/^Correct,/);
			expect(csvRecords[1]).toMatch(/,\d+\.\d{2},\d+\.\d{2}$/);
			expect(csvRecords[2]).toMatch(/^Skipped,/);
			expect(csvRecords[2]).toMatch(/,\d+\.\d{2},$/);
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
