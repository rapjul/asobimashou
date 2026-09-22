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
 * Prevents body scrolling behind the game while the mobile keyboard is open.
 *
 * @param {TouchEvent} event - The touch movement event.
 * @returns {void}
 */
function preventKeyboardBodyScroll(event: TouchEvent): void {
	if (!document.body.classList.contains("keyboard-open")) return;
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

// Register Service Worker updates via Vite PWA
registerSW({
	immediate: true,
	onNeedRefresh() {
		// New version available
		showToast(
			'<i class="bi-arrow-clockwise text-primary"></i> <span>New update available! Reload to update.</span>',
			"toast-update",
		);
	},
	onOfflineReady() {
		// App ready for offline use
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
const game = new GameController(settings);

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
	game.startGame();
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
	document.querySelector<HTMLInputElement>("#answer")?.focus();
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
