import { test, expect } from "@playwright/test";

/**
 * Scrolls a control into view and verifies that no scroll ancestor clips it.
 *
 * @param {import('@playwright/test').Page} page - Browser page under test.
 * @param {string} selector - Selector for the control to inspect.
 * @returns {Promise<void>}
 */
async function expectFullyReachable(
	page: import("@playwright/test").Page,
	selector: string,
): Promise<void> {
	const control = page.locator(selector);
	await control.scrollIntoViewIfNeeded();
	await expect
		.poll(
			() =>
				control.evaluate((element) => {
					const rect = element.getBoundingClientRect();
					let top = 0;
					let right = window.innerWidth;
					let bottom = window.innerHeight;
					let left = 0;
					for (
						let ancestor = element.parentElement;
						ancestor;
						ancestor = ancestor.parentElement
					) {
						const style = getComputedStyle(ancestor);
						const ancestorRect = ancestor.getBoundingClientRect();
						if (style.overflowY !== "visible") {
							top = Math.max(top, ancestorRect.top);
							bottom = Math.min(bottom, ancestorRect.bottom);
						}
						if (style.overflowX !== "visible") {
							left = Math.max(left, ancestorRect.left);
							right = Math.min(right, ancestorRect.right);
						}
					}
					return (
						rect.width > 0 &&
						rect.height > 0 &&
						rect.top >= top - 1 &&
						rect.bottom <= bottom + 1 &&
						rect.left >= left - 1 &&
						rect.right <= right + 1
					);
				}),
			`${selector} should fit its visible scroll ancestors`,
		)
		.toBe(true);
}

