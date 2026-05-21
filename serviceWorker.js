const CACHE_NAME = "offline-v5";

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
 * Fetch event: split caching strategy.
 *
 * - Navigation requests (HTML page loads): network-first so Safari always
 *   receives the latest version of the page. Falls back to the offline shell
 *   when the network is unavailable.
 * - All other requests (JS, CSS, fonts, images): stale-while-revalidate —
 *   respond instantly from cache, update the cache in the background so the
 *   next visit always gets fresh assets without blocking the current load.
 *
 * @param {FetchEvent} event
 */
self.addEventListener("fetch", (event) => {
  /* Network-first for HTML navigation — prevents Safari from serving stale pages. */
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          /* Refresh the cached copy with the fresh response. */
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          /* Network failed — serve the cached page or the offline fallback. */
          return caches.match(event.request).then((cached) => cached || caches.match("./offline.html"));
        }),
    );
    return;
  }

  /* Stale-while-revalidate for static assets (JS, CSS, fonts, images).
   *
   * 1. Respond immediately from cache if available (fast load).
   * 2. Always fire a background network request to refresh the cache entry
   *    so the next visit gets the latest version automatically.
   * 3. If the network request fails and a cached copy was already served,
   *    log a warning so the developer knows the cache is stale.
   */
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cached) => {

        /**
         * Background revalidation: fetch the latest version from the network
         * and silently update the cache entry for the next visit.
         *
         * @returns {Promise<void>}
         */
        const revalidate = fetch(event.request)
          .then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
          })
          .catch(() => {
            /* Network is unavailable. If we already have a cached copy we can
             * serve it without interruption, but warn so it's visible in DevTools. */
            if (cached) {
              console.warn(
                "[asobimashou SW] Offline — serving stale cache for:",
                event.request.url,
              );
            }
          });

        /* Serve the cached response immediately; revalidation runs in the background. */
        if (cached) {
          /* Kick off the background update without blocking the response. */
          event.waitUntil(revalidate);
          return cached;
        }

        /* No cache entry yet — wait for the network response and cache it. */
        return fetch(event.request).then((networkResponse) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    }),
  );
});
