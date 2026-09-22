import { test, expect } from "@playwright/test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";

/**
 * Starts an isolated static server for deterministic service-worker updates.
 *
 * @returns {Promise<{ baseUrl: string; updateWorker: () => Promise<void>; close: () => Promise<void> }>} Fixture controls.
 */
async function startPwaFixtureServer(): Promise<{
	baseUrl: string;
	updateWorker: () => Promise<void>;
	close: () => Promise<void>;
}> {
	const directory = await mkdtemp(join(tmpdir(), "asobimashou-pwa-"));
	await cp(resolve("dist"), directory, { recursive: true });
	const server = createServer((request, response) => {
		void (async () => {
			const requestPath = decodeURIComponent(
				new URL(request.url ?? "/", "http://localhost").pathname,
			);
			const filePath = resolve(directory, `.${requestPath}`);
			if (
				filePath !== directory &&
				!filePath.startsWith(`${directory}${sep}`)
			) {
				response.writeHead(403).end();
				return;
			}
			const resolvedPath =
				requestPath === "/" ? join(directory, "index.html") : filePath;
			try {
				const body = await readFile(resolvedPath);
				const contentTypes: Record<string, string> = {
					".css": "text/css",
					".html": "text/html",
					".js": "application/javascript",
					".json": "application/json",
					".png": "image/png",
					".svg": "image/svg+xml",
					".webmanifest": "application/manifest+json",
					".woff2": "font/woff2",
				};
				response
					.writeHead(200, {
						"Content-Type":
							contentTypes[extname(resolvedPath)] ??
							"application/octet-stream",
						"Service-Worker-Allowed": "/",
					})
					.end(body);
			} catch {
				response.writeHead(404).end();
			}
		})();
	});
	await new Promise<void>((resolveListen) => {
		server.listen(0, "127.0.0.1", resolveListen);
	});
	const address = server.address();
	if (!address || typeof address === "string") {
		throw new Error("The PWA update fixture server did not start.");
	}
	return {
		baseUrl: `http://127.0.0.1:${address.port}`,
		updateWorker: async () => {
			const serviceWorkerPath = join(directory, "sw.js");
			const serviceWorker = await readFile(serviceWorkerPath, "utf8");
			await writeFile(
				serviceWorkerPath,
				`${serviceWorker}\n// Updated build marker.\n`,
			);
		},
		close: async () => {
			await new Promise<void>((resolveClose, reject) => {
				server.close((error) =>
					error ? reject(error) : resolveClose(),
				);
			});
			await rm(directory, { recursive: true, force: true });
		},
	};
}