test.describe("Options Panel & Theme Configuration", () => {
	test("announces option state and preserves keyboard focus", async ({
		page,
	}) => {
		await page.goto("/");

		const optionButton = page.locator("#option");
		await expect(optionButton).toHaveAttribute("aria-expanded", "false");
		await optionButton.focus();
		await page.keyboard.press("Enter");
		await expect(optionButton).toHaveAttribute("aria-expanded", "true");

		const kanjiButton = page.locator("#game-kanji");
		await kanjiButton.focus();
		await page.keyboard.press("Space");
		await expect(kanjiButton).toBeFocused();
		await expect(kanjiButton).toHaveAttribute("aria-pressed", "true");

		const katakanaButton = page.locator("#game-katakana");
		await katakanaButton.click();
		await expect(katakanaButton).toHaveAttribute("aria-pressed", "true");
		await expect(page.locator("#game-hiragana")).toHaveAttribute(
			"aria-pressed",
			"false",
		);

		const darkButton = page.locator('.game-theme[value="dark"]');
		await darkButton.click();
		await expect(darkButton).toHaveAttribute("aria-pressed", "true");
		await expect(
			page.locator('.game-theme[value="system"]'),
		).toHaveAttribute("aria-pressed", "false");
	});

	test("should toggle options panel and paginate between settings screens", async ({
		page,
	}) => {
		for (const viewport of [
			{ width: 1280, height: 800 },
			{ width: 320, height: 568 },
		]) {
			await page.setViewportSize(viewport);
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

			const optionsViewport = page.locator("#options-scroll-container");
			const moreBtn = page.locator("#options-btn-more");
			await expect
				.poll(() =>
					moreBtn.evaluate((button) => {
						const viewport = document.querySelector(
							"#options-scroll-container",
						);
						if (!viewport) return false;
						const buttonRect = button.getBoundingClientRect();
						const viewportRect = viewport.getBoundingClientRect();
						return (
							buttonRect.top >= viewportRect.top &&
							buttonRect.bottom <= viewportRect.bottom
						);
					}),
				)
				.toBe(true);

			// Paginate to extra options and verify the Back control is fully visible.
			await moreBtn.click();
			await expect
				.poll(() =>
					page.evaluate(() => {
						const page = document.querySelector(
							"#options-page-extra",
						);
						const viewport = document.querySelector(
							"#options-scroll-container",
						);
						return (
							!!page &&
							!!viewport &&
							Math.abs(
								page.getBoundingClientRect().top -
									viewport.getBoundingClientRect().top,
							) < 1
						);
					}),
				)
				.toBe(true);
			const backBtn = page.locator("#options-btn-back");
			await expect(backBtn).toBeVisible();
			await expect
				.poll(() =>
					backBtn.evaluate((button) => {
						const viewport = document.querySelector(
							"#options-scroll-container",
						);
						if (!viewport) return false;
						const buttonRect = button.getBoundingClientRect();
						const viewportRect = viewport.getBoundingClientRect();
						return (
							buttonRect.top >= viewportRect.top &&
							buttonRect.bottom <= viewportRect.bottom
						);
					}),
				)
				.toBe(true);
			await backBtn.click();
			await expect
				.poll(() =>
					page
						.locator("#options-page-primary")
						.evaluate((primary) => {
							const viewport = document.querySelector(
								"#options-scroll-container",
							);
							return (
								!!viewport &&
								Math.abs(
									primary.getBoundingClientRect().top -
										viewport.getBoundingClientRect().top,
								) < 1
							);
						}),
				)
				.toBe(true);
			await expect(optionsViewport).toHaveJSProperty("scrollTop", 0);
		}
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
		const moreBtn = page.locator("#options-btn-more");
		await moreBtn.scrollIntoViewIfNeeded();
		await expect
			.poll(() =>
				moreBtn.evaluate((button) => {
					const viewport = document.querySelector(
						"#options-scroll-container",
					);
					if (!viewport) return false;
					const buttonRect = button.getBoundingClientRect();
					const viewportRect = viewport.getBoundingClientRect();
					return (
						buttonRect.top >= viewportRect.top &&
						buttonRect.bottom <= viewportRect.bottom
					);
				}),
			)
			.toBe(true);
		await moreBtn.click();
		const backBtn = page.locator("#options-btn-back");
		await backBtn.scrollIntoViewIfNeeded();
		await expect(backBtn).toBeVisible();
		await backBtn.click();
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

	test("keeps important controls fully reachable at small and enlarged layouts", async ({
		page,
	}) => {
		const layouts = [
			{ width: 1280, height: 800, enlarged: false },
			{ width: 320, height: 568, enlarged: false },
			{ width: 390, height: 480, enlarged: false },
			{ width: 320, height: 480, enlarged: true },
		];

		for (const layout of layouts) {
			await page.setViewportSize({
				width: layout.width,
				height: layout.height,
			});
			await page.goto("/");
			await page.addStyleTag({
				content:
					"* { transition: none !important; scroll-behavior: auto !important; }",
			});
			if (layout.enlarged) {
				await page.addStyleTag({
					content: "html { font-size: 200% !important; }",
				});
			}

			await expectFullyReachable(page, "#start");
			await expectFullyReachable(page, "#option");
			await page.locator("#option").click();
			for (const selector of [
				"#game-font",
				'.game-theme[value="system"]',
				'.game-theme[value="light"]',
				'.game-theme[value="dark"]',
				"#game-kanji",
				"#game-hiragana",
				"#game-mixed",
				"#game-katakana",
				'.game-card[value="Random"]',
				'.game-card[value="JLPT"]',
				"#game-round-length",
				"#options-btn-more",
			]) {
				await expectFullyReachable(page, selector);
			}
			await page.mouse.move(0, 0);
			const moreButton = page.locator("#options-btn-more");
			await moreButton.focus();
			await expect(moreButton).toBeFocused();
			await expect(page.locator("#option-help")).toContainText(
				"Configure advanced filters",
			);
			await expectFullyReachable(page, "#option-help");
			await expect
				.poll(() =>
					page
						.locator("#option-help")
						.evaluate(
							(help) =>
								help.scrollHeight <= help.clientHeight + 1,
						),
				)
				.toBe(true);

			await page.locator("#game-mixed").click();
			await page.locator("#options-btn-more").click();
			for (const selector of [
				"#options-btn-back",
				"#game-dakuten",
				"#game-tsu",
				"#game-combo",
				"#game-smallvowel",
				"#game-vowellength",
			]) {
				await expectFullyReachable(page, selector);
			}
			await expectFullyReachable(page, "#option-help");
			await expect
				.poll(() =>
					page
						.locator("#option-help")
						.evaluate(
							(help) =>
								help.scrollHeight <= help.clientHeight + 1,
						),
				)
				.toBe(true);

			await page.locator("#options-btn-back").click();
			await page.locator("#start").click();
			for (const selector of ["#answer", "#skip", "#stop"]) {
				await expectFullyReachable(page, selector);
			}
			if (layout.enlarged) {
				const answerFontSize = await page
					.locator("#answer")
					.evaluate((input) =>
						Number.parseFloat(getComputedStyle(input).fontSize),
					);
				expect(answerFontSize).toBeGreaterThanOrEqual(16);
			}
			await page.locator("#skip").click();
			await page.locator("#stop").click();
			for (const selector of [
				"#result-heading",
				"#export-csv",
				"#copy",
				"#share",
				"#restart",
			]) {
				await expectFullyReachable(page, selector);
			}
		}
	});
});
