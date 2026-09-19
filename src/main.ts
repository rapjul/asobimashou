import { loadSettings, initOptionsUI } from "./ui/options";
import { GameController } from "./ui/game-controller";
import {
	showToast,
	showOfflineToast,
	showOnlineToast,
	toggleOfflineBadge,
} from "./ui/toasts";
import { registerSW } from "virtual:pwa-register";

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
