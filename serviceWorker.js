const CACHE_NAME = "offline-v4";

/** All assets that must be cached during service worker installation. */
const toCache = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.json",
  /* Icons */
  "./favicon.ico",
  "./thumbnail.png",
  /* JavaScript */
  "./assets/js/bootstrap.bundle.min.js",
  "./assets/js/script.js",
  "./assets/js/cards.js",
  "./assets/js/wanakana.min.js",
  /* CSS */
  "./assets/css/bootstrap.min.css",
  "./assets/css/style.css",
  "./assets/css/icons.css",
  "./assets/css/fonts.css",
  /* Fonts */
  "./assets/fonts/bootstrap-icons.woff2",
  "./assets/fonts/klee-one.woff2",
  "./assets/fonts/noto-serif-jp.woff2",
  "./assets/fonts/yuji-syuku.woff2",
];

/**
 * Install event: precache all listed assets so they're available offline.
 * @param {ExtendableEvent} event
 */
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(toCache)));
  /* Take control immediately without waiting for old SW to be discarded. */
  self.skipWaiting();
});

/**
 * Activate event: purge stale caches from previous versions.
 * @param {ExtendableEvent} event
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        }),
      ),
    ),
  );
  /* Claim all open clients so the new SW activates without a page reload. */
  self.clients.claim();
});

/**
 * Fetch event: cache-first strategy with offline fallback.
 *
 * For navigation requests (HTML page loads) that miss the cache AND fail the
 * network, serve the pre-cached offline.html instead of a bare browser error.
 *
 * @param {FetchEvent} event
 */
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).catch(() => {
        /* Only substitute the offline page for full navigation requests. */
        if (event.request.mode === "navigate") {
          return caches.match("./offline.html");
        }
      });
    }),
  );
});
