import { describe, it, expect } from "vitest";
import {
	escapeCSVField,
	generateSessionCSV,
	formatShareSummary,
	formatTableTSV,
} from "../../src/logic/export";
import type { GameState, ReviewItem } from "../../src/types";

describe("CSV Export & Share Text Formatting", () => {
	it("should escape commas and quotes properly per RFC 4180", () => {
		expect(escapeCSVField("simple")).toBe("simple");
		expect(escapeCSVField("hello, world")).toBe('"hello, world"');
		expect(escapeCSVField('quote "test"')).toBe('"quote ""test"""');
	});

	it("should generate valid CSV structure with header metadata and rows", () => {
		const history: ReviewItem[] = [
			{
				kanji: "駅",
				kana: "えき",
				romaji: "eki",
				userAnswer: "eki",
				meaning: "station",
				isCorrect: true,
				isSkipped: false,
			},
			{
				kanji: "雨",
				kana: "あめ",
				romaji: "ame",
				userAnswer: "",
				meaning: "rain, shower",
				isCorrect: false,
				isSkipped: true,
			},
		];

		const state: GameState = {
			currentCard: null,
			currentKana: "",
			currentRomaji: [],
			answered: 1,
			skipped: 1,
			timer: 10,
			history,
			isRunning: false,
		};

		const csv = generateSessionCSV(state);
		expect(csv).toContain("# Total Cards,2");
		expect(csv).toContain("# Accuracy,50.0%");
		expect(csv).toContain("Status,Kanji,Kana,Romaji,Your Answer,Meaning");
		expect(csv).toContain("Correct,駅,えき,eki,eki,station");
		expect(csv).toContain('Skipped,雨,あめ,ame,,"rain, shower"');
	});

	it("should guard against division by zero when session is stopped immediately with 0 cards", () => {
		const emptyState: GameState = {
			currentCard: null,
			currentKana: "",
			currentRomaji: [],
			answered: 0,
			skipped: 0,
			timer: 0,
			history: [],
			isRunning: false,
		};

		const csv = generateSessionCSV(emptyState);
		expect(csv).not.toContain("NaN");
		expect(csv).not.toContain("Infinity");
		expect(csv).toContain("# Average Pace,0.00s/card");

		const share = formatShareSummary(emptyState);
		expect(share).not.toContain("NaN");
		expect(share).not.toContain("Infinity");
		expect(share).toContain("Score: 0/0 (0%)");
	});

	it("should format table data as TSV for clipboard copy", () => {
		const history: ReviewItem[] = [
			{
				kanji: "駅",
				kana: "えき",
				romaji: "eki",
				userAnswer: "eki",
				meaning: "station",
				isCorrect: true,
				isSkipped: false,
			},
		];

		const tsv = formatTableTSV(history);
		expect(tsv).toBe(
			"Status\tKanji\tKana\tRomaji\tYour Answer\tMeaning\nCorrect\t駅\tえき\teki\teki\tstation",
		);
	});
});
