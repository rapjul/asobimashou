import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

/** Describes the activation event fields used by the legacy-cache handler. */
type ActivationEvent = {
	waitUntil: (promise: Promise<boolean>) => void;
};

/**
 * Verifies activation removes only the cache used by the legacy worker.
 */
describe("legacy service worker cache cleanup", () => {
	it("deletes offline-v7 when the replacement worker activates", async () => {
		const workerScript = await readFile(
			"public/cleanup-legacy-cache.js",
			"utf8",
		);
		const deleteCache = vi.fn(async () => true);
		const listeners = new Map<string, (event: ActivationEvent) => void>();
		runInNewContext(workerScript, {
			caches: { delete: deleteCache },
			self: {
				addEventListener: (
					type: string,
					listener: (event: ActivationEvent) => void,
				) => listeners.set(type, listener),
			},
		});

		const waitUntil = vi.fn((promise: Promise<boolean>) => void promise);
		listeners.get("activate")?.({ waitUntil });

		expect(deleteCache).toHaveBeenCalledWith("offline-v7");
		expect(waitUntil).toHaveBeenCalledOnce();
		await waitUntil.mock.calls[0]?.[0];
	});
});
