import type { GameSettings } from "../types";
import { applyTheme, resolveIsDark } from "./theme";
import { showFontOfflineToast } from "./toasts";

/**
 * Default game settings configuration.
 */
export const SETTINGS_DEFAULT: GameSettings = {
	card: "JLPT",
	kana: "Hiragana",
	number: 10,
	meaning: true,
	dakuten: true,
	doubledConsonants: true,
	comboKana: true,
	smallVowels: true,
	vowelLength: true,
	font: "sans-serif",
	theme: "system",
};

/**
 * Interactive help text descriptions for each option element.
 */
export const HELP_TEXTS: Record<string, string> = {
	"#game-font":
		"Select the font used for <wbr>displaying Japanese characters.",
	'.game-theme[value="system"]': "Follow the system theme preference.",
	'.game-theme[value="light"]': "Use a bright, clean <wbr>light theme.",
	'.game-theme[value="dark"]': "Use a comfortable <wbr>dark theme.",
	"#game-kanji":
		"Show or hide Kanji characters as <wbr>ruby text <wbr>(Furigana) <wbr>above the Kana.",
	"#game-hiragana":
		"Practice reading standard Hiragana characters <wbr>(あいうえお).",
	"#game-mixed":
		"Practice reading a mix of <wbr>Hiragana and Katakana characters.",
	"#game-katakana":
		"Practice reading standard Katakana characters <wbr>(アイウエオ).",
	"#game-dakuten":
		"Include or exclude voiced sounds <wbr>(゛/ ゜, e.g., ば, ぱ).",
	"#game-tsu":
		"Include or exclude doubled consonants <wbr>(っ / ッ, e.g., よっつ).",
	"#game-combo":
		"Include or exclude contracted combo sounds <wbr>(ゃ/ゅ/ょ / ャ/ュ/ョ, e.g., しゃ).",
	"#game-smallvowel":
		"Include or exclude small vowels <wbr>(ぁ/ぃ/ぅ/ぇ/ぉ / ァ/ィ/ゥ/ェ/ォ, e.g., フェ).",
	"#game-vowellength":
		"Include or exclude prolonged vowel mark <wbr>(ー, e.g., ノート).",
	'.game-card[value="Random"]':
		"Practice using a randomized deck of <wbr>common vocabulary.",
	'.game-card[value="JLPT"]':
		"Practice using vocabulary from <wbr>the JLPT N5 and N4 lists.",
	"#options-btn-more":
		"Configure advanced filters for <wbr>voiced, combo, and small sounds.",
	"#options-btn-back": "Return to the <wbr>main options screen.",
};

/**
 * Loads persisted settings from localStorage merged with defaults.
 *
 * @returns {GameSettings} The active game settings.
 */
export function loadSettings(): GameSettings {
	try {
		const raw = localStorage.getItem("SETTINGS");
		if (raw) {
			const parsed = JSON.parse(raw);
			return { ...SETTINGS_DEFAULT, ...parsed };
		}
	} catch {
		// Ignore JSON parse errors
	}
	return { ...SETTINGS_DEFAULT };
}

/**
 * Persists game settings to localStorage.
 *
 * @param {GameSettings} settings - The settings to save.
 * @returns {void}
 */
export function saveSettings(settings: GameSettings): void {
	try {
		localStorage.setItem("SETTINGS", JSON.stringify(settings));
	} catch {
		// Storage quota or permissions error
	}
}

/**
 * Applies the selected font family to all themed text elements and handles offline notices.
 *
 * @param {string} font - Chosen font name.
 * @returns {void}
 */
export function changeFont(font: string): void {
	const select = document.querySelector<HTMLSelectElement>("#game-font");
	if (select) {
		select.value = font;
	}
	document
		.querySelectorAll<HTMLElement>(".game-font-change")
		.forEach((el) => {
			el.style.fontFamily = font;
		});

	if (!navigator.onLine && font !== "sans-serif") {
		showFontOfflineToast(font);
	}
}

/**
 * Closes the options modal panel.
 *
 * @returns {void}
 */
