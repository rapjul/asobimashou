import { describe, it, expect } from "vitest";
import {
	generateRomajiSpellings,
	isInputValidAnswer,
	isInputValidPrefix,
} from "@/logic/validation";

describe("Romaji Validation & Spelling Generation", () => {
	it("should generate standard and alternative spellings for combination sounds", () => {
		const spellings = generateRomajiSpellings("しゃ");
		expect(spellings).toContain("sha");
		expect(spellings).toContain("sya");
	});

	it("should handle doubled consonants (tsu) properly", () => {
		const spellings = generateRomajiSpellings("がっこう");
		expect(spellings).toContain("gakkou");
	});

	it("should handle vowel lengthening mark (ー)", () => {
		const spellings = generateRomajiSpellings("ノート");
		expect(spellings).toContain("nooto");
		expect(isInputValidAnswer("nooto", "ノート")).toBe(true);
		expect(isInputValidAnswer("no-to", "ノート")).toBe(false);
	});

	it("should accept complete alternate readings and Kana answers", () => {
		expect(isInputValidAnswer("shi", "し")).toBe(true);
		expect(isInputValidAnswer("si", "し")).toBe(true);
		expect(isInputValidAnswer("し", "し")).toBe(true);
		expect(isInputValidAnswer("tenin", "てんいん")).toBe(true);
		expect(isInputValidAnswer("ten'in", "てんいん")).toBe(true);
	});

	it("requires a clear ん spelling before n-row Kana", () => {
		expect(isInputValidAnswer("ona", "おんな")).toBe(false);
		expect(isInputValidAnswer("onna", "おんな")).toBe(true);
		expect(isInputValidAnswer("on'na", "おんな")).toBe(true);
		expect(isInputValidAnswer("tenin", "てんいん")).toBe(true);
	});

	it("should recognize valid prefixes as true", () => {
		expect(isInputValidPrefix("g", "がっこう")).toBe(true);
		expect(isInputValidPrefix("gak", "がっこう")).toBe(true);
		expect(isInputValidPrefix("gakko", "がっこう")).toBe(true);
		expect(isInputValidPrefix("gakkou", "がっこう")).toBe(true);
	});

	it("should recognize invalid prefixes as false", () => {
		expect(isInputValidPrefix("x", "がっこう")).toBe(false);
		expect(isInputValidPrefix("gat", "がっこう")).toBe(false);
	});

	it("should handle dzu mapping for づ", () => {
		expect(isInputValidPrefix("dz", "づ")).toBe(true);
		expect(isInputValidPrefix("dzu", "づ")).toBe(true);
	});
});
