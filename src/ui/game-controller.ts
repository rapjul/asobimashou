import type { Card, GameSettings, GameState, ReviewItem } from "../types";
import { formatQuestion, getFilteredCardIndices } from "../logic/filters";
import { CardQueue } from "../logic/deduplication";
import { isInputValidPrefix } from "../logic/validation";
import {
	generateSessionCSV,
	formatShareSummary,
	formatTableTSV,
} from "../logic/export";
import { showApostropheToast, showVowelLengthToast, showToast } from "./toasts";
import * as wanakana from "wanakana";

/**
 * Controller managing the main gameplay lifecycle, monotonic timer, review results, and exports.
 */
export class GameController {
	private settings: GameSettings;
	private state: GameState;
	private deck: Card[] = [];
	private cardQueue = new CardQueue(15);
	private timerHandle: number | null = null;
	private gameStartTime: number | null = null;

	/**
	 * Initializes the GameController.
	 *
	 * @param {GameSettings} settings - The active game settings.
	 */
	constructor(settings: GameSettings) {
		this.settings = settings;
		this.state = {
			currentCard: null,
			currentKana: "",
			currentRomaji: [],
			answered: 0,
			skipped: 0,
			timer: 0,
			history: [],
			isRunning: false,
		};
	}

	/**
	 * Loads vocabulary cards for the selected deck on demand.
	 *
	 * @returns {Promise<void>} Resolves when deck is loaded.
	 */
	public async loadDeck(): Promise<void> {
		if (this.settings.card === "JLPT") {
			const mod = await import("../data/jlpt.json");
			this.deck = mod.default as Card[];
		} else {
			const mod = await import("../data/random.json");
			this.deck = mod.default as Card[];
		}
	}

	/**
	 * Starts a new practice session and starts the monotonic timer.
	 *
	 * @returns {Promise<void>}
	 */
	public async startGame(): Promise<void> {
		await this.loadDeck();
		this.cardQueue.clear();

		this.state = {
			currentCard: null,
			currentKana: "",
			currentRomaji: [],
			answered: 0,
			skipped: 0,
			timer: 0,
			history: [],
			isRunning: true,
		};

		if (this.timerHandle) {
			cancelAnimationFrame(this.timerHandle);
			this.timerHandle = null;
		}

		this.gameStartTime = performance.now();
		const timeEl = document.querySelector("#time");

		// Monotonic requestAnimationFrame timer loop
		const tickLoop = () => {
			if (!this.state.isRunning || this.gameStartTime === null) return;
			const elapsed = Math.floor(
				(performance.now() - this.gameStartTime) / 1000,
			);
			if (elapsed !== this.state.timer) {
				this.state.timer = elapsed;
				if (timeEl) {
					timeEl.innerHTML = `${this.state.timer} <i class="bi-clock"></i>`;
				}
			}
			this.timerHandle = requestAnimationFrame(tickLoop);
		};
		this.timerHandle = requestAnimationFrame(tickLoop);

		const reviewTable = document.querySelector("#review-table");
		if (reviewTable) reviewTable.innerHTML = "";

		const startBtn = document.querySelector<HTMLButtonElement>("#start");
		if (startBtn) startBtn.disabled = true;

		document.querySelector("#game")?.classList.remove("d-none");
		document.querySelector("#menu")?.classList.add("slide-up");

		const answerEl = document.querySelector<HTMLInputElement>("#answer");
		if (answerEl) {
			answerEl.value = "";
			answerEl.classList.remove("is-valid", "is-invalid");
			answerEl.focus();
		}

		this.nextQuestion();
	}

	/**
	 * Picks and displays the next vocabulary question.
	 *
	 * @returns {void}
	 */
	public nextQuestion(): void {
		if (this.deck.length === 0) return;

		const allowedIndices = getFilteredCardIndices(this.deck, this.settings);
		const candidateIndices =
			allowedIndices.length > 0
				? allowedIndices
				: Array.from({ length: this.deck.length }, (_, i) => i);

		const chosenIndex = this.cardQueue.selectNext(candidateIndices);
		const card = this.deck[chosenIndex]!;
		this.state.currentCard = card;

		const { questionKana, kanji } = formatQuestion(card, this.settings);
		this.state.currentKana = questionKana;

		const readings = Array.isArray(card.hiragana)
			? card.hiragana
			: [card.hiragana];
		this.state.currentRomaji = readings.map((r) => wanakana.toRomaji(r));

		const questionEl = document.querySelector("#question");
		if (questionEl) {
			questionEl.innerHTML = `${questionKana}<rt>${
				this.settings.showKanji ? kanji : ""
			}</rt>`;
		}

		const questionIdEl =
			document.querySelector<HTMLInputElement>("#question-id");
		if (questionIdEl) {
			questionIdEl.value = chosenIndex.toString();
		}

		const answerEl = document.querySelector<HTMLInputElement>("#answer");
		if (answerEl) {
			answerEl.value = "";
			answerEl.classList.remove("is-invalid");
		}

		this.updateScoreDisplay();
	}

