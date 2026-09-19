import { describe, it, expect } from "vitest";
import jlptData from "../../src/data/jlpt.json";
import randomData from "../../src/data/random.json";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

	it("should match exactly with cards from the original cards.js file if present", () => {
		const originalCardsPath = path.resolve(
			__dirname,
			"../../assets/js/cards.js",
		);
		if (fs.existsSync(originalCardsPath)) {
			const content = fs.readFileSync(originalCardsPath, "utf-8");
			const match = content.match(/const cards = ({[\s\S]*});/);
			if (match && match[1]) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, no-eval
				const originalCards = eval(`(${match[1]})`);
				expect(jlptData).toEqual(originalCards.JLPT);
				expect(randomData).toEqual(originalCards.Random);
			}
		}
	});
});
