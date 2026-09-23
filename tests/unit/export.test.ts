import { describe, it, expect } from "vitest";
import {
	escapeCSVField,
	generateSessionCSV,
	formatShareSummary,
	formatTableTSV,
} from "@/logic/export";
import type { GameState, ReviewItem } from "@/types";

describe("CSV Export & Share Text Formatting", () => {
	it("should escape commas and quotes properly per RFC 4180", () => {
		expect(escapeCSVField("simple")).toBe("simple");
		expect(escapeCSVField("hello, world")).toBe('"hello, world"');
		expect(escapeCSVField('quote "test"')).toBe('"quote ""test"""');
	});

	it("should put headers first and export eight columns per card", () => {
		const history: ReviewItem[] = [
			{
				kanji: "駅",
				kana: "えき",
				romaji: "eki",
				userAnswer: "eki",
				meaning: "station",
				isCorrect: true,
				isSkipped: false,
				responseTimeMs: 1250,
			},
			{
				kanji: "雨",
				kana: "あめ",
				romaji: "ame",
				userAnswer: "",
				meaning: "rain, shower",
				isCorrect: false,
				isSkipped: true,
				responseTimeMs: 4321,
			},
			{
				kanji: "今日",
				kana: "きょうー",
				romaji: "kyouu",
				userAnswer: "kyouu",
				meaning: "today",
				isCorrect: true,
				isSkipped: false,
				responseTimeMs: 4000,
			},
		];

		const state: GameState = {
			currentCard: null,
			currentKana: "",
			currentRomaji: [],
			answered: 2,
			skipped: 1,
			timer: 10,
			history,
			isRunning: false,
		};

		const csv = generateSessionCSV(state);
		const [header, correct, skipped, smallKanaAndLongVowel] =
			csv.split("\r\n");
		expect(header).toBe(
			"Status,Kanji,Kana,Romaji,Your Answer,Meaning,Response Time (s),Seconds per Kana Character",
		);
		expect(correct).toBe("Correct,駅,えき,eki,eki,station,1.25,0.63");
		expect(skipped).toBe('Skipped,雨,あめ,ame,,"rain, shower",4.32,');
		expect(smallKanaAndLongVowel).toBe(
			"Correct,今日,きょうー,kyouu,kyouu,today,4.00,1.00",
		);
		expect(csv.split("\r\n")).toHaveLength(4);
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
		expect(csv).toBe(
			"Status,Kanji,Kana,Romaji,Your Answer,Meaning,Response Time (s),Seconds per Kana Character",
		);

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
				responseTimeMs: 2500,
			},
		];

		const tsv = formatTableTSV(history);
		expect(tsv).toBe(
			"Status\tKanji\tKana\tRomaji\tYour Answer\tMeaning\nCorrect\t駅\tえき\teki\teki\tstation",
		);
	});

	it("should prevent formulas and embedded separators in spreadsheet exports", () => {
		const riskyMeanings = [
			"=1+1",
			"+SUM(A1:A2)",
			'-ian, "Italian"',
			"@SUM(A1:A2)",
			"\t=1+1",
			"\r=1+1",
			"\n=1+1",
			"＝1+1",
		];
		const history: ReviewItem[] = riskyMeanings.map((meaning) => ({
			kanji: "駅",
			kana: "えき",
			romaji: "eki",
			userAnswer: "eki",
			meaning,
			isCorrect: true,
			isSkipped: false,
			responseTimeMs: 0,
		}));
		const state: GameState = {
			currentCard: null,
			currentKana: "",
			currentRomaji: [],
			answered: history.length,
			skipped: 0,
			timer: 0,
			history,
			isRunning: false,
		};

		const csv = generateSessionCSV(state);
		for (const meaning of riskyMeanings) {
			expect(csv).toContain(`"\t${meaning.replace(/"/g, '""')}"`);
		}
		const embeddedTab = generateSessionCSV({
			...state,
			history: [{ ...history[0]!, meaning: "left\tright" }],
			answered: 1,
		});
		expect(embeddedTab).toContain('"left\tright"');

		const tsv = formatTableTSV(history);
		expect(tsv).toContain("' =1+1");
		expect(tsv).toContain('\'-ian, "Italian"');
		for (const meaning of riskyMeanings) {
			const singleLineMeaning = meaning.replace(/[\t\r\n]/g, " ");
			expect(tsv).toContain(`eki\teki\t'${singleLineMeaning}`);
		}
		expect(tsv).not.toContain("\t\t=1+1");
		expect(tsv).not.toContain("\r");
		expect(tsv).not.toContain("\n=1+1");
	});
});
