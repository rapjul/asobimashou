import type { Card, GameSettings } from "../types";
import * as wanakana from "wanakana";

/**
 * Regular expression matching all Hiragana and Katakana Dakuten and Handakuten (voiced) characters.
 */
export const DAKUTEN_REGEX: RegExp =
	/[ばぶびべぼがぎぐげござじずぜぞだぢづでどぱぴぷぺぽゔガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポヴ]/;

/**
 * Regular expression matching doubled consonant markers (sokuon, small tsu).
 */
export const TSU_REGEX: RegExp = /[っッ]/;

/**
 * Regular expression matching combination kana (youon, small ya/yu/yo).
 */
export const COMBO_REGEX: RegExp = /[ゃゅょャュョ]/;

/**
 * Regular expression matching small vowel characters.
 */
export const SMALL_VOWEL_REGEX: RegExp = /[ぁぃぅぇぉァィゥェォ]/;

/**
 * Evaluates whether a vocabulary card satisfies the configured phonetic filters.
 *
 * @param {Card} card - The card to inspect.
 * @param {GameSettings} settings - Active gameplay settings.
 * @returns {boolean} True if the card passes all enabled filters.
 */
export function isCardAllowed(card: Card, settings: GameSettings): boolean {
	const h: string = Array.isArray(card.hiragana)
		? card.hiragana.join("")
		: card.hiragana;
	const k: string = card.kanji || "";

	if (!settings.dakuten && (DAKUTEN_REGEX.test(h) || DAKUTEN_REGEX.test(k))) {
		return false;
	}
	if (
		!settings.doubledConsonants &&
		(TSU_REGEX.test(h) || TSU_REGEX.test(k))
	) {
		return false;
	}
	if (!settings.comboKana && (COMBO_REGEX.test(h) || COMBO_REGEX.test(k))) {
		return false;
	}
	if (
		settings.kana !== "Hiragana" &&
		!settings.smallVowels &&
		(SMALL_VOWEL_REGEX.test(h) || SMALL_VOWEL_REGEX.test(k))
	) {
		return false;
	}
	if (
		settings.kana !== "Hiragana" &&
		!settings.vowelLength &&
		(h.includes("ー") || k.includes("ー"))
	) {
		return false;
	}

	return true;
}

/**
 * Filter a full deck of cards down to indices that satisfy the active settings.
 *
 * @param {Card[]} deck - The full list of cards.
 * @param {GameSettings} settings - Active gameplay settings.
 * @returns {number[]} Array of indices of allowed cards.
 */
export function getFilteredCardIndices(
	deck: Card[],
	settings: GameSettings,
): number[] {
	const allowed: number[] = [];
	for (let i = 0; i < deck.length; i++) {
		const card = deck[i];
		if (card && isCardAllowed(card, settings)) {
			allowed.push(i);
		}
	}
	return allowed;
}

/**
 * Format the question display reading and preserved authentic kanji for a given card.
 * Authentic kanji okurigana is preserved (not converted to katakana).
 *
 * @param {Card} card - The selected flashcard.
 * @param {GameSettings} settings - Active gameplay settings.
 * @returns {{ questionKana: string; kanji: string; selectedReading: string }} The question data.
 */
export function formatQuestion(
	card: Card,
	settings: GameSettings,
): { questionKana: string; kanji: string; selectedReading: string } {
	const readings: string[] = Array.isArray(card.hiragana)
		? card.hiragana
		: [card.hiragana];
	const selectedReading: string =
		readings[Math.floor(Math.random() * readings.length)] ||
		readings[0] ||
		"";

	let questionKana = selectedReading;
	const kanji = card.kanji; // Authentic kanji preserved intact

	if (settings.kana === "Katakana") {
		questionKana = wanakana.toKatakana(selectedReading);
	} else if (settings.kana === "Mixed") {
		const useKatakana = Math.random() < 0.5;
		questionKana = useKatakana
			? wanakana.toKatakana(selectedReading)
			: selectedReading;
	}

	return {
		questionKana,
		kanji,
		selectedReading,
	};
}
