import { describe, it, expect } from "vitest";
import {
	isCardAllowed,
	getFilteredCardIndices,
	formatQuestion,
} from "../../src/logic/filters";
import type { Card, GameSettings } from "../../src/types";

describe("Card Filtering & Question Preparation", () => {
	const baseSettings: GameSettings = {
		card: "JLPT",
		kana: "Hiragana",
		roundLength: 20,
		showKanji: false,
		dakuten: true,
		doubledConsonants: true,
		comboKana: true,
		smallVowels: true,
		vowelLength: true,
		font: "system-ui",
		theme: "system",
	};

	it("should allow a card with plain Hiragana under default settings", () => {
		const card: Card = { kanji: "雨", hiragana: "あめ", meaning: "rain" };
		expect(isCardAllowed(card, baseSettings)).toBe(true);
	});

	it("should reject voiced characters when dakuten filter is disabled", () => {
		const card: Card = {
			kanji: "外国",
			hiragana: "がいこく",
			meaning: "foreign country",
		};
		const settings: GameSettings = { ...baseSettings, dakuten: false };
		expect(isCardAllowed(card, settings)).toBe(false);
	});

	it("should reject doubled consonants when doubledConsonants is disabled", () => {
		const card: Card = {
			kanji: "学校",
			hiragana: "がっこう",
			meaning: "school",
		};
		const settings: GameSettings = {
			...baseSettings,
			doubledConsonants: false,
		};
		expect(isCardAllowed(card, settings)).toBe(false);
	});

	it("should reject combo kana when comboKana is disabled", () => {
		const card: Card = {
			kanji: "電車",
			hiragana: "でんしゃ",
			meaning: "train",
		};
		const settings: GameSettings = { ...baseSettings, comboKana: false };
		expect(isCardAllowed(card, settings)).toBe(false);
	});

	it("should reject vowel length marks in Katakana when vowelLength is disabled", () => {
		const card: Card = {
			kanji: "ノート",
			hiragana: "のおと",
			meaning: "notebook",
		};
		const settings: GameSettings = {
			...baseSettings,
			kana: "Katakana",
			vowelLength: false,
		};
		expect(isCardAllowed(card, settings)).toBe(false);
	});

	it("should return valid filtered card indices", () => {
		const deck: Card[] = [
			{ kanji: "雨", hiragana: "あめ", meaning: "rain" },
			{ kanji: "外国", hiragana: "がいこく", meaning: "foreign country" },
			{ kanji: "一", hiragana: "いち", meaning: "one" },
		];
		const settings: GameSettings = { ...baseSettings, dakuten: false };
		const indices = getFilteredCardIndices(deck, settings);
		expect(indices).toEqual([0, 2]);
	});

	it("should preserve authentic kanji okurigana without converting it to katakana", () => {
		const card: Card = {
			kanji: "食べる",
			hiragana: "たべる",
			meaning: "to eat",
		};
		const katakanaSettings: GameSettings = {
			...baseSettings,
			kana: "Katakana",
		};
		const formatted = formatQuestion(card, katakanaSettings);

		expect(formatted.questionKana).toBe("タベル");
		expect(formatted.kanji).toBe("食べる"); // Okurigana 'べる' is preserved authentic Kanji!
	});

	it("should format question for Mixed kana mode", () => {
		const card: Card = {
			kanji: "水",
			hiragana: ["みず"],
			meaning: "water",
		};
		const mixedSettings: GameSettings = {
			...baseSettings,
			kana: "Mixed",
		};
		const formatted = formatQuestion(card, mixedSettings);
		expect(["みず", "ミズ"]).toContain(formatted.questionKana);
		expect(formatted.kanji).toBe("水");
		expect(formatted.selectedReading).toBe("みず");
	});

	it("should format question for default Hiragana kana mode", () => {
		const card: Card = {
			kanji: "山",
			hiragana: "やま",
			meaning: "mountain",
		};
		const hiraganaSettings: GameSettings = {
			...baseSettings,
			kana: "Hiragana",
		};
		const formatted = formatQuestion(card, hiraganaSettings);
		expect(formatted.questionKana).toBe("やま");
		expect(formatted.kanji).toBe("山");
		expect(formatted.selectedReading).toBe("やま");
	});
});
