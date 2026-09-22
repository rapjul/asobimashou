/**
 * Supported finite round lengths.
 */
export const ROUND_LENGTHS = [10, 20, 50, 100, 150, 200, 250] as const;

/**
 * A supported finite round length or null for an unlimited round.
 */
export type RoundLength = (typeof ROUND_LENGTHS)[number] | null;

/**
 * Font choices presented in the options panel.
 */
export const FONT_OPTIONS = [
	{ value: "system-ui", label: "System Sans-Serif" },
	{ value: "serif", label: "System Serif" },
	{ value: "Klee One", label: "Klee One" },
	{ value: "Noto Sans JP", label: "Noto Sans JP" },
	{ value: "Noto Serif JP", label: "Noto Serif JP" },
	{ value: "Yuji Syuku", label: "Yuji Syuku" },
] as const;

/**
 * Supported font family names.
 */
export type FontFamily = (typeof FONT_OPTIONS)[number]["value"];
