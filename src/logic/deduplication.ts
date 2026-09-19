/**
 * Sliding window buffer to prevent immediate repetition of flashcards during gameplay.
 */
export class CardQueue {
	/**
	 * Internal queue of recently visited card indices.
	 */
	private recentIndices: number[] = [];

	/**
	 * Maximum capacity of the history window.
	 */
	private windowSize: number;

	/**
	 * Constructs a new CardQueue.
	 *
	 * @param {number} [windowSize=15] - The number of recent indices to remember.
	 */
	constructor(windowSize: number = 15) {
		this.windowSize = windowSize;
	}

	/**
	 * Selects an index from candidate indices that is not in the recent history window.
	 * If all candidates are currently in the window, falls back to the least recently used candidate.
	 *
	 * @param {number[]} candidateIndices - The allowed card indices to pick from.
	 * @returns {number} The selected card index.
	 */
	public selectNext(candidateIndices: number[]): number {
		if (candidateIndices.length === 0) {
			throw new Error("Cannot select from an empty candidate list");
		}

		if (candidateIndices.length === 1) {
			const single = candidateIndices[0]!;
			this.record(single);
			return single;
		}

		// Filter out indices that are currently in the recent sliding window
		const available = candidateIndices.filter(
			(idx) => !this.recentIndices.includes(idx),
		);

		let chosen: number;
		if (available.length > 0) {
			chosen = available[Math.floor(Math.random() * available.length)]!;
		} else {
			// All candidates have been used recently; pick the one seen longest ago
			chosen = candidateIndices.reduce((oldest, current) => {
				const oldestPos = this.recentIndices.indexOf(oldest);
				const currentPos = this.recentIndices.indexOf(current);
				return currentPos < oldestPos ? current : oldest;
			}, candidateIndices[0]!);
		}

		this.record(chosen);
		return chosen;
	}

	/**
	 * Record an index as recently viewed.
	 *
	 * @param {number} index - The card index to record.
	 * @returns {void}
	 */
	public record(index: number): void {
		this.recentIndices.push(index);
		if (this.recentIndices.length > this.windowSize) {
			this.recentIndices.shift();
		}
	}

	/**
	 * Clears the history window buffer.
	 *
	 * @returns {void}
	 */
	public clear(): void {
		this.recentIndices = [];
	}

	/**
	 * Returns a copy of the current queue state.
	 *
	 * @returns {number[]} The array of recent indices.
	 */
	public getHistory(): number[] {
		return [...this.recentIndices];
	}
}
