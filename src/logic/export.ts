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
			escapeCSVField(status),
			escapeCSVField(item.kanji),
			escapeCSVField(item.kana),
			escapeCSVField(item.romaji),
			escapeCSVField(item.userAnswer),
			escapeCSVField(item.meaning),
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
		return `${status}\t${item.kanji}\t${item.kana}\t${item.romaji}\t${item.userAnswer}\t${item.meaning}`;
	});
	return [header, ...rows].join("\n");
}