	/**
	 * Updates the in-game score counters.
	 *
	 * @returns {void}
	 */
	private updateScoreDisplay(): void {
		const scoreEl = document.querySelector("#score");
		if (scoreEl) {
			scoreEl.innerHTML = `<i class="bi-check-circle"></i> ${this.state.answered}/${
				this.state.answered + this.state.skipped
			}`;
		}
	}

	/**
	 * Records the current card as skipped.
	 *
	 * @returns {void}
	 */
	public skipQuestion(): void {
		if (!this.state.currentCard) return;

		const item: ReviewItem = {
			kanji: this.state.currentCard.kanji,
			kana: this.state.currentKana,
			romaji: this.state.currentRomaji[0] || "",
			userAnswer: "",
			meaning: this.state.currentCard.meaning,
			isCorrect: false,
			isSkipped: true,
		};
		this.state.history.push(item);
		this.state.skipped++;

		this.advanceOrFinish();
	}

	/**
	 * Validates user input upon keyup and handles completion or hints.
	 *
	 * @param {string} input - User typed input text.
	 * @returns {void}
	 */
	public handleInput(input: string): void {
		if (!this.state.currentCard) return;

		if (input.includes(" ")) {
			this.skipQuestion();
			return;
		}

		const answerEl = document.querySelector<HTMLInputElement>("#answer");
		const options = { customKanaMapping: { dzu: "づ" } };
		const qHiragana = wanakana.toHiragana(this.state.currentKana, options);
		const aHiragana = wanakana.toHiragana(input, options);

		if (isInputValidPrefix(input, this.state.currentKana)) {
			answerEl?.classList.remove("is-invalid");
		} else {
			answerEl?.classList.remove("is-invalid");
			if (answerEl) void answerEl.offsetHeight; // reflow to trigger shake animation
			answerEl?.classList.add("is-invalid");
		}

		if (qHiragana !== aHiragana) {
			// Vowel length toasts
			if (
				input.includes("-") ||
				input.includes("ー") ||
				aHiragana.includes("ー")
			) {
				showVowelLengthToast();
				return;
			}
			const cardHasVowel =
				this.state.currentCard.kanji.includes("ー") ||
				this.state.currentKana.includes("ー");
			if (
				cardHasVowel &&
				!isInputValidPrefix(input, this.state.currentKana)
			) {
				showVowelLengthToast();
				return;
			}

			// Romaji apostrophe toast
			const romajiTarget = wanakana.toRomaji(qHiragana);
			if (romajiTarget.includes("'")) {
				const cleanTyped = input.toLowerCase().replace(/['’‘]/g, "");
				const cleanTarget = romajiTarget
					.toLowerCase()
					.replace(/['’‘]/g, "");
				if (cleanTyped === cleanTarget) {
					showApostropheToast(romajiTarget, qHiragana);
					this.recordAnswer(input, true);
				}
			}
			return;
		}

		// Correct answer entered
		this.recordAnswer(input, true);
	}

	/**
	 * Records answered card and updates review history.
	 *
	 * @param {string} answer - Typed answer.
	 * @param {boolean} isCorrect - Whether answer was correct.
	 * @returns {void}
	 */
	private recordAnswer(answer: string, isCorrect: boolean): void {
		if (!this.state.currentCard) return;

		const item: ReviewItem = {
			kanji: this.state.currentCard.kanji,
			kana: this.state.currentKana,
			romaji: this.state.currentRomaji[0] || "",
			userAnswer: answer,
			meaning: this.state.currentCard.meaning,
			isCorrect,
			isSkipped: false,
		};
		this.state.history.push(item);
		this.state.answered++;

		const answerEl = document.querySelector<HTMLInputElement>("#answer");
		if (answerEl) {
			answerEl.classList.add("is-valid");
			setTimeout(() => {
				answerEl.classList.remove("is-valid");
			}, 250);
		}

		this.advanceOrFinish();
	}

	/**
	 * Advances to another question or finishes a round at its configured length.
	 *
	 * @returns {void}
	 */
	private advanceOrFinish(): void {
		const total = this.state.answered + this.state.skipped;
		if (
			this.settings.roundLength !== null &&
			total >= this.settings.roundLength
		) {
			this.stopGame();
			return;
		}
		this.nextQuestion();
	}

	/**
	 * Stops the active round, pauses the timer, and generates the review screen.
	 *
	 * @returns {void}
	 */
	public stopGame(): void {
		this.state.isRunning = false;
		if (this.timerHandle) {
			cancelAnimationFrame(this.timerHandle);
			this.timerHandle = null;
		}

		const total = this.state.answered + this.state.skipped;
		const average = total > 0 ? this.state.timer / total : 0;

		const statsAnswered = document.querySelector("#stats-answered");
		const statsSkipped = document.querySelector("#stats-skipped");
		const statsTimer = document.querySelector("#stats-timer");
		const statsAverage = document.querySelector("#stats-average");

		if (statsAnswered)
			statsAnswered.textContent = this.state.answered.toString();
		if (statsSkipped)
			statsSkipped.textContent = this.state.skipped.toString();
		if (statsTimer) statsTimer.textContent = `${this.state.timer} s`;
		if (statsAverage) {
			statsAverage.textContent =
				total > 0 ? `${average.toFixed(2)} s/card` : "N/A";
		}

		this.populateReviewTable();

		const result = document.querySelector("#result");
		if (result) {
			result.classList.remove("d-none");
			void (result as HTMLElement).offsetHeight;
			result.classList.add("slide-in");
		}
		document.querySelector("#game")?.classList.add("d-none");
	}

	/**
	 * Populates the HTML review table with completed cards and secure Jisho links.
	 *
	 * @returns {void}
	 */
	private populateReviewTable(): void {
		const table = document.querySelector("#review-table");
		if (!table) return;

		table.innerHTML = "";
		for (const item of this.state.history) {
			const statusIcon = item.isCorrect
				? '<i class="bi-check-lg text-success"></i>'
				: '<i class="bi-x-lg text-danger"></i>';
			const jisho = `https://jisho.org/word/${encodeURIComponent(item.kanji)}`;
			const row = document.createElement("tr");
			row.innerHTML = `
        <th>${statusIcon} <a href="${jisho}" target="_blank" rel="noopener noreferrer">${item.kana}</a></th>
        <td class="${item.isCorrect ? "text-success" : "text-danger"}">${item.romaji}</td>
        <td>${item.meaning}</td>
      `;
			table.appendChild(row);
		}
	}

	/**
	 * Exports the session history as a downloadable CSV file.
	 *
	 * @returns {void}
	 */
	public exportCSV(): void {
		const csvContent = generateSessionCSV(this.state);
		const blob = new Blob([csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `asobimashou-results-${Date.now()}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	/**
	 * Shares the session results using the Web Share API or falls back to clipboard.
	 *
	 * @returns {Promise<void>}
	 */
	public async shareResults(): Promise<void> {
		const shareText = formatShareSummary(this.state);
		if (navigator.share) {
			try {
				await navigator.share({
					title: "Asobimashou Results",
					text: shareText,
				});
				return;
			} catch {
				// User cancelled share, fallback to clipboard
			}
		}

		try {
			await navigator.clipboard.writeText(shareText);
			showToast(
				'<i class="bi-check-circle text-success"></i> Copied to clipboard!',
				"toast-share",
			);
		} catch {
			// Clipboard write failed
		}
	}

	/**
	 * Copies the review table rows as TSV for spreadsheet pasting.
	 *
	 * @returns {Promise<void>}
	 */
	public async copyTable(): Promise<void> {
		const tsv = formatTableTSV(this.state.history);
		try {
			await navigator.clipboard.writeText(tsv);
			showToast(
				'<i class="bi-table text-success"></i> Table copied to clipboard!',
				"toast-copy",
			);
		} catch {
			// Fallback
		}
	}

	/**
	 * Resets session to home screen.
	 *
	 * @returns {void}
	 */
	public restart(): void {
		document.querySelector("#menu")?.classList.remove("slide-up");
		const result = document.querySelector("#result");
		if (result) {
			result.classList.remove("slide-in");
			result.addEventListener(
				"transitionend",
				() => {
					result.classList.add("d-none");
					const startBtn =
						document.querySelector<HTMLButtonElement>("#start");
					if (startBtn) startBtn.disabled = false;
				},
				{ once: true },
			);
		}
	}
}
