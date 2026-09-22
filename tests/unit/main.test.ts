import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountAppDom, unmountAppDom } from "./helpers/app-dom";

interface PwaCallbacks {
	onNeedRefresh?: () => void;
	onOfflineReady?: () => void;
}

interface MainMocks {
	callbacks: PwaCallbacks;
	game: {
		isSessionActive: boolean;
		startGame: ReturnType<typeof vi.fn>;
		handleInput: ReturnType<typeof vi.fn>;
		skipQuestion: ReturnType<typeof vi.fn>;
		stopGame: ReturnType<typeof vi.fn>;
		exportCSV: ReturnType<typeof vi.fn>;
		shareResults: ReturnType<typeof vi.fn>;
		copyTable: ReturnType<typeof vi.fn>;
		restart: ReturnType<typeof vi.fn>;
	};
	endRound: () => void;
	activateWaitingUpdate: ReturnType<typeof vi.fn>;
	showToast: ReturnType<typeof vi.fn>;
	showOfflineToast: ReturnType<typeof vi.fn>;
	showOnlineToast: ReturnType<typeof vi.fn>;
	toggleOfflineBadge: ReturnType<typeof vi.fn>;
	initOptionsUI: ReturnType<typeof vi.fn>;
}

/**
 * Imports the application entry point with its external controllers replaced by spies.
 *
 * @returns {Promise<MainMocks>} Mocks and callbacks captured during startup.
 */
