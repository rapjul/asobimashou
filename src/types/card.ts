/**
 * Represents a single vocabulary flashcard in the game.
 */
export interface Card {
	/**
	 * Authentic Kanji representation (or Kana representation if no Kanji).
	 */
	kanji: string;

	/**
	 * Reading in Hiragana. Can be a single string or an array of alternative readings.
	 */
	hiragana: string | string[];

	/**
	 * English meaning and definition for the vocabulary card.
	 */
	meaning: string;
}

/**
 * Deck source category selected by the player.
 */
export type DeckType = "JLPT" | "Random";

/**
 * Japanese script target mode selected by the player.
 */
export type KanaType = "Hiragana" | "Katakana" | "Mixed";