test.describe("PWA Offline Support & Network State Transitions", () => {
	test("should serve every declared PWA and social image asset", async ({
		page,
	}) => {
		await page.goto("/");
		const manifest = await page.request.get("/manifest.webmanifest");
		expect(manifest.ok()).toBe(true);
		const manifestData = (await manifest.json()) as {
			icons: Array<{ src: string }>;
			screenshots: Array<{ src: string }>;
		};
		const assetPaths = [
			...manifestData.icons.map((asset) => asset.src),
			...manifestData.screenshots.map((asset) => asset.src),
			"favicon.svg",
			"apple-touch-icon.png",
			"assets/images/thumbnail.png",
		];

		for (const assetPath of new Set(assetPaths)) {
			const response = await page.request.get(`/${assetPath}`);
			expect(response.ok(), `${assetPath} should be available`).toBe(
				true,
			);
		}
	});

	test("should display offline badge and offline toast notification on network disconnection", async ({
		page,
		context,
	}) => {
		await page.goto("/");
		await expect(page.locator("#start")).toBeEnabled();

		// Verify offline badge is initially hidden
		const badge = page.locator("#offline-badge");
		await expect(badge).toHaveClass(/d-none/);

		// Simulate going offline
		await context.setOffline(true);

		// Expect offline badge to appear
		await expect(badge).toBeVisible();
		await expect(badge).toHaveClass(/show/);

		// Expect offline toast notification
		const offlineToast = page.locator(".custom-toast.toast-offline");
		await expect(offlineToast).toBeVisible();
		await expect(offlineToast).toContainText("Offline");

		// Simulate reconnecting online
		await context.setOffline(false);

		// Expect online toast notification
		const onlineToast = page.locator(".custom-toast.toast-online");
		await expect(onlineToast).toBeVisible();
		await expect(onlineToast).toContainText("Back online");

		// Expect offline badge to be hidden again
		await expect(badge).not.toHaveClass(/show/);
	});

	test("should cache selected fonts and disable uncached fonts only while offline", async ({
		page,
		context,
	}) => {
		await page.goto("/");
		await expect(page.locator("#start")).toBeEnabled();
		await page.selectOption("#game-font", "Klee One");
		await expect
			.poll(() =>
				page.evaluate(async () => {
					const cache = await caches.open("fonts-cache");
					const keys = await cache.keys();
					return keys.some((request) =>
						request.url.includes("klee-one-"),
					);
				}),
			)
			.toBe(true);

		await context.setOffline(true);
		await expect(
			page.locator('#game-font option[value="Klee One"]'),
		).toBeEnabled();
		await expect(
			page.locator('#game-font option[value="Yuji Syuku"]'),
		).toBeDisabled();
		await expect(
			page.locator('#game-font option[value="system-ui"]'),
		).toBeEnabled();
		await context.setOffline(false);
		await expect(
			page.locator('#game-font option[value="Yuji Syuku"]'),
		).toBeEnabled();
	});

	test("should fall back for an uncached font offline, then restore it online", async ({
		page,
		context,
	}) => {
		await page.goto("/");
		await expect(page.locator("#start")).toBeEnabled();
		await context.setOffline(true);
		await expect(
			page.locator('#game-font option[value="Yuji Syuku"]'),
		).toBeDisabled();
		await page.evaluate(() => {
			const select =
				document.querySelector<HTMLSelectElement>("#game-font");
			if (!select) throw new Error("Font selector is missing.");
			select.value = "Yuji Syuku";
			select.dispatchEvent(new Event("change", { bubbles: true }));
		});
		await expect(page.locator("#game-font")).toHaveValue("Yuji Syuku");
		await expect(page.locator(".toast-font-fallback")).toContainText(
			"has not been cached yet",
		);
		await expect
			.poll(() =>
				page
					.locator(".game-font-change")
					.first()
					.evaluate(
						(element) => (element as HTMLElement).style.fontFamily,
					),
			)
			.toBe("system-ui");

		await context.setOffline(false);
		await expect(
			page.locator('#game-font option[value="Yuji Syuku"]'),
		).toBeEnabled();
		await expect
			.poll(() =>
				page
					.locator(".game-font-change")
					.first()
					.evaluate(
						(element) => (element as HTMLElement).style.fontFamily,
					),
			)
			.toBe('"Yuji Syuku"');
	});

	test("should wait to show and activate an update until a round ends", async ({
		browser,
	}) => {
		const fixture = await startPwaFixtureServer();
		const context = await browser.newContext();
		try {
			const page = await context.newPage();
			await page.goto(fixture.baseUrl);
			await expect(page.locator("#start")).toBeEnabled();
			await page.reload();
			await expect
				.poll(() =>
					page.evaluate(() =>
						Boolean(navigator.serviceWorker.controller),
					),
				)
				.toBe(true);
			await page.locator("#start").click();
			await expect(page.locator("#game")).not.toHaveClass(/d-none/);

			await fixture.updateWorker();
			await page.evaluate(async () => {
				const registration =
					await navigator.serviceWorker.getRegistration();
				await registration?.update();
			});
			await expect
				.poll(() =>
					page.evaluate(async () => {
						const registration =
							await navigator.serviceWorker.getRegistration();
						return Boolean(registration?.waiting);
					}),
				)
				.toBe(true);
			await expect(page.locator(".toast-update")).toHaveCount(0);

			await page.locator("#stop").click();
			await expect(page.locator(".toast-update")).toBeVisible();
			await page.locator(".toast-update button").click();
			await expect(page.locator("#start")).toBeEnabled();
		} finally {
			await context.close();
			await fixture.close();
		}
	});
});