async function bootMain(): Promise<MainMocks> {
	const settings = {
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
	const game = {
		isSessionActive: false,
		startGame: vi.fn().mockImplementation(async () => {
			game.isSessionActive = true;
		}),
		handleInput: vi.fn(),
		skipQuestion: vi.fn(),
		stopGame: vi.fn(),
		exportCSV: vi.fn(),
		shareResults: vi.fn(),
		copyTable: vi.fn(),
		restart: vi.fn(),
	};
	const callbacks: PwaCallbacks = {};
	const activateWaitingUpdate = vi.fn().mockResolvedValue(undefined);
	const showToast = vi.fn((html: string, extraClass = "") => {
		const toast = document.createElement("div");
		toast.className = `custom-toast ${extraClass}`.trim();
		toast.innerHTML = html;
		document.querySelector("#toast-container")?.appendChild(toast);
		return toast;
	});
	const showOfflineToast = vi.fn();
	const showOnlineToast = vi.fn();
	const toggleOfflineBadge = vi.fn();
	const initOptionsUI = vi.fn();
	let endRound = (): void => {};
	const GameController = vi.fn(function (
		_settings: unknown,
		onRoundEnd: () => void,
	) {
		endRound = onRoundEnd;
		return game;
	});
	const registerSW = vi.fn((options: PwaCallbacks) => {
		Object.assign(callbacks, options);
		return activateWaitingUpdate;
	});

	vi.doMock("../../src/ui/game-controller", () => ({ GameController }));
	vi.doMock("../../src/ui/options", () => ({
		loadSettings: () => settings,
		initOptionsUI,
	}));
	vi.doMock("../../src/ui/toasts", () => ({
		showToast,
		showOfflineToast,
		showOnlineToast,
		toggleOfflineBadge,
	}));
	vi.doMock("virtual:pwa-register", () => ({ registerSW }));
	await import("../../src/main");

	return {
		callbacks,
		game,
		endRound,
		activateWaitingUpdate,
		showToast,
		showOfflineToast,
		showOnlineToast,
		toggleOfflineBadge,
		initOptionsUI,
	};
}

describe("Application startup and browser event wiring", () => {
	beforeEach(async () => {
		mountAppDom();
		vi.resetModules();
	});

	afterEach(async () => {
		vi.doUnmock("../../src/ui/game-controller");
		vi.doUnmock("../../src/ui/options");
		vi.doUnmock("../../src/ui/toasts");
		vi.doUnmock("virtual:pwa-register");
		vi.resetModules();
		vi.restoreAllMocks();
		await unmountAppDom();
	});

	it("initializes the app and binds start, answer, skip, stop, result, and Home actions", async () => {
		const mocks = await bootMain();
		expect(mocks.initOptionsUI).toHaveBeenCalledOnce();
		expect(
			document.querySelector<HTMLButtonElement>("#start")!.disabled,
		).toBe(false);

		document.querySelector<HTMLButtonElement>("#start")!.click();
		await Promise.resolve();
		expect(mocks.game.startGame).toHaveBeenCalledOnce();
		expect(
			document.querySelector("#menu")!.classList.contains("slide-up"),
		).toBe(false);

		const answer = document.querySelector<HTMLInputElement>("#answer")!;
		answer.value = "a";
		answer.dispatchEvent(new Event("keyup"));
		expect(mocks.game.handleInput).toHaveBeenCalledWith("a");
		const tab = new KeyboardEvent("keydown", {
			key: "Tab",
			bubbles: true,
			cancelable: true,
		});
		answer.dispatchEvent(tab);
		expect(tab.defaultPrevented).toBe(true);
		expect(mocks.game.stopGame).toHaveBeenCalledOnce();

		document.querySelector<HTMLButtonElement>("#skip")!.click();
		expect(mocks.game.skipQuestion).toHaveBeenCalledOnce();
		expect(document.activeElement).toBe(answer);
		document.querySelector<HTMLButtonElement>("#stop")!.click();
		document.querySelector<HTMLButtonElement>("#export-csv")!.click();
		document.querySelector<HTMLButtonElement>("#share")!.click();
		document.querySelector<HTMLButtonElement>("#copy")!.click();
		document.querySelector<HTMLButtonElement>("#restart")!.click();
		expect(mocks.game.stopGame).toHaveBeenCalledTimes(2);
		expect(mocks.game.exportCSV).toHaveBeenCalledOnce();
		expect(mocks.game.shareResults).toHaveBeenCalledOnce();
		expect(mocks.game.copyTable).toHaveBeenCalledOnce();
		expect(mocks.game.restart).toHaveBeenCalledOnce();
	});

	it("keeps an update notice hidden during a round and offers reload afterward", async () => {
		const mocks = await bootMain();
		mocks.game.isSessionActive = true;
		mocks.callbacks.onNeedRefresh?.();
		expect(document.querySelector(".toast-update")).toBeNull();

		mocks.game.isSessionActive = false;
		mocks.endRound();
		const notice = document.querySelector(".toast-update")!;
		expect(notice.textContent).toContain("Update ready");
		notice.querySelector("button")!.click();
		expect(mocks.activateWaitingUpdate).toHaveBeenCalledWith(true);

		mocks.callbacks.onOfflineReady?.();
		expect(document.querySelector(".toast-offline-ready")).not.toBeNull();
		document.querySelector<HTMLButtonElement>("#start")!.click();
		expect(document.querySelector(".toast-update")).toBeNull();
	});

	it("updates connectivity and keyboard layout, while allowing review scrolling", async () => {
		const mocks = await bootMain();
		window.dispatchEvent(new Event("offline"));
		expect(mocks.toggleOfflineBadge).toHaveBeenCalledWith(true);
		expect(mocks.showOfflineToast).toHaveBeenCalledOnce();
		window.dispatchEvent(new Event("online"));
		expect(mocks.toggleOfflineBadge).toHaveBeenCalledWith(false);
		expect(mocks.showOnlineToast).toHaveBeenCalledOnce();

		const answer = document.querySelector<HTMLInputElement>("#answer")!;
		answer.focus();
		window.dispatchEvent(new Event("resize"));
		expect(document.body.classList.contains("keyboard-open")).toBe(true);
		const outsideMove = new Event("touchmove", {
			bubbles: true,
			cancelable: true,
		});
		document.body.dispatchEvent(outsideMove);
		expect(outsideMove.defaultPrevented).toBe(true);
		const reviewMove = new Event("touchmove", {
			bubbles: true,
			cancelable: true,
		});
		document.querySelector("#review-wrapper")!.dispatchEvent(reviewMove);
		expect(reviewMove.defaultPrevented).toBe(false);
		answer.blur();
	});
});
