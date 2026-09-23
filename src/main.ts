import { loadSettings, initOptionsUI } from "./ui/options";
import { GameController } from "./ui/game-controller";
import {
	showToast,
	showOfflineToast,
	showOnlineToast,
	toggleOfflineBadge,
} from "./ui/toasts";
import { registerSW } from "virtual:pwa-register";

/**
 * Updates layout measurements and keyboard-aware compact styles.
 *
 * @returns {void}
 */
function updateViewportHeight(): void {
	const visualViewport = window.visualViewport;
	const viewportHeight = visualViewport?.height ?? window.innerHeight;
	const offsetTop = visualViewport?.offsetTop ?? 0;
	document.documentElement.style.setProperty(
		"--visual-viewport-height",
		`${viewportHeight}px`,
	);
	document.documentElement.style.setProperty(
		"--visual-viewport-offset-y",
		`${offsetTop}px`,
	);
	const isInputFocused = document.activeElement?.id === "answer";
	const isViewportShort = viewportHeight < window.innerHeight * 0.85;
	document.body.classList.toggle(
		"keyboard-open",
		isViewportShort || isInputFocused,
	);
}

/**
 * Blocks one-finger body scrolling while the keyboard is open but allows pinch gestures.
 *
 * @param {TouchEvent} event - The touch movement event.
 * @returns {void}
 */
function preventKeyboardBodyScroll(event: TouchEvent): void {
	if (!document.body.classList.contains("keyboard-open")) return;
	if (event.touches.length > 1) return;
	if (
		event.target instanceof Element &&
		event.target.closest("#review-wrapper")
	) {
		return;
	}
	event.preventDefault();
}

window.visualViewport?.addEventListener("resize", updateViewportHeight);
window.visualViewport?.addEventListener("scroll", updateViewportHeight);
window.addEventListener("resize", updateViewportHeight);
document.body.addEventListener("touchmove", preventKeyboardBodyScroll, {
	passive: false,
});
const answerInput = document.querySelector<HTMLInputElement>("#answer");
answerInput?.addEventListener("focus", () =>
	window.setTimeout(updateViewportHeight, 100),
);
answerInput?.addEventListener("blur", () =>
	window.setTimeout(updateViewportHeight, 100),
);
updateViewportHeight();

let gameController: GameController | null = null;
let updateWaiting = false;
let updateNotice: HTMLElement | null = null;
/**
 * Placeholder for the service worker's waiting-update activation callback.
 *
 * @returns {Promise<void>} Resolves after the update activation is requested.
 */
let activateWaitingUpdate: (
	reloadPage?: boolean,
) => Promise<void> = async () => {};

/**
 * Shows the waiting update only when no round is starting or active.
 *
 * @returns {void}
 */
function showWaitingUpdate(): void {
	if (!updateWaiting || gameController?.isSessionActive || updateNotice) {
		return;
	}
	updateNotice = showToast(
		'<i class="bi-arrow-clockwise text-primary"></i> <span>Update ready. Reload when you are ready.</span> <button type="button" class="btn btn-sm btn-primary ms-2">Reload</button>',
		"toast-update",
		0,
	);
	const reloadButton =
		updateNotice?.querySelector<HTMLButtonElement>("button");
	reloadButton?.addEventListener("click", () => {
		void activateWaitingUpdate(true);
	});
}

/**
 * Removes a waiting update notice while the player begins a round.
 *
 * @returns {void}
 */
function hideWaitingUpdate(): void {
	updateNotice?.remove();
	updateNotice = null;
}

// Register updates as prompts so an active round is never reloaded.
activateWaitingUpdate = registerSW({
	immediate: true,
	onNeedRefresh() {
		updateWaiting = true;
		showWaitingUpdate();
	},
	onOfflineReady() {
		showToast(
			'<i class="bi-check-circle text-success"></i> <span>App ready to work offline!</span>',
			"toast-offline-ready",
		);
	},
});

// Monitor connectivity transitions and toggle offline badge
window.addEventListener("online", () => {
	toggleOfflineBadge(false);
	showOnlineToast();
});

window.addEventListener("offline", () => {
	toggleOfflineBadge(true);
	showOfflineToast();
});

// Initialize offline badge state
toggleOfflineBadge(!navigator.onLine);

const settings = loadSettings();
const game = new GameController(settings, showWaitingUpdate);
gameController = game;

// Initialize UI controllers and options panel
initOptionsUI(settings);

// Enable start button once initialized
const startBtn = document.querySelector<HTMLButtonElement>("#start");
if (startBtn) {
	startBtn.disabled = false;
	startBtn.innerHTML = '<i class="bi-play-fill"></i> Start';
}

// Bind Start button
startBtn?.addEventListener("click", () => {
	hideWaitingUpdate();
	void game.startGame().then(showWaitingUpdate);
});

// Bind Answer input keyup
document.querySelector("#answer")?.addEventListener("keyup", (evt) => {
	const input = (evt.target as HTMLInputElement).value;
	game.handleInput(input);
});

// Bind Tab key to End Game shortcut
document.querySelector("#answer")?.addEventListener("keydown", (evt) => {
	const keyboardEvt = evt as KeyboardEvent;
	if (keyboardEvt.key === "Tab") {
		keyboardEvt.preventDefault();
		game.stopGame();
	}
});

// Bind Skip button
document.querySelector("#skip")?.addEventListener("click", () => {
	game.skipQuestion();
	if (game.isSessionActive) {
		document.querySelector<HTMLInputElement>("#answer")?.focus();
	}
});

// Bind Review button
document.querySelector("#review")?.addEventListener("click", () => {
	game.reviewResults();
});

// Bind End button
document.querySelector("#stop")?.addEventListener("click", () => {
	game.stopGame();
});

// Bind Result buttons
document.querySelector("#export-csv")?.addEventListener("click", () => {
	game.exportCSV();
});

document.querySelector("#share")?.addEventListener("click", () => {
	game.shareResults();
});

document.querySelector("#copy")?.addEventListener("click", () => {
	game.copyTable();
});

document.querySelector("#restart")?.addEventListener("click", () => {
	game.restart();
});

document.body.classList.remove("preload");
