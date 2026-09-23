import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ROUND_LENGTHS } from "../../src/constants/game-options";
import { mountAppDom, unmountAppDom } from "./helpers/app-dom";

type OptionsModule = typeof import("../../src/ui/options");

describe("Options and saved settings", () => {
	let options: OptionsModule;

	beforeEach(async () => {
		mountAppDom();
		vi.resetModules();
		options = await import("../../src/ui/options");
	});

	afterEach(async () => {
		await unmountAppDom();
		vi.restoreAllMocks();
	});

	it("uses the JLPT, 20-card, Noto Sans JP defaults", () => {
		expect(options.SETTINGS_DEFAULT).toMatchObject({
			card: "JLPT",
			roundLength: 20,
			font: "Noto Sans JP",
		});
		expect(options.loadSettings()).toEqual(options.SETTINGS_DEFAULT);
	});

	it("migrates legacy Kana and Kanji settings while keeping saved choices", () => {
		localStorage.setItem(
			"SETTINGS",
			JSON.stringify({
				card: "JLPT",
				type: "game-mixed",
				kanji: true,
				dakuten: false,
			}),
		);

		expect(options.loadSettings()).toMatchObject({
			card: "JLPT",
			kana: "Mixed",
			showKanji: true,
			dakuten: false,
		});
	});

	it("normalizes every supported round length and recovers from invalid storage", () => {
		for (const roundLength of [...ROUND_LENGTHS, null]) {
			localStorage.setItem("SETTINGS", JSON.stringify({ roundLength }));
			expect(options.loadSettings().roundLength).toBe(roundLength);
		}
		localStorage.setItem("SETTINGS", JSON.stringify({ roundLength: 15 }));
		expect(options.loadSettings().roundLength).toBe(20);
		localStorage.setItem("SETTINGS", "{");
		expect(options.loadSettings()).toEqual(options.SETTINGS_DEFAULT);
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("storage blocked");
		});
		expect(options.loadSettings()).toEqual(options.SETTINGS_DEFAULT);
	});

	it("caches a chosen optional font online and restores font choices after reconnecting", async () => {
		const cachedFonts = new Set<string>();
		const cache = {
			match: vi.fn(async (request: RequestInfo | URL) =>
				cachedFonts.has(String(request))
					? new Response("cached font")
					: undefined,
			),
			put: vi.fn(async (request: RequestInfo | URL) => {
				cachedFonts.add(String(request));
			}),
		};
		const cacheStorage = {
			open: vi.fn(async () => cache),
		} as unknown as CacheStorage;
		Object.defineProperty(window, "caches", {
			configurable: true,
			value: cacheStorage,
		});
		vi.stubGlobal("caches", cacheStorage);
		const fetchFont = vi.fn(
			async (url: RequestInfo | URL) => new Response(String(url)),
		);
		vi.stubGlobal("fetch", fetchFont);
		const settings = { ...options.SETTINGS_DEFAULT };
		options.initOptionsUI(settings);
		const font = document.querySelector<HTMLSelectElement>("#game-font")!;
		font.value = "Klee One";
		font.dispatchEvent(new Event("change"));
		font.dispatchEvent(new Event("change"));
		const kleeAsset = () =>
			fetchFont.mock.calls.filter(([url]) =>
				String(url).includes("klee-one"),
			);
		const kleeCacheWrites = () =>
			cache.put.mock.calls.filter(([url]) =>
				String(url).includes("klee-one"),
			);
		await vi.waitFor(() => expect(kleeCacheWrites()).toHaveLength(1));
		expect(kleeAsset()).toHaveLength(1);

		font.value = "system-ui";
		font.dispatchEvent(new Event("change"));
		font.value = "Klee One";
		font.dispatchEvent(new Event("change"));
		await vi.waitFor(() =>
			expect(
				cache.match.mock.calls.filter(([url]) =>
					String(url).includes("klee-one"),
				),
			).toHaveLength(2),
		);
		expect(kleeAsset()).toHaveLength(1);
		expect(kleeCacheWrites()).toHaveLength(1);

		settings.font = "Yuji Syuku";
		Object.defineProperty(navigator, "onLine", {
			configurable: true,
			value: false,
		});
		window.dispatchEvent(new Event("offline"));
		await vi.waitFor(() =>
			expect(
				font.querySelector<HTMLOptionElement>(
					'option[value="Yuji Syuku"]',
				)!.disabled,
			).toBe(true),
		);
		expect(
			font.querySelector<HTMLOptionElement>('option[value="Klee One"]')!
				.disabled,
		).toBe(false);
		expect(
			font.querySelector<HTMLOptionElement>('option[value="system-ui"]')!
				.disabled,
		).toBe(false);
		expect(document.querySelector(".toast-font-fallback")).not.toBeNull();
		expect(
			document.querySelector<HTMLElement>(".game-font-change")!.style
				.fontFamily,
		).toBe("system-ui");

		Object.defineProperty(navigator, "onLine", {
			configurable: true,
			value: true,
		});
		window.dispatchEvent(new Event("online"));
		await vi.waitFor(() =>
			expect(
				font.querySelector<HTMLOptionElement>(
					'option[value="Yuji Syuku"]',
				)!.disabled,
			).toBe(false),
		);
		expect(
			document.querySelector<HTMLElement>(".game-font-change")!.style
				.fontFamily,
		).toContain("Yuji Syuku");
	});

	it("syncs visible controls, saves changes, and navigates the options panel", () => {
		const settings = { ...options.SETTINGS_DEFAULT };
		options.initOptionsUI(settings);
		const roundLength =
			document.querySelector<HTMLSelectElement>("#game-round-length")!;
		expect(
			Array.from(roundLength.options, (option) => option.value),
		).toEqual(["unlimited", ...ROUND_LENGTHS.map(String)]);
		expect(roundLength.value).toBe("20");
		roundLength.value = "unlimited";
		roundLength.dispatchEvent(new Event("change"));
		expect(settings.roundLength).toBeNull();

		const font = document.querySelector<HTMLSelectElement>("#game-font")!;
		font.value = "serif";
		font.dispatchEvent(new Event("change"));
		expect(settings.font).toBe("serif");
		expect(
			document.querySelector<HTMLElement>(".game-font-change")!.style
				.fontFamily,
		).toBe("serif");

		const help = document.querySelector("#option-help")!;
		const kanjiButton =
			document.querySelector<HTMLButtonElement>("#game-kanji")!;
		kanjiButton.dispatchEvent(new Event("focus"));
		expect(help.innerHTML).toContain("ruby text");
		kanjiButton.dispatchEvent(new Event("blur"));
		expect(help.textContent).toContain("Hover or focus an option");

		document
			.querySelector("#option")!
			.dispatchEvent(new Event("click", { bubbles: true }));
		document
			.querySelector("#options-btn-more")!
			.dispatchEvent(new Event("click", { bubbles: true }));
		document
			.querySelector("#options-btn-back")!
			.dispatchEvent(new Event("click", { bubbles: true }));
		document
			.querySelector<HTMLButtonElement>('.game-theme[value="dark"]')!
			.click();
		document
			.querySelector<HTMLButtonElement>('.game-card[value="Random"]')!
			.click();
		document.querySelector<HTMLButtonElement>("#game-katakana")!.click();
		kanjiButton.click();
		document.querySelector<HTMLButtonElement>("#game-dakuten")!.click();

		expect(settings).toMatchObject({
			theme: "dark",
			card: "Random",
			kana: "Katakana",
			showKanji: true,
			dakuten: false,
		});
		expect(
			document
				.querySelector("#game-smallvowel")!
				.classList.contains("d-none"),
		).toBe(false);
		expect(JSON.parse(localStorage.getItem("SETTINGS")!)).toMatchObject(
			settings,
		);

		const optionButton = document.querySelector("#option")!;
		optionButton.dispatchEvent(new Event("click", { bubbles: true }));
		expect(
			document
				.querySelector("#option-wrapper")!
				.classList.contains("collapsed"),
		).toBe(false);
	});
});
