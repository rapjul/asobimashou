import { describe, it, expect } from "vitest";
import { CardQueue } from "@/logic/deduplication";

describe("CardQueue Sliding Window Deduplication", () => {
	it("should not return immediately repeated indices when alternative candidates exist", () => {
		const queue = new CardQueue(5);
		const candidates = [10, 20, 30, 40, 50, 60, 70];

		const first = queue.selectNext(candidates);
		expect(candidates).toContain(first);

		// Pick 4 more
		for (let i = 0; i < 4; i++) {
			const next = queue.selectNext(candidates);
			expect(queue.getHistory()).toContain(next);
		}

		const history = queue.getHistory();
		expect(history.length).toBe(5);

		// The next selected candidate must not be any of the 5 in recent history
		const nextPick = queue.selectNext(candidates);
		expect(history).not.toContain(nextPick);
	});

	it("should fall back gracefully when candidate pool is smaller than window size", () => {
		const queue = new CardQueue(5);
		const smallPool = [1, 2];

		const pick1 = queue.selectNext(smallPool);
		const pick2 = queue.selectNext(smallPool);
		const pick3 = queue.selectNext(smallPool);

		expect(smallPool).toContain(pick1);
		expect(smallPool).toContain(pick2);
		expect(smallPool).toContain(pick3);
	});

	it("should fall back to the least recently seen candidate when history has repeats", () => {
		const queue = new CardQueue(5);
		queue.record(1);
		queue.record(2);
		queue.record(1);

		expect(queue.selectNext([1, 2])).toBe(2);
		expect(queue.selectNext([1, 2])).toBe(1);
	});

	it("should clear history when requested", () => {
		const queue = new CardQueue(5);
		queue.record(1);
		queue.record(2);
		expect(queue.getHistory().length).toBe(2);

		queue.clear();
		expect(queue.getHistory().length).toBe(0);
	});
});
