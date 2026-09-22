import type { Card, DeckType, KanaType } from "./card";
import type { FontFamily, RoundLength } from "../constants/game-options";

/**
 * Filter and gameplay configuration options saved by the player.
 */
export interface GameSettings {
	/**
	 * Chosen card source (e.g. JLPT or Random).
	 */
	card: DeckType;

	/**
	 * Chosen Kana script mode.
	 */
	kana: KanaType;

	/**
	 * Number of cards in a round, or null for an unlimited round.
	 */
	roundLength: RoundLength;

	/**
	 * Whether to display the card's Kanji as ruby text above the Kana.
	 */
	showKanji: boolean;

	/**
	 * Whether to include Dakuten and Handakuten (voiced) characters.
	 */
	dakuten: boolean;

	/**
	 * Whether to include doubled consonants (sokuon, small tsu).
	 */
	doubledConsonants: boolean;

	/**
	 * Whether to include combination kana (youon, small ya/yu/yo).
	 */
	comboKana: boolean;

	/**
	 * Whether to include small vowels (e.g. small a/i/u/e/o).
	 */
	smallVowels: boolean;

	/**
	 * Whether to include vowel lengthening marks (chouonpu, 'ー').
	 */
	vowelLength: boolean;

	/**
	 * Currently active font family name.
	 */
	font: FontFamily;

	/**
	 * Theme mode preference: 'system', 'dark', or 'light'.
	 */
	theme: "system" | "dark" | "light";
}

/**
 * Record of a card answered or skipped during a game session.
 */
export interface ReviewItem {
	/**
	 * Kanji expression of the flashcard.
	 */
	kanji: string;

	/**
	 * Kana reading presented to the player.
	 */
	kana: string;

	/**
	 * Accepted Romaji reading.
	 */
	romaji: string;

	/**
	 * The user's typed input.
	 */
	userAnswer: string;

	/**
	 * English definition of the card.
	 */
	meaning: string;

	/**
	 * Whether the card was answered correctly without skipping.
	 */
	isCorrect: boolean;

	/**
	 * Whether the user skipped this card.
	 */
	isSkipped: boolean;
}

/**
 * Tuple row representation of an exported CSV line for a review record:
 * [Status, Kanji, Kana, Romaji, UserAnswer, Meaning]
 */
export type CSVRecordRow = [
	status: string,
	kanji: string,
	kana: string,
	romaji: string,
	userAnswer: string,
	meaning: string,
];

/**
 * Runtime game state tracking session progress and timer.
 */
export interface GameState {
	/**
	 * Currently active flashcard.
	 */
	currentCard: Card | null;

	/**
	 * Current question target kana reading.
	 */
	currentKana: string;

	/**
	 * Current question target romaji answers.
	 */
	currentRomaji: string[];

	/**
	 * Number of correctly answered cards.
	 */
	answered: number;

	/**
	 * Number of skipped cards.
	 */
	skipped: number;

	/**
	 * Total elapsed time in seconds.
	 */
	timer: number;

	/**
	 * History log of all cards completed or skipped this session.
	 */
	history: ReviewItem[];

	/**
	 * Whether the game loop is currently running.
	 */
	isRunning: boolean;
}
