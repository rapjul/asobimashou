import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameController } from "@/ui/game-controller";
import type { Card, GameSettings, GameState } from "@/types";
import { mountAppDom, unmountAppDom } from "./helpers/app-dom";

const baseSettings: GameSettings = {
	card: "JLPT",
	kana: "Hiragana",
	roundLength: 20,
	showKanji: false,
	dakuten: true,
	doubledConsonants: true,
	comboKana: true,
	smallVowels: true,
	vowelLength: true,
	font: "Noto Sans JP",
	theme: "system",
};

const sampleCards: Card[] = [
	{ kanji: "雨", hiragana: "あめ", meaning: "rain" },
	{ kanji: "花", hiragana: "はな", meaning: "flower" },
];

/**
 * Replaces the private deck through the public loader seam for deterministic sessions.
 *
 * @param {GameController} controller - Controller whose deck will be supplied.
 * @param {Card[]} cards - Small cards used by the test session.
 * @returns {void}
 */
function useDeck(controller: GameController, cards: Card[]): void {
	const internals = controller as unknown as { deck: Card[] };
	vi.spyOn(controller, "loadDeck").mockImplementation(async () => {
		internals.deck = cards;
	});
}

/**
 * Reads controller state for focused behavioral assertions.
 *
 * @param {GameController} controller - Session whose state is inspected.
 * @returns {GameState} Current game state.
 */
function readGameState(controller: GameController): GameState {
	return (controller as unknown as { state: GameState }).state;
}

