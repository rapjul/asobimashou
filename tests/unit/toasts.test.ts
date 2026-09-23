import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountAppDom, unmountAppDom } from "./helpers/app-dom";

describe("Toast and connectivity notices", () => {
	let toasts: typeof import("@/ui/toasts");

	beforeEach(async () => {
		mountAppDom();
		vi.resetModules();
		toasts = await import("@/ui/toasts");
	});

	afterEach(async () => {
		vi.useRealTimers();
		await unmountAppDom();
	});

	it("renders each practice and connectivity notice in the real toast container", () => {
		toasts.showApostropheToast("ten'in", "てんいん");
		toasts.showVowelLengthToast();
		toasts.showFontOfflineToast("Yuji Syuku");
		toasts.showOfflineToast();
		toasts.showOnlineToast();
		toasts.showCacheSuccessToast();
		toasts.showCacheUpdateToast();

		expect(document.querySelectorAll(".custom-toast")).toHaveLength(7);
		expect(
			document.querySelector(".toast-apostrophe")!.textContent,
		).toContain("ten'in");
		expect(
			document.querySelector(".toast-vowel-length")!.textContent,
		).toContain("doubling the vowel");
		expect(
			document.querySelector(".toast-font-fallback")!.textContent,
		).toContain("Yuji Syuku");
		expect(document.querySelector(".toast-offline")!.textContent).toContain(
			"Offline",
		);
		expect(document.querySelector(".toast-online")!.textContent).toContain(
			"Back online",
		);
		expect(document.querySelector(".toast-cached")!.textContent).toContain(
			"Ready for offline use",
		);
		expect(document.querySelector(".toast-updated")!.textContent).toContain(
			"Reload the page",
		);
	});

	it("escapes player supplied text and removes transient notices after their duration", () => {
		vi.useFakeTimers();
		toasts.showApostropheToast("<img src=x onerror=alert(1)>", "<script>");
		const toast = document.querySelector(".toast-apostrophe")!;
		expect(toast.querySelector("img, script")).toBeNull();
		expect(toast.innerHTML).toContain("&lt;script&gt;");

		toasts.showToast("Notice", "temporary");
		const transient = document.querySelector(".temporary")!;
		expect(transient.classList.contains("show")).toBe(true);
		vi.advanceTimersByTime(4000);
		expect(transient.classList.contains("show")).toBe(false);
		vi.advanceTimersByTime(300);
		expect(document.querySelector(".temporary")).toBeNull();
	});

	it("replaces repeated vowel-length hints without stacking notices", () => {
		vi.useFakeTimers();
		toasts.showVowelLengthToast();
		const firstToast = document.querySelector(".toast-vowel-length")!;
		vi.advanceTimersByTime(3000);

		toasts.showVowelLengthToast();
		const currentToast = document.querySelector(".toast-vowel-length")!;
		expect(currentToast).not.toBe(firstToast);
		expect(document.querySelectorAll(".toast-vowel-length")).toHaveLength(
			1,
		);
		vi.advanceTimersByTime(1001);
		expect(currentToast.classList.contains("show")).toBe(true);
		vi.advanceTimersByTime(2999);
		expect(currentToast.classList.contains("show")).toBe(false);
	});

	it("toggles the persistent offline badge safely when it is absent", () => {
		vi.useFakeTimers();
		const badge = document.querySelector("#offline-badge")!;
		toasts.toggleOfflineBadge(true);
		expect(badge.classList.contains("show")).toBe(true);
		toasts.toggleOfflineBadge(false);
		expect(badge.classList.contains("show")).toBe(false);
		vi.advanceTimersByTime(300);
		expect(badge.classList.contains("d-none")).toBe(true);
		badge.remove();
		expect(() => toasts.toggleOfflineBadge(true)).not.toThrow();
	});
});
