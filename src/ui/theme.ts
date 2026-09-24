/**
 * System dark mode media query listener.
 */
export const systemDarkMQ: MediaQueryList = window.matchMedia(
	"(prefers-color-scheme: dark)",
);

/**
 * Resolves whether dark theme should be active based on user choice and system preference.
 *
 * @param {"system" | "light" | "dark"} theme - The theme choice.
 * @returns {boolean} True if dark styling should be applied.
 */
export function resolveIsDark(theme: "system" | "light" | "dark"): boolean {
	if (theme === "dark") return true;
	if (theme === "light") return false;
	return systemDarkMQ.matches;
}

/**
 * Applies dark or light styling classes across all themed elements.
 *
 * @param {boolean} isDark - True to apply dark mode, false for light mode.
 * @returns {void}
 */
export function applyTheme(isDark: boolean): void {
	const metaThemeColor = document.querySelector('meta[name="theme-color"]');
	if (metaThemeColor) {
		metaThemeColor.setAttribute("content", isDark ? "#212529" : "#F8F9FA");
	}

	document.querySelectorAll("body, #menu, #result").forEach((el) => {
		el.classList.toggle("bg-dark", isDark);
		el.classList.toggle("bg-light", !isDark);
		el.classList.toggle("text-white", isDark);
	});

	const answer = document.querySelector("#answer");
	if (answer) {
		answer.classList.toggle("text-white", isDark);
	}

	document.querySelectorAll("kbd").forEach((el) => {
		el.classList.toggle("bg-white", isDark);
		el.classList.toggle("text-dark", isDark);
		el.classList.toggle("bg-dark", !isDark);
		el.classList.toggle("text-white", !isDark);
	});

	document.querySelectorAll(".table").forEach((el) => {
		el.classList.toggle("table-hover", !isDark);
		el.classList.toggle("text-white", isDark);
	});

	document.querySelectorAll(".btn").forEach((el) => {
		el.classList.remove(
			"btn-dark",
			"btn-light",
			"btn-outline-dark",
			"btn-outline-light",
		);
		el.classList.toggle("btn-outline-dark", !isDark);
		el.classList.toggle("btn-outline-light", isDark);
	});
}
