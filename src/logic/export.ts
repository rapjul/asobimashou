import type { CSVRecordRow, GameState, ReviewItem } from "../types";

/**
 * Escapes a string field according to RFC 4180 CSV specifications.
 *
 * @param {string} field - The text value to escape.
 * @returns {string} The RFC 4180 escaped string.
 */
export function escapeCSVField(field: string): string {
	if (
		field.includes(",") ||
		field.includes('"') ||
		field.includes("\n") ||
		field.includes("\r")
	) {
		return `"${field.replace(/"/g, '""')}"`;
	}
	return field;
}

/**
 * Protects spreadsheet CSV cells from being interpreted as formulas.
 *
 * @param {string} field - The text value to serialize.
 * @returns {string} An RFC 4180 escaped cell with a spreadsheet text prefix when needed.
 */
function escapeSpreadsheetCSVField(field: string): string {
	const startsWithFormula = /^\s*[=+\-@＝＋－＠]/u.test(field);
	const startsWithControl = /^[\t\r\n]/u.test(field);
	const protectedCell = startsWithFormula || startsWithControl;
	const value = protectedCell ? `\t${field}` : field;
	const escaped = value.replace(/"/g, '""');
	if (
		protectedCell ||
		value.includes(",") ||
		value.includes('"') ||
		value.includes("\t") ||
		value.includes("\n") ||
		value.includes("\r")
	) {
		return `"${escaped}"`;
	}
	return escaped;
}

/**
 * Protects a tab-separated cell from formula interpretation and structural separators.
 *
 * @param {string} field - The text value to serialize.
 * @returns {string} A spreadsheet text value with embedded row and column separators neutralized.
 */
function escapeSpreadsheetTSVField(field: string): string {
	const value = field.replace(/[\t\r\n]/g, " ");
	return /^\s*[=+\-@＝＋－＠]/u.test(value) ? `'${value}` : value;
}

/**
 * Generates an RFC 4180 compliant CSV string representing the session summary and card history.
 *
 * @param {GameState} state - The final state of the game session.
 * @returns {string} Fully formatted CSV document string.
 */
export function generateSessionCSV(state: GameState): string {
	const total = state.answered + state.skipped;
	const average = total > 0 ? (state.timer / total).toFixed(2) : "0.00";
	const accuracy =
		total > 0 ? ((state.answered / total) * 100).toFixed(1) : "0.0";

	const lines: string[] = [
		"# Asobimashou Practice Session Results",
		`# Total Cards,${total}`,
		`# Answered,${state.answered}`,
		`# Skipped,${state.skipped}`,
		`# Accuracy,${accuracy}%`,
		`# Time Elapsed,${state.timer}s`,
		`# Average Pace,${average}s/card`,
		"",
		"Status,Kanji,Kana,Romaji,Your Answer,Meaning",
	];

	for (const item of state.history) {
		const status = item.isCorrect ? "Correct" : "Skipped";
		const row: CSVRecordRow = [
			escapeSpreadsheetCSVField(status),
			escapeSpreadsheetCSVField(item.kanji),
			escapeSpreadsheetCSVField(item.kana),
			escapeSpreadsheetCSVField(item.romaji),
			escapeSpreadsheetCSVField(item.userAnswer),
			escapeSpreadsheetCSVField(item.meaning),
		];
		lines.push(row.join(","));
	}

	return lines.join("\r\n");
}

/**
 * Formats a shareable text summary for clipboard copying or Web Share API.
 * Safely guards against division by zero.
 *
 * @param {GameState} state - The active game state.
 * @returns {string} The text payload to share.
 */
export function formatShareSummary(state: GameState): string {
	const total = state.answered + state.skipped;
	const average = total > 0 ? (state.timer / total).toFixed(2) : "0.00";
	const accuracy = total > 0 ? Math.round((state.answered / total) * 100) : 0;

	return [
		`🎌 Asobimashou! Japanese Kana Practice`,
		`Score: ${state.answered}/${total} (${accuracy}%)`,
		`Time: ${state.timer}s (${average}s/card)`,
		`Practice Kana: https://rapjul.github.io/asobimashou/`,
	].join("\n");
}

/**
 * Formats the review table rows into tab-separated values for spreadsheet clipboard copying.
 *
 * @param {ReviewItem[]} history - The list of review records.
 * @returns {string} Tab-separated table data.
 */
export function formatTableTSV(history: ReviewItem[]): string {
	const header = "Status\tKanji\tKana\tRomaji\tYour Answer\tMeaning";
	const rows = history.map((item) => {
		const status = item.isCorrect ? "Correct" : "Skipped";
		return [
			status,
			item.kanji,
			item.kana,
			item.romaji,
			item.userAnswer,
			item.meaning,
		]
			.map(escapeSpreadsheetTSVField)
			.join("\t");
	});
	return [header, ...rows].join("\n");
}
