import { readFileSync } from "node:fs";
import { Window } from "happy-dom";
import { vi } from "vitest";

let appWindow: Window | null = null;

/**
 * Loads the real application markup into a fresh Happy DOM window.
 *
 * @returns {Window} An isolated application window.
 */
export function mountAppDom(): Window {
	const markup = readFileSync(
		new URL("../../../index.html", import.meta.url),
		"utf8",
	);
	appWindow = new Window({
		url: "http://localhost/",
		settings: {
			disableCSSFileLoading: true,
			disableJavaScriptFileLoading: true,
		},
	});
	appWindow.document.write(markup);
	appWindow.document.close();
	vi.stubGlobal("window", appWindow);
	vi.stubGlobal("document", appWindow.document);
	vi.stubGlobal("navigator", appWindow.navigator);
	vi.stubGlobal("localStorage", appWindow.localStorage);
	vi.stubGlobal("HTMLElement", appWindow.HTMLElement);
	vi.stubGlobal("Element", appWindow.Element);
	vi.stubGlobal("Node", appWindow.Node);
	vi.stubGlobal("Storage", appWindow.Storage);
	vi.stubGlobal("Event", appWindow.Event);
	vi.stubGlobal("KeyboardEvent", appWindow.KeyboardEvent);
	vi.stubGlobal("MouseEvent", appWindow.MouseEvent);
	vi.stubGlobal(
		"requestAnimationFrame",
		appWindow.requestAnimationFrame.bind(appWindow),
	);
	vi.stubGlobal(
		"cancelAnimationFrame",
		appWindow.cancelAnimationFrame.bind(appWindow),
	);
	return appWindow;
}

/**
 * Aborts pending DOM work and restores the test environment's original globals.
 *
 * @returns {Promise<void>} Resolves when the window is closed.
 */
export async function unmountAppDom(): Promise<void> {
	await appWindow?.happyDOM.close();
	appWindow = null;
	vi.unstubAllGlobals();
}
