import type { CSVRecordRow, GameState, ReviewItem } from "../types";

/** Small Kana that combine with a preceding full-size Kana into one mora. */
const SMALL_COMBINING_KANA = new Set("ゃゅょぁぃぅぇぉャュョァィゥェォ");

/**
 * Counts mora in a normalized Japanese Kana reading.
 *
 * @param {string} kana - Kana reading to count.
 * @returns {number} Number of mora, including standalone small Kana.
 */
function countKanaMora(kana: string): number {
	let count = 0;
	let previousKanaCanCombine = false;
	for (const character of Array.from(kana.normalize("NFC"))) {
		if (previousKanaCanCombine && SMALL_COMBINING_KANA.has(character)) {
			previousKanaCanCombine = false;
			continue;
		}
		count++;
		previousKanaCanCombine =
			/^[\u3041-\u3096\u30a1-\u30fa]$/u.test(character) &&
			!SMALL_COMBINING_KANA.has(character) &&
			!"っんッン".includes(character);
	}
	return count;
}

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
 * Generates an RFC 4180 compliant CSV card table with a header-first layout.
 *
 * @param {GameState} state - The final state of the game session.
 * @returns {string} Fully formatted CSV document string.
 */
export function generateSessionCSV(state: GameState): string {
	const lines: string[] = [
		"Status,Kanji,Kana,Romaji,Your Answer,Meaning,Response Time (s),Seconds per Mora",
	];

	for (const item of state.history) {
		const status = item.isCorrect ? "Correct" : "Skipped";
		const responseTimeSeconds = item.responseTimeMs / 1000;
		const moraCount = countKanaMora(item.kana);
		const secondsPerMora =
			item.isSkipped || moraCount === 0
				? ""
				: (responseTimeSeconds / moraCount).toFixed(2);
		const row: CSVRecordRow = [
			escapeSpreadsheetCSVField(status),
			escapeSpreadsheetCSVField(item.kanji),
			escapeSpreadsheetCSVField(item.kana),
			escapeSpreadsheetCSVField(item.romaji),
			escapeSpreadsheetCSVField(item.userAnswer),
			escapeSpreadsheetCSVField(item.meaning),
			escapeSpreadsheetCSVField(responseTimeSeconds.toFixed(2)),
			escapeSpreadsheetCSVField(secondsPerMora),
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
