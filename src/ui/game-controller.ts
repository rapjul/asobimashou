import type { Card, GameSettings, GameState, ReviewItem } from "../types";
import { formatQuestion, getFilteredCardIndices } from "../logic/filters";
import { CardQueue } from "../logic/deduplication";
import {
	isInputValidAnswer,
	isInputValidPrefix,
	CUSTOM_ROMAJI_MAPPING,
} from "../logic/validation";
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
	private hiddenAt: number | null = null;
	private hiddenDurationMs = 0;
	private visibilityListener: (() => void) | null = null;
	private isStarting = false;
	private hasCompletedSession = false;
	private restartTimeout: number | null = null;
	private onRoundEnd: () => void;

	/**
	 * Initializes the GameController.
	 *
	 * @param {GameSettings} settings - The active game settings.
	 * @param {() => void} onRoundEnd - Called after an active round ends.
	 */
	constructor(settings: GameSettings, onRoundEnd: () => void = () => {}) {
		this.settings = settings;
		this.onRoundEnd = onRoundEnd;
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
	 * Reports whether a round is starting or currently active.
	 *
	 * @returns {boolean} True while deck loading or gameplay is active.
	 */
	public get isSessionActive(): boolean {
		return this.isStarting || this.state.isRunning;
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
		if (this.isStarting || this.state.isRunning) return;
		const reviewButton =
			document.querySelector<HTMLButtonElement>("#review");
		const hadCompletedSession = this.hasCompletedSession;
		this.isStarting = true;
		if (reviewButton) reviewButton.disabled = true;
		const startBtn = document.querySelector<HTMLButtonElement>("#start");
		if (startBtn) startBtn.disabled = true;
		this.deck = [];
		try {
			await this.loadDeck();
			if (this.deck.length === 0) {
				throw new Error("The selected vocabulary deck is empty.");
			}
		} catch {
			this.isStarting = false;
			if (reviewButton) reviewButton.disabled = !hadCompletedSession;
			if (startBtn) startBtn.disabled = false;
			showToast(
				'<i class="bi-exclamation-circle text-danger"></i> Unable to load vocabulary. Please try again.',
				"toast-load-error",
			);
			return;
		}
		this.isStarting = false;
		this.hasCompletedSession = false;
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

		if (this.timerHandle !== null) {
			cancelAnimationFrame(this.timerHandle);
			this.timerHandle = null;
		}

		this.gameStartTime = performance.now();
		this.hiddenDurationMs = 0;
		this.hiddenAt = document.hidden ? this.gameStartTime : null;
		this.visibilityListener = () => this.handleVisibilityChange();
		document.addEventListener("visibilitychange", this.visibilityListener);
		const timeEl = document.querySelector("#time");

		// Monotonic requestAnimationFrame timer loop
		const tickLoop = () => {
			if (!this.state.isRunning || this.gameStartTime === null) return;
			const elapsed = this.getElapsedSeconds();
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
		const result = document.querySelector("#result");
		result?.classList.add("d-none");
		result?.classList.remove("slide-in");

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

		const { questionKana, kanji, selectedReading } = formatQuestion(
			card,
			this.settings,
		);
		this.state.currentKana = questionKana;
		this.state.currentRomaji = [
			wanakana.toRomaji(selectedReading, {
				customRomajiMapping: CUSTOM_ROMAJI_MAPPING,
			}),
		];

		const questionEl = document.querySelector("#question");
		if (questionEl) {
			const rubyText = document.createElement("rt");
			rubyText.textContent = this.settings.showKanji ? kanji : "";
			questionEl.replaceChildren(
				document.createTextNode(questionKana),
				rubyText,
			);
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
	 * Pauses or resumes active-time accounting when page visibility changes.
	 *
	 * @returns {void}
	 */
	private handleVisibilityChange(): void {
		if (!this.state.isRunning) return;
		const now = performance.now();
		if (document.hidden) {
			if (this.hiddenAt === null) this.hiddenAt = now;
			return;
		}
		if (this.hiddenAt !== null) {
			this.hiddenDurationMs += now - this.hiddenAt;
			this.hiddenAt = null;
		}
		this.updateElapsedTime();
	}

	/**
	 * Returns the number of visible seconds elapsed in the current round.
	 *
	 * @returns {number} Whole seconds excluding hidden-page intervals.
	 */
	private getElapsedSeconds(): number {
		if (this.gameStartTime === null) return this.state.timer;
		const hiddenNow =
			this.hiddenAt === null ? 0 : performance.now() - this.hiddenAt;
		const elapsed =
			performance.now() -
			this.gameStartTime -
			this.hiddenDurationMs -
			hiddenNow;
		return Math.floor(Math.max(0, elapsed) / 1000);
	}

	/**
	 * Updates stored elapsed time and its visible clock label.
	 *
	 * @returns {void}
	 */
	private updateElapsedTime(): void {
		const elapsed = this.getElapsedSeconds();
		if (elapsed === this.state.timer) return;
		this.state.timer = elapsed;
		const timeEl = document.querySelector("#time");
		if (timeEl) timeEl.innerHTML = `${elapsed} <i class="bi-clock"></i>`;
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
		const isKanaAnswer = qHiragana === aHiragana;
		const isCorrect =
			isKanaAnswer || isInputValidAnswer(input, this.state.currentKana);
		const cleanInputRomaji = wanakana
			.toRomaji(input, { customRomajiMapping: CUSTOM_ROMAJI_MAPPING })
			.toLowerCase()
			.replace(/[’‘]/g, "'");
		const romajiTarget = wanakana
			.toRomaji(qHiragana, { customRomajiMapping: CUSTOM_ROMAJI_MAPPING })
			.toLowerCase();
		const missingApostrophe =
			romajiTarget.includes("'") &&
			cleanInputRomaji === romajiTarget.replace(/'/g, "");
		const isValidPrefix = isInputValidPrefix(input, this.state.currentKana);

		if (isValidPrefix || isCorrect) {
			answerEl?.classList.remove("is-invalid");
		} else {
			answerEl?.classList.remove("is-invalid");
			if (answerEl) void answerEl.offsetHeight; // reflow to trigger shake animation
			answerEl?.classList.add("is-invalid");
		}

		if (isCorrect) {
			if (missingApostrophe) {
				showApostropheToast(romajiTarget, qHiragana);
			}
			this.recordAnswer(input, true);
			return;
		}

		if (input.includes("-") || input.includes("ー")) {
			showVowelLengthToast();
			return;
		}
		const cardHasVowel =
			this.state.currentCard.kanji.includes("ー") ||
			this.state.currentKana.includes("ー");
		if (cardHasVowel && !isValidPrefix) showVowelLengthToast();
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
		const wasRunning = this.state.isRunning;
		if (!wasRunning) return;
		this.updateElapsedTime();
		this.state.isRunning = false;
		if (this.visibilityListener) {
			document.removeEventListener(
				"visibilitychange",
				this.visibilityListener,
			);
			this.visibilityListener = null;
		}
		this.hiddenAt = null;
		if (this.timerHandle !== null) {
			cancelAnimationFrame(this.timerHandle);
			this.timerHandle = null;
		}

		this.hasCompletedSession = true;
		const reviewButton =
			document.querySelector<HTMLButtonElement>("#review");
		if (reviewButton) reviewButton.disabled = false;
		this.showResults();
		this.onRoundEnd();
	}

	/**
	 * Reopens the most recently completed session's result screen.
	 *
	 * @returns {void}
	 */
	public reviewResults(): void {
		if (!this.hasCompletedSession || this.isSessionActive) return;
		this.showResults();
	}

	/**
	 * Renders the current session summary and moves focus to its heading.
	 *
	 * @returns {void}
	 */
	private showResults(): void {
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
		document.querySelector<HTMLElement>("#result-heading")?.focus();
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
			const jisho = `https://jisho.org/word/${encodeURIComponent(item.kanji)}`;
			const row = document.createElement("tr");
			const heading = document.createElement("th");
			const statusIcon = document.createElement("i");
			statusIcon.className = item.isCorrect
				? "bi-check-lg text-success"
				: "bi-x-lg text-danger";
			const link = document.createElement("a");
			link.href = jisho;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			link.textContent = item.kana;
			heading.append(statusIcon, " ", link);
			const romaji = document.createElement("td");
			romaji.className = item.isCorrect ? "text-success" : "text-danger";
			romaji.textContent = item.romaji;
			const meaning = document.createElement("td");
			meaning.textContent = item.meaning;
			row.append(heading, romaji, meaning);
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
		if (!result) return;
		result.classList.remove("slide-in");
		let isReset = false;
		let transitionEndHandler: EventListener | null = null;
		const finishReset = (): void => {
			if (isReset) return;
			isReset = true;
			if (transitionEndHandler) {
				result.removeEventListener(
					"transitionend",
					transitionEndHandler,
				);
			}
			if (this.restartTimeout !== null) {
				window.clearTimeout(this.restartTimeout);
				this.restartTimeout = null;
			}
			result.classList.add("d-none");
			document.querySelector("#game")?.classList.add("d-none");
			const timeEl = document.querySelector("#time");
			if (timeEl) {
				const clockIcon = document.createElement("i");
				clockIcon.className = "bi-clock";
				timeEl.replaceChildren(
					document.createTextNode("0 "),
					clockIcon,
				);
			}
			const scoreEl = document.querySelector("#score");
			if (scoreEl) {
				const scoreIcon = document.createElement("i");
				scoreIcon.className = "bi-check-circle";
				scoreEl.replaceChildren(
					scoreIcon,
					document.createTextNode(" 0/0"),
				);
			}
			const startBtn =
				document.querySelector<HTMLButtonElement>("#start");
			if (startBtn) startBtn.disabled = false;
			startBtn?.focus();
		};
		transitionEndHandler = (event) => {
			if (
				event.target === result &&
				(event as TransitionEvent).propertyName === "top"
			) {
				finishReset();
			}
		};
		result.addEventListener("transitionend", transitionEndHandler);
		this.restartTimeout = window.setTimeout(finishReset, 850);
	}
}
