/**
 * Deletes the application cache used by the former hand-written worker.
 * @param {{ waitUntil: (promise: Promise<boolean>) => void }} event - The service worker activation event.
 * @returns {void}
 */
function removeLegacyApplicationCache(event) {
	event.waitUntil(caches.delete("offline-v7"));
}

self.addEventListener("activate", removeLegacyApplicationCache);