export function closeOptions(): void {
	const wrapper = document.querySelector("#option-wrapper");
	const btn = document.querySelector("#option");
	const menuGroup = document.querySelector("#main-menu-group");
	if (wrapper?.classList.contains("collapsed")) {
		btn?.classList.remove("active");
		wrapper.classList.remove("collapsed");
		menuGroup?.classList.remove("expanded");
		const scrollContainer = document.querySelector(
			"#options-scroll-container",
		);
		if (scrollContainer) scrollContainer.scrollTop = 0;
	}
}

/**
 * Initializes the Options panel UI, pagination, theme buttons, and event listeners.
 *
 * @param {GameSettings} settings - The active game settings reference.
 * @returns {void}
 */
export function initOptionsUI(settings: GameSettings): void {
	// Sync UI state from settings
	changeFont(settings.font);
	applyTheme(resolveIsDark(settings.theme));

	const optionBtn = document.querySelector("#option");
	const optionWrapper = document.querySelector("#option-wrapper");
	const menuGroup = document.querySelector("#main-menu-group");

	if (optionBtn && optionWrapper) {
		optionBtn.addEventListener("click", () => {
			optionBtn.classList.toggle("active");
			optionWrapper.classList.toggle("collapsed");
			if (menuGroup) {
				menuGroup.classList.toggle(
					"expanded",
					optionWrapper.classList.contains("collapsed"),
				);
			}
			const scrollContainer = document.querySelector(
				"#options-scroll-container",
			);
			if (scrollContainer) scrollContainer.scrollTop = 0;
		});
	}

	// Options pagination via scroll container
	const btnMore = document.querySelector("#options-btn-more");
	const btnBack = document.querySelector("#options-btn-back");
	const scrollContainer = document.querySelector("#options-scroll-container");

	if (btnMore && scrollContainer) {
		btnMore.addEventListener("click", () => {
			scrollContainer.scrollTo({ top: 230, behavior: "smooth" });
		});
	}

	if (btnBack && scrollContainer) {
		btnBack.addEventListener("click", () => {
			scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
		});
	}

	// Help text display
	const helpEl = document.querySelector("#option-help");
	const defaultHelpText = "Hover or focus an option to see details.";

	Object.entries(HELP_TEXTS).forEach(([selector, text]) => {
		document.querySelectorAll(selector).forEach((el) => {
			const show = () => {
				if (helpEl) {
					helpEl.innerHTML = `<span class="text-center w-100">${text}</span>`;
				}
			};
			const hide = () => {
				if (helpEl) {
					helpEl.textContent = defaultHelpText;
				}
			};
			el.addEventListener("mouseenter", show);
			el.addEventListener("focus", show);
			el.addEventListener("mouseleave", hide);
			el.addEventListener("blur", hide);
		});
	});

	// Font selector
	const fontSelect = document.querySelector<HTMLSelectElement>("#game-font");
	if (fontSelect) {
		fontSelect.addEventListener("change", () => {
			settings.font = fontSelect.value;
			changeFont(settings.font);
			saveSettings(settings);
		});
	}

	// Theme buttons
	document
		.querySelectorAll<HTMLButtonElement>(".game-theme")
		.forEach((btn) => {
			btn.addEventListener("click", () => {
				document
					.querySelectorAll(".game-theme")
					.forEach((b) => b.classList.remove("active"));
				btn.classList.add("active");
				const val = btn.value as "system" | "light" | "dark";
				settings.theme = val;
				applyTheme(resolveIsDark(val));
				saveSettings(settings);
			});
		});

	// Deck selector buttons
	document
		.querySelectorAll<HTMLButtonElement>(".game-card")
		.forEach((btn) => {
			btn.addEventListener("click", () => {
				document
					.querySelectorAll(".game-card")
					.forEach((b) => b.classList.remove("active"));
				btn.classList.add("active");
				settings.card = btn.value as "JLPT" | "Random";
				saveSettings(settings);
			});
		});

	// Close when clicking outside
	document.addEventListener("click", (evt) => {
		const target = evt.target as Node;
		if (
			optionBtn &&
			optionWrapper &&
			!optionBtn.contains(target) &&
			!optionWrapper.contains(target)
		) {
			closeOptions();
		}
	});

	// Close on Escape
	document.addEventListener("keydown", (evt) => {
		if (evt.key === "Escape") {
			closeOptions();
		}
	});
}
