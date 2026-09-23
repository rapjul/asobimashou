import type { GameSettings } from "../types";
import { FONT_OPTIONS, ROUND_LENGTHS } from "../constants/game-options";
import { applyTheme, resolveIsDark, systemDarkMQ } from "./theme";
import { showFontOfflineToast } from "./toasts";
const FONT_CACHE_NAME = "fonts-cache";
const pendingFontCaches = new Map<string, Promise<void>>();
let fontAvailabilityGeneration = 0;
let fontSelectionGeneration = 0;
let optionsPageObserver: ResizeObserver | null = null;

const OPTIONAL_FONT_URLS: Partial<Record<GameSettings["font"], string>> = {
	// prettier-ignore
	"Klee One": new URL(
		"../../assets/fonts/klee-one.woff2",
		import.meta.url,
	).href,
	"Noto Sans JP": new URL(
		"../../assets/fonts/noto-sans-jp.woff2",
		import.meta.url,
	).href,
	"Noto Serif JP": new URL(
		"../../assets/fonts/noto-serif-jp.woff2",
		import.meta.url,
	).href,
	"Yuji Syuku": new URL(
		"../../assets/fonts/yuji-syuku.woff2",
		import.meta.url,
	).href,
};

/**
 * Default game settings configuration.
 */
export const SETTINGS_DEFAULT: GameSettings = {
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

/**
 * Validates a stored round length and maps the select's sentinel to null.
 *
 * @param {unknown} value - The value read from persistent storage.
 * @returns {GameSettings["roundLength"]} A supported round length.
 */
function normalizeRoundLength(value: unknown): GameSettings["roundLength"] {
	if (value === null) return null;
	return (
		ROUND_LENGTHS.find((length) => length === value) ??
		SETTINGS_DEFAULT.roundLength
	);
}

/**
 * Converts the legacy game type identifier into the current Kana mode.
 *
 * @param {unknown} value - A stored legacy or current Kana mode.
 * @returns {GameSettings["kana"]} The normalized Kana mode.
 */
function normalizeKana(value: unknown): GameSettings["kana"] {
	if (value === "Hiragana" || value === "Katakana" || value === "Mixed") {
		return value;
	}
	if (value === "game-katakana") return "Katakana";
	if (value === "game-mixed") return "Mixed";
	return SETTINGS_DEFAULT.kana;
}

/**
 * Validates stored settings and migrates the legacy option names.
 *
 * @param {unknown} value - Parsed data from localStorage.
 * @returns {GameSettings} Normalized active settings.
 */
function normalizeSettings(value: unknown): GameSettings {
	const stored =
		typeof value === "object" && value !== null
			? (value as Record<string, unknown>)
			: {};
	const theme = stored.theme;
	const font = stored.font;
	const card = stored.card;
	const themeValue =
		theme === "system" || theme === "dark" || theme === "light"
			? theme
			: SETTINGS_DEFAULT.theme;
	const legacyKanji = stored.kanji;
	const showKanji =
		typeof stored.showKanji === "boolean"
			? stored.showKanji
			: typeof legacyKanji === "boolean"
				? legacyKanji
				: SETTINGS_DEFAULT.showKanji;

	return {
		...SETTINGS_DEFAULT,
		card:
			card === "JLPT" || card === "Random" ? card : SETTINGS_DEFAULT.card,
		kana: normalizeKana(stored.kana ?? stored.type),
		roundLength: normalizeRoundLength(stored.roundLength),
		showKanji,
		dakuten:
			typeof stored.dakuten === "boolean"
				? stored.dakuten
				: SETTINGS_DEFAULT.dakuten,
		doubledConsonants:
			typeof stored.doubledConsonants === "boolean"
				? stored.doubledConsonants
				: SETTINGS_DEFAULT.doubledConsonants,
		comboKana:
			typeof stored.comboKana === "boolean"
				? stored.comboKana
				: SETTINGS_DEFAULT.comboKana,
		smallVowels:
			typeof stored.smallVowels === "boolean"
				? stored.smallVowels
				: SETTINGS_DEFAULT.smallVowels,
		vowelLength:
			typeof stored.vowelLength === "boolean"
				? stored.vowelLength
				: SETTINGS_DEFAULT.vowelLength,
		font:
			FONT_OPTIONS.find((option) => option.value === font)?.value ??
			SETTINGS_DEFAULT.font,
		theme: themeValue,
	};
}

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
	"#game-round-length": "Choose how many cards to complete in a round.",
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
			return normalizeSettings(JSON.parse(raw));
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
export function changeFont(font: GameSettings["font"]): void {
	const generation = ++fontSelectionGeneration;
	const select = document.querySelector<HTMLSelectElement>("#game-font");
	if (select) {
		select.value = font;
	}
	const fontUrl = OPTIONAL_FONT_URLS[font];
	if (!fontUrl) {
		applyFontFamily(font);
		return;
	}
	if (navigator.onLine) {
		applyFontFamily(font);
		void cacheSelectedFont(fontUrl);
		return;
	}
	void applyCachedFontOrFallback(font, fontUrl, generation);
}

/**
 * Applies a font after confirming it is cached when the browser is offline.
 *
 * @param {GameSettings["font"]} font - The selected font family.
 * @param {string} fontUrl - The emitted asset URL for the font.
 * @param {number} generation - The current font-selection request generation.
 * @returns {Promise<void>}
 */
async function applyCachedFontOrFallback(
	font: GameSettings["font"],
	fontUrl: string,
	generation: number,
): Promise<void> {
	const isCached = await isFontCached(fontUrl);
	const select = document.querySelector<HTMLSelectElement>("#game-font");
	if (generation !== fontSelectionGeneration || select?.value !== font)
		return;
	if (isCached) {
		applyFontFamily(font);
		return;
	}
	applyFontFamily("system-ui");
	showFontOfflineToast(font);
}

/**
 * Applies a font family to every themed text element.
 *
 * @param {GameSettings["font"]} font - The font family to apply.
 * @returns {void}
 */
function applyFontFamily(font: GameSettings["font"]): void {
	document
		.querySelectorAll<HTMLElement>(".game-font-change")
		.forEach((element) => {
			element.style.fontFamily = font;
		});
}

/**
 * Returns whether the selected font asset exists in the persistent font cache.
 *
 * @param {string} fontUrl - The emitted font asset URL.
 * @returns {Promise<boolean>} True if Cache Storage contains the font.
 */
async function isFontCached(fontUrl: string): Promise<boolean> {
	if (!("caches" in window)) return false;
	try {
		const cache = await caches.open(FONT_CACHE_NAME);
		const absoluteUrl = new URL(fontUrl, document.baseURI).toString();
		return Boolean(await cache.match(absoluteUrl));
	} catch {
		return false;
	}
}

/**
 * Fetches and saves a selected optional font for later offline use.
 *
 * @param {string} fontUrl - The emitted font asset URL.
 * @returns {Promise<void>}
 */
async function cacheSelectedFont(fontUrl: string): Promise<void> {
	if (!("caches" in window)) return;
	const absoluteUrl = new URL(fontUrl, document.baseURI).toString();
	const pending = pendingFontCaches.get(absoluteUrl);
	if (pending) {
		await pending;
		return;
	}
	const cacheRequest = (async (): Promise<void> => {
		try {
			const cache = await caches.open(FONT_CACHE_NAME);
			if (await cache.match(absoluteUrl)) return;
			const response = await fetch(absoluteUrl);
			if (!response.ok) return;
			await cache.put(absoluteUrl, response.clone());
		} catch {
			// Keep the font selectable online if caching is unavailable.
		}
	})();
	pendingFontCaches.set(absoluteUrl, cacheRequest);
	try {
		await cacheRequest;
	} finally {
		pendingFontCaches.delete(absoluteUrl);
	}
}

/**
 * Disables only uncached optional fonts while offline and restores choices online.
 *
 * @param {GameSettings} settings - The active game settings reference.
 * @returns {Promise<void>}
 */
async function updateFontAvailability(settings: GameSettings): Promise<void> {
	const select = document.querySelector<HTMLSelectElement>("#game-font");
	if (!select) return;
	const generation = ++fontAvailabilityGeneration;
	for (const option of Array.from(select.options)) {
		const fontUrl =
			OPTIONAL_FONT_URLS[option.value as GameSettings["font"]];
		const pendingCache = fontUrl
			? pendingFontCaches.get(
					new URL(fontUrl, document.baseURI).toString(),
				)
			: undefined;
		if (pendingCache) await pendingCache;
		const wasCachedWhileOffline = Boolean(
			fontUrl && !navigator.onLine && (await isFontCached(fontUrl)),
		);
		if (generation !== fontAvailabilityGeneration) return;
		option.disabled = Boolean(
			fontUrl && !navigator.onLine && !wasCachedWhileOffline,
		);
	}
	if (generation !== fontAvailabilityGeneration) return;
	changeFont(settings.font);
}

/**
 * Closes the options modal panel.
 *
 * @returns {void}
 */
export function closeOptions(): void {
	const wrapper = document.querySelector<HTMLElement>("#option-wrapper");
	const btn = document.querySelector<HTMLButtonElement>("#option");
	const menuGroup = document.querySelector("#main-menu-group");
	if (wrapper?.classList.contains("collapsed")) {
		const shouldRestoreFocus = wrapper.contains(document.activeElement);
		btn?.classList.remove("active");
		wrapper.classList.remove("collapsed");
		menuGroup?.classList.remove("expanded");
		const scrollContainer = document.querySelector(
			"#options-scroll-container",
		);
		if (scrollContainer) scrollContainer.scrollTop = 0;
		if (shouldRestoreFocus) btn?.focus();
	}
}

/**
 * Fits the options viewport to the primary page's content and caps it to the viewport.
 *
 * @returns {void}
 */
function updateOptionsPageHeight(): void {
	const wrapper = document.querySelector<HTMLElement>("#option-wrapper");
	const primaryPage = document.querySelector<HTMLElement>(
		"#options-page-primary",
	);
	if (!wrapper || !primaryPage) return;

	const contentHeight = Math.ceil(primaryPage.scrollHeight);
	if (contentHeight > 0) {
		wrapper.style.setProperty(
			"--options-page-content-height",
			`${contentHeight}px`,
		);
	}
}

/**
 * Initializes the Options panel UI, pagination, theme buttons, and event listeners.
 *
 * @param {GameSettings} settings - The active game settings reference.
 * @returns {void}
 */
export function initOptionsUI(settings: GameSettings): void {
	optionsPageObserver?.disconnect();
	optionsPageObserver = null;
	populateSettingsSelects();
	updateOptionsPageHeight();
	const primaryPage = document.querySelector<HTMLElement>(
		"#options-page-primary",
	);
	if (primaryPage && typeof ResizeObserver !== "undefined") {
		optionsPageObserver = new ResizeObserver(updateOptionsPageHeight);
		optionsPageObserver.observe(primaryPage);
	}
	// Sync UI state from settings
	void updateFontAvailability(settings);
	window.addEventListener("online", () => {
		void updateFontAvailability(settings);
	});
	window.addEventListener("offline", () => {
		void updateFontAvailability(settings);
	});
	applyTheme(resolveIsDark(settings.theme));
	document
		.querySelectorAll<HTMLButtonElement>(".game-theme")
		.forEach((btn) =>
			btn.classList.toggle("active", btn.value === settings.theme),
		);
	document
		.querySelectorAll<HTMLButtonElement>(".game-card")
		.forEach((btn) =>
			btn.classList.toggle("active", btn.value === settings.card),
		);
	document
		.querySelectorAll<HTMLButtonElement>(".game-type")
		.forEach((btn) =>
			btn.classList.toggle(
				"active",
				normalizeKana(btn.id) === settings.kana,
			),
		);

	/**
	 * Syncs a toggle button's visual state with its saved setting.
	 *
	 * @param {string} id - DOM id of the toggle button.
	 * @param {boolean} enabled - Whether the saved option is enabled.
	 * @returns {void}
	 */
	const syncToggle = (id: string, enabled: boolean): void => {
		const btn = document.getElementById(id);
		if (!btn) return;
		btn.classList.toggle("active", enabled);
		btn.classList.toggle("text-decoration-line-through", !enabled);
		btn.querySelector("span")?.classList.toggle(
			"text-decoration-line-through",
			!enabled,
		);
	};
	syncToggle("game-kanji", settings.showKanji);
	syncToggle("game-dakuten", settings.dakuten);
	syncToggle("game-tsu", settings.doubledConsonants);
	syncToggle("game-combo", settings.comboKana);
	syncToggle("game-smallvowel", settings.smallVowels);
	syncToggle("game-vowellength", settings.vowelLength);

	const roundLengthSelect =
		document.querySelector<HTMLSelectElement>("#game-round-length");
	if (roundLengthSelect) {
		roundLengthSelect.value =
			settings.roundLength?.toString() ?? "unlimited";
	}
	updateConditionalTogglesVisibility(settings.kana);

	// Apply system theme changes only while System is the selected mode.
	systemDarkMQ.addEventListener("change", (event) => {
		if (settings.theme === "system") applyTheme(event.matches);
	});

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
			const extraPage = document.querySelector<HTMLElement>(
				"#options-page-extra",
			);
			if (extraPage) {
				scrollContainer.scrollTo({
					top:
						extraPage.getBoundingClientRect().top -
						scrollContainer.getBoundingClientRect().top +
						scrollContainer.scrollTop,
					behavior: "smooth",
				});
			}
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
			/** Displays the help text for the currently focused option. */
			const show = () => {
				if (helpEl) {
					helpEl.innerHTML = `<span class="text-center w-100">${text}</span>`;
				}
			};
			/** Restores the default help text when an option loses focus. */
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
			settings.font =
				FONT_OPTIONS.find((option) => option.value === fontSelect.value)
					?.value ?? settings.font;
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

	// Kana mode buttons.
	document
		.querySelectorAll<HTMLButtonElement>(".game-type")
		.forEach((btn) => {
			btn.addEventListener("click", () => {
				settings.kana = normalizeKana(btn.id);
				document.querySelectorAll(".game-type").forEach((item) => {
					item.classList.toggle("active", item === btn);
				});
				updateConditionalTogglesVisibility(settings.kana);
				saveSettings(settings);
			});
		});

	// Kanji visibility button.
	document.querySelector("#game-kanji")?.addEventListener("click", (evt) => {
		settings.showKanji = !settings.showKanji;
		syncToggle("game-kanji", settings.showKanji);
		(evt.currentTarget as HTMLElement).blur();
		saveSettings(settings);
	});

	// Phonetic filter buttons.
	const filterControls: Array<[string, keyof GameSettings]> = [
		["game-dakuten", "dakuten"],
		["game-tsu", "doubledConsonants"],
		["game-combo", "comboKana"],
		["game-smallvowel", "smallVowels"],
		["game-vowellength", "vowelLength"],
	];
	filterControls.forEach(([id, settingKey]) => {
		document.getElementById(id)?.addEventListener("click", () => {
			const enabled = !settings[settingKey] as boolean;
			(settings[settingKey] as boolean) = enabled;
			syncToggle(id, enabled);
			saveSettings(settings);
		});
	});

	// Round length selector.
	roundLengthSelect?.addEventListener("change", () => {
		settings.roundLength = normalizeRoundLength(
			roundLengthSelect.value === "unlimited"
				? null
				: Number(roundLengthSelect.value),
		);
		saveSettings(settings);
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

/**
 * Builds select options from the shared supported option definitions.
 *
 * @returns {void}
 */
function populateSettingsSelects(): void {
	const fontSelect = document.querySelector<HTMLSelectElement>("#game-font");
	fontSelect?.replaceChildren(
		...FONT_OPTIONS.map((option) => {
			const element = document.createElement("option");
			element.value = option.value;
			element.textContent = option.label;
			return element;
		}),
	);

	const roundLengthSelect =
		document.querySelector<HTMLSelectElement>("#game-round-length");
	roundLengthSelect?.replaceChildren(
		...[
			{ value: "unlimited", label: "Unlimited" },
			...ROUND_LENGTHS.map((length) => ({
				value: String(length),
				label: `${length} cards`,
			})),
		].map((option) => {
			const element = document.createElement("option");
			element.value = option.value;
			element.textContent = option.label;
			return element;
		}),
	);
}

/**
 * Shows Katakana-specific filters only when their Kana mode is relevant.
 *
 * @param {GameSettings["kana"]} kana - The active Kana mode.
 * @returns {void}
 */
function updateConditionalTogglesVisibility(kana: GameSettings["kana"]): void {
	const hiraganaOnly = kana === "Hiragana";
	document
		.querySelectorAll("#game-smallvowel, #game-vowellength")
		.forEach((btn) => btn.classList.toggle("d-none", hiraganaOnly));
}
