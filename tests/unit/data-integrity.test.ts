import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import jlptData from "../../src/data/jlpt.json";
import randomData from "../../src/data/random.json";
import * as wanakana from "wanakana";
import {
	CUSTOM_ROMAJI_MAPPING,
	isInputValidAnswer,
} from "../../src/logic/validation";

describe("Vocabulary Data Parity & Schema Integrity", () => {
	it("should contain the exact count of JLPT (607) and Random (13803) items totaling 14410", () => {
		expect(jlptData.length).toBe(607);
		expect(randomData.length).toBe(13803);
		expect(jlptData.length + randomData.length).toBe(14410);
	});

	it("should validate that every JLPT card has valid non-empty fields", () => {
		for (const card of jlptData) {
			expect(typeof card.kanji).toBe("string");
			expect(card.kanji.length).toBeGreaterThan(0);
			expect(Array.isArray(card.hiragana)).toBe(true);
			expect(card.hiragana.length).toBeGreaterThan(0);
			for (const h of card.hiragana) {
				expect(typeof h).toBe("string");
				expect(h.length).toBeGreaterThan(0);
			}
			expect(typeof card.meaning).toBe("string");
			expect(card.meaning.length).toBeGreaterThan(0);
		}
	});

	it("should validate that every Random card has valid non-empty fields", () => {
		for (const card of randomData) {
			expect(typeof card.kanji).toBe("string");
			expect(card.kanji.length).toBeGreaterThan(0);
			expect(typeof card.hiragana).toBe("string");
			expect(card.hiragana.length).toBeGreaterThan(0);
			expect(typeof card.meaning).toBe("string");
			expect(card.meaning.length).toBeGreaterThan(0);
		}
	});

	it("should preserve the original deck contents", () => {
		const digest = (data: unknown): string =>
			createHash("sha256").update(JSON.stringify(data)).digest("hex");

		expect(digest(jlptData)).toBe(
			"0e683e3b27598e8d5447c63d0b785926cf8317173174916fb0d00f687b7ef718",
		);
		expect(digest(randomData)).toBe(
			"9208c695245e7afcc70dbba761d7632aa4eb4113307a2b45669515199a6e1738",
		);
	});

	it("should accept the canonical Romaji displayed for every deck reading", () => {
		const mismatches: string[] = [];
		for (const [deckName, deck] of [
			["JLPT", jlptData],
			["Random", randomData],
		] as const) {
			for (const card of deck) {
				const readings = Array.isArray(card.hiragana)
					? card.hiragana
					: [card.hiragana];
				for (const reading of readings) {
					const canonical = wanakana.toRomaji(reading, {
						customRomajiMapping: CUSTOM_ROMAJI_MAPPING,
					});
					if (!isInputValidAnswer(canonical, reading)) {
						mismatches.push(
							`${deckName}: ${reading} → ${canonical}`,
						);
					}
				}
			}
		}
		expect(mismatches).toEqual([]);
	});
});
