import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountAppDom, unmountAppDom } from "./helpers/app-dom";

describe("Theme application", () => {
	let theme: typeof import("@/ui/theme");

	beforeEach(async () => {
		mountAppDom();
		vi.resetModules();
		theme = await import("@/ui/theme");
	});

	afterEach(async () => {
		await unmountAppDom();
	});

	it("resolves explicit and system theme preferences", () => {
		expect(theme.resolveIsDark("dark")).toBe(true);
		expect(theme.resolveIsDark("light")).toBe(false);
		expect(theme.resolveIsDark("system")).toBe(theme.systemDarkMQ.matches);
	});

	it("updates all themed elements and the browser theme color", () => {
		theme.applyTheme(true);
		expect(document.body.classList.contains("bg-dark")).toBe(true);
		expect(
			document.querySelector("#menu")!.classList.contains("text-white"),
		).toBe(true);
		expect(
			document.querySelector("#result")!.classList.contains("bg-dark"),
		).toBe(true);
		expect(
			document.querySelector("#answer")!.classList.contains("text-white"),
		).toBe(true);
		expect(
			document.querySelector("kbd")!.classList.contains("bg-white"),
		).toBe(true);
		expect(
			document.querySelector(".table")!.classList.contains("text-white"),
		).toBe(true);
		expect(
			document
				.querySelector(".btn")!
				.classList.contains("btn-outline-light"),
		).toBe(true);
		expect(
			document
				.querySelector('meta[name="theme-color"]')!
				.getAttribute("content"),
		).toBe("#212529");

		theme.applyTheme(false);
		expect(document.body.classList.contains("bg-light")).toBe(true);
		expect(
			document.querySelector("kbd")!.classList.contains("text-white"),
		).toBe(true);
		expect(
			document.querySelector(".table")!.classList.contains("table-hover"),
		).toBe(true);
		expect(
			document
				.querySelector(".btn")!
				.classList.contains("btn-outline-dark"),
		).toBe(true);
		expect(
			document
				.querySelector('meta[name="theme-color"]')!
				.getAttribute("content"),
		).toBe("#F8F9FA");
	});
});