describe("Game session controller", () => {
	beforeEach(() => {
		mountAppDom();
		vi.stubGlobal(
			"requestAnimationFrame",
			vi.fn(() => 1),
		);
		vi.stubGlobal("cancelAnimationFrame", vi.fn());
	});

	afterEach(async () => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		await unmountAppDom();
	});

	it("finishes after a correct answer and stores the accepted reading", async () => {
		const onRoundEnd = vi.fn();
		const game = new GameController(
			{ ...baseSettings, roundLength: 10 },
			onRoundEnd,
		);
		useDeck(game, [sampleCards[0]!]);

		await game.startGame();
		game.handleInput("あめ");
		for (let completed = 1; completed < 10; completed++) {
			game.skipQuestion();
		}

		expect(document.querySelector("#stats-answered")!.textContent).toBe(
			"1",
		);
		expect(document.querySelector("#stats-skipped")!.textContent).toBe("9");
		expect(document.querySelector("#review-table")!.textContent).toContain(
			"ame",
		);
		expect(
			document.querySelector("#result")!.classList.contains("d-none"),
		).toBe(false);
		expect(onRoundEnd).toHaveBeenCalledOnce();
		expect(game.isSessionActive).toBe(false);
		expect(document.activeElement).toBe(
			document.querySelector("#result-heading"),
		);
		expect(document.querySelector<HTMLElement>("#menu")!.inert).toBe(true);
		expect(
			document.querySelector<HTMLButtonElement>("#review")!.disabled,
		).toBe(false);
		game.restart();
		const transition = new Event("transitionend");
		Object.defineProperty(transition, "propertyName", { value: "top" });
		document.querySelector("#result")!.dispatchEvent(transition);
		expect(document.querySelector<HTMLElement>("#menu")!.inert).toBe(false);
		game.reviewResults();
		expect(document.querySelector<HTMLElement>("#menu")!.inert).toBe(true);
		expect(
			document.querySelector("#result")!.classList.contains("d-none"),
		).toBe(false);
		expect(document.activeElement).toBe(
			document.querySelector("#result-heading"),
		);
	});

	it("finishes after the configured number of skips and records each row", async () => {
		const game = new GameController({ ...baseSettings, roundLength: 10 });
		useDeck(game, sampleCards);

		await game.startGame();
		for (let completed = 0; completed < 10; completed++) {
			game.skipQuestion();
			if (completed === 0) {
				expect(document.querySelector("#score")!.textContent).toContain(
					"0/1",
				);
			}
		}

		expect(document.querySelector("#stats-skipped")!.textContent).toBe(
			"10",
		);
		expect(document.querySelectorAll("#review-table tr")).toHaveLength(10);
		expect(
			document.querySelector("#result")!.classList.contains("d-none"),
		).toBe(false);
	});

	it("shows the accepted dzu spelling in review and exported CSV", async () => {
		const game = new GameController({ ...baseSettings, roundLength: null });
		useDeck(game, [
			{ kanji: "続く", hiragana: "つづく", meaning: "continue" },
		]);
		await game.startGame();
		game.handleInput("tsudzuku");
		game.stopGame();

		expect(document.querySelector("#review-table")!.textContent).toContain(
			"tsudzuku",
		);
		let exportedCSV: Blob | undefined;
		Object.defineProperty(URL, "createObjectURL", {
			configurable: true,
			value: vi.fn((blob: Blob) => {
				exportedCSV = blob;
				return "blob:romaji";
			}),
		});
		Object.defineProperty(URL, "revokeObjectURL", {
			configurable: true,
			value: vi.fn(),
		});
		game.exportCSV();
		expect(await exportedCSV?.text()).toContain(
			"Correct,続く,つづく,tsudzuku,tsudzuku,continue",
		);
	});

	it("keeps an unlimited round active until the player stops it", async () => {
		const game = new GameController({ ...baseSettings, roundLength: null });
		useDeck(game, [sampleCards[0]!]);

		await game.startGame();
		game.skipQuestion();
		game.skipQuestion();
		game.skipQuestion();
		expect(game.isSessionActive).toBe(true);
		expect(
			document.querySelector("#result")!.classList.contains("d-none"),
		).toBe(true);

		game.stopGame();
		expect(document.querySelector("#stats-skipped")!.textContent).toBe("3");
	});

	it("recovers from a rejected deck load and guards concurrent starts", async () => {
		const failed = new GameController(baseSettings);
		vi.spyOn(failed, "loadDeck").mockRejectedValue(new Error("offline"));
		await failed.startGame();
		expect(failed.isSessionActive).toBe(false);
		expect(
			document.querySelector<HTMLButtonElement>("#start")!.disabled,
		).toBe(false);
		expect(
			document.querySelector(".toast-load-error")!.textContent,
		).toContain("Unable to load vocabulary");
		expect(
			document.querySelector<HTMLButtonElement>("#review")!.disabled,
		).toBe(true);

		const game = new GameController(baseSettings);
		const internals = game as unknown as { deck: Card[] };
		let finishLoading: (() => void) | undefined;
		const loadPromise = new Promise<void>((resolve) => {
			finishLoading = resolve;
		});
		const loadDeck = vi
			.spyOn(game, "loadDeck")
			.mockImplementation(async () => {
				await loadPromise;
				internals.deck = sampleCards;
			});
		const firstStart = game.startGame();
		const duplicateStart = game.startGame();
		expect(loadDeck).toHaveBeenCalledOnce();
		finishLoading?.();
		await Promise.all([firstStart, duplicateStart]);
		expect(game.isSessionActive).toBe(true);
		game.stopGame();
	});

	it("uses the settings selected when a round starts while its deck loads", async () => {
		const settings: GameSettings = {
			...baseSettings,
			roundLength: 10,
		};
		const game = new GameController(settings);
		const internals = game as unknown as { deck: Card[] };
		const randomCard: Card = {
			kanji: "猫",
			hiragana: "ねこ",
			meaning: "cat",
		};
		let finishLoading: (() => void) | undefined;
		const loadPromise = new Promise<void>((resolve) => {
			finishLoading = resolve;
		});
		const loadDeck = vi
			.spyOn(game, "loadDeck")
			.mockImplementation(async (card) => {
				await loadPromise;
				internals.deck =
					card === "JLPT" ? [sampleCards[0]!] : [randomCard];
			});

		const start = game.startGame();
		settings.card = "Random";
		settings.roundLength = null;
		settings.showKanji = true;
		finishLoading?.();
		await start;

		expect(loadDeck).toHaveBeenCalledWith("JLPT");
		expect(document.querySelector("#question")!.textContent).toContain(
			"あめ",
		);
		expect(document.querySelector("#question rt")!.textContent).toBe("");
		for (let skipped = 0; skipped < 10; skipped++) game.skipQuestion();
		expect(
			document.querySelector("#result")!.classList.contains("d-none"),
		).toBe(false);
		expect(document.querySelector("#stats-skipped")!.textContent).toBe(
			"10",
		);
	});

	it("renders hostile vocabulary as text in questions and review rows", async () => {
		const hostileCard: Card = {
			kanji: '<img src=x onerror="alert(1)">',
			hiragana: "あ",
			meaning: "<script>alert(1)</script>",
		};
		const game = new GameController({
			...baseSettings,
			showKanji: true,
		});
		useDeck(game, [hostileCard]);

		await game.startGame();
		expect(document.querySelector("#question rt")!.textContent).toBe(
			hostileCard.kanji,
		);
		expect(
			document.querySelector("#question img, #question script"),
		).toBeNull();
		game.skipQuestion();
		game.stopGame();
		expect(
			document.querySelector("#review-table img, #review-table script"),
		).toBeNull();
		expect(document.querySelector("#review-table")!.textContent).toContain(
			hostileCard.meaning,
		);
	});

	it("preserves the last review after a new deck fails to load", async () => {
		const game = new GameController({ ...baseSettings, roundLength: null });
		useDeck(game, [sampleCards[0]!]);
		await game.startGame();
		game.skipQuestion();
		game.stopGame();
		game.restart();
		const transition = new Event("transitionend");
		Object.defineProperty(transition, "propertyName", { value: "top" });
		document.querySelector("#result")!.dispatchEvent(transition);

		vi.spyOn(game, "loadDeck").mockRejectedValue(new Error("offline"));
		await game.startGame();
		expect(
			document.querySelector<HTMLButtonElement>("#review")!.disabled,
		).toBe(false);
		game.reviewResults();
		expect(document.querySelector("#review-table")!.textContent).toContain(
			"rain",
		);
	});

	it("updates elapsed time from the monotonic clock and cancels its frame", async () => {
		let now = 1000;
		const frames: FrameRequestCallback[] = [];
		vi.stubGlobal("performance", { now: () => now });
		vi.stubGlobal(
			"requestAnimationFrame",
			(callback: FrameRequestCallback) => {
				frames.push(callback);
				return frames.length;
			},
		);
		const cancelFrame = vi.fn();
		vi.stubGlobal("cancelAnimationFrame", cancelFrame);
		const game = new GameController({ ...baseSettings, roundLength: null });
		useDeck(game, [sampleCards[0]!]);

		await game.startGame();
		now = 3500;
		frames.shift()?.(now);
		expect(document.querySelector("#time")!.innerHTML).toContain("2 ");
		game.stopGame();
		expect(cancelFrame).toHaveBeenCalledWith(1);
	});

	it("excludes hidden intervals and finalizes time when stopped in the background", async () => {
		let now = 1000;
		let hidden = false;
		const frames: FrameRequestCallback[] = [];
		vi.stubGlobal("performance", { now: () => now });
		vi.stubGlobal(
			"requestAnimationFrame",
			(callback: FrameRequestCallback) => {
				frames.push(callback);
				return frames.length;
			},
		);
		vi.stubGlobal("cancelAnimationFrame", vi.fn());
		Object.defineProperty(document, "hidden", {
			configurable: true,
			get: () => hidden,
		});
		const game = new GameController({ ...baseSettings, roundLength: null });
		useDeck(game, [sampleCards[0]!]);

		await game.startGame();
		now = 4000;
		hidden = true;
		document.dispatchEvent(new Event("visibilitychange"));
		now = 9000;
		hidden = false;
		document.dispatchEvent(new Event("visibilitychange"));
		expect(document.querySelector("#time")!.textContent).toContain("3");
		now = 10500;
		hidden = true;
		document.dispatchEvent(new Event("visibilitychange"));
		now = 15500;
		game.stopGame();

		expect(document.querySelector("#stats-timer")!.textContent).toBe("4 s");
		hidden = false;
		now = 20000;
		document.dispatchEvent(new Event("visibilitychange"));
		expect(document.querySelector("#stats-timer")!.textContent).toBe("4 s");
	});

	it("times a card from display through valid answer, excluding hidden time", async () => {
		let now = 1000;
		let hidden = false;
		vi.stubGlobal("performance", { now: () => now });
		vi.stubGlobal(
			"requestAnimationFrame",
			vi.fn(() => 1),
		);
		vi.stubGlobal("cancelAnimationFrame", vi.fn());
		Object.defineProperty(document, "hidden", {
			configurable: true,
			get: () => hidden,
		});
		const game = new GameController({ ...baseSettings, roundLength: null });
		useDeck(game, [sampleCards[0]!]);

		await game.startGame();
		now = 2500;
		game.handleInput("wrong");
		hidden = true;
		document.dispatchEvent(new Event("visibilitychange"));
		now = 10000;
		hidden = false;
		expect(document.hidden).toBe(false);
		document.dispatchEvent(new Event("visibilitychange"));
		expect(
			(game as unknown as { hiddenDurationMs: number }).hiddenDurationMs,
		).toBe(7500);
		now = 12500;
		game.handleInput("ame");

		expect(readGameState(game).history[0]?.responseTimeMs).toBe(4000);
	});

	it("records time to Skip and ignores input after a round finishes", async () => {
		let now = 1000;
		vi.stubGlobal("performance", { now: () => now });
		vi.stubGlobal(
			"requestAnimationFrame",
			vi.fn(() => 1),
		);
		vi.stubGlobal("cancelAnimationFrame", vi.fn());
		const game = new GameController({ ...baseSettings, roundLength: 10 });
		useDeck(game, [sampleCards[0]!]);

		await game.startGame();
		now = 2345;
		game.skipQuestion();
		expect(readGameState(game).history[0]?.responseTimeMs).toBe(1345);
		game.stopGame();
		game.handleInput("ame");
		game.skipQuestion();
		expect(readGameState(game).history).toHaveLength(1);
		expect(readGameState(game).skipped).toBe(1);
	});

	it("resets to Home when the result transition completes", async () => {
		const game = new GameController(baseSettings);
		useDeck(game, [sampleCards[0]!]);
		await game.startGame();
		game.skipQuestion();
		game.stopGame();
		const result = document.querySelector("#result")!;
		game.restart();
		const transition = new Event("transitionend");
		Object.defineProperty(transition, "propertyName", { value: "top" });
		result.dispatchEvent(transition);

		expect(result.classList.contains("d-none")).toBe(true);
		expect(
			document.querySelector("#game")!.classList.contains("d-none"),
		).toBe(true);
		expect(document.querySelector("#score")!.textContent).toContain("0/0");
		expect(
			document.querySelector<HTMLButtonElement>("#start")!.disabled,
		).toBe(false);
		expect(document.activeElement).toBe(document.querySelector("#start"));
	});

	it("ignores repeated restart calls while a transition is pending", async () => {
		const game = new GameController(baseSettings);
		useDeck(game, [sampleCards[0]!]);
		await game.startGame();
		game.skipQuestion();
		game.stopGame();

		const result = document.querySelector("#result")!;
		expect(result.classList.contains("d-none")).toBe(false);

		// First call triggers slide-out and schedules timeout
		game.restart();
		// Rapid second call should be ignored
		game.restart();

		const transition = new Event("transitionend");
		Object.defineProperty(transition, "propertyName", { value: "top" });
		result.dispatchEvent(transition);

		expect(result.classList.contains("d-none")).toBe(true);

		// Calling restart again while already hidden should also do nothing
		game.restart();
		expect(result.classList.contains("d-none")).toBe(true);
	});

	it("exports CSV and uses clipboard fallbacks for sharing and copying", async () => {
		const game = new GameController(baseSettings);
		useDeck(game, [sampleCards[0]!]);
		await game.startGame();
		game.skipQuestion();
		game.stopGame();
		const clipboardWrite = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText: clipboardWrite },
		});
		Object.defineProperty(navigator, "share", {
			configurable: true,
			value: undefined,
		});
		const createObjectURL = vi.fn(() => "blob:session");
		const revokeObjectURL = vi.fn();
		Object.defineProperty(URL, "createObjectURL", {
			configurable: true,
			value: createObjectURL,
		});
		Object.defineProperty(URL, "revokeObjectURL", {
			configurable: true,
			value: revokeObjectURL,
		});

		game.exportCSV();
		await game.shareResults();
		await game.copyTable();
		expect(createObjectURL).toHaveBeenCalledOnce();
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:session");
		expect(clipboardWrite).toHaveBeenCalledTimes(2);
	});

	it("falls back to a textarea and reports clipboard failure", async () => {
		const game = new GameController(baseSettings);
		useDeck(game, [sampleCards[0]!]);
		await game.startGame();
		game.skipQuestion();
		game.stopGame();
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: {
				writeText: vi.fn().mockRejectedValue(new Error("denied")),
			},
		});
		Object.defineProperty(navigator, "share", {
			configurable: true,
			value: undefined,
		});
		const previousFocus =
			document.querySelector<HTMLElement>("#result-heading")!;
		previousFocus.focus();
		const execCommand = vi.fn(() => true);
		Object.defineProperty(document, "execCommand", {
			configurable: true,
			value: execCommand,
		});

		await game.copyTable();
		expect(execCommand).toHaveBeenCalledWith("copy");
		expect(
			document.querySelector("textarea[aria-hidden='true']"),
		).toBeNull();
		expect(document.activeElement).toBe(previousFocus);
		expect(document.querySelector(".toast-copy")!.textContent).toContain(
			"Table copied to clipboard",
		);

		execCommand.mockReturnValue(false);
		await game.shareResults();
		expect(document.querySelector(".toast-share")!.textContent).toContain(
			"Could not copy results",
		);
	});

	it("handles native share lifecycle including user cancellation and errors", async () => {
		const game = new GameController(baseSettings);
		useDeck(game, [sampleCards[0]!]);
		await game.startGame();
		game.skipQuestion();
		game.stopGame();

		const clipboardWrite = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText: clipboardWrite },
		});

		// 1. Share succeeds
		const shareMock = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "share", {
			configurable: true,
			value: shareMock,
		});

		await game.shareResults();
		expect(shareMock).toHaveBeenCalledOnce();
		expect(clipboardWrite).not.toHaveBeenCalled();
		expect(document.querySelector(".toast-share")).toBeNull();

		// 2. Share cancelled by user (AbortError)
		shareMock.mockReset();
		shareMock.mockRejectedValue(
			new DOMException("Share cancelled", "AbortError"),
		);

		await game.shareResults();
		expect(shareMock).toHaveBeenCalledOnce();
		expect(clipboardWrite).not.toHaveBeenCalled();
		expect(document.querySelector(".toast-share")).toBeNull();

		// 3. Share fails with general error -> falls back to clipboard
		shareMock.mockReset();
		shareMock.mockRejectedValue(new Error("Platform failure"));

		await game.shareResults();
		expect(shareMock).toHaveBeenCalledOnce();
		expect(clipboardWrite).toHaveBeenCalledOnce();
		expect(document.querySelector(".toast-share")!.textContent).toContain(
			"Copied to clipboard",
		);
	});
});
