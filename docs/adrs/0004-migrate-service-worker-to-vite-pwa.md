---
status: accepted
date: 2026-09-18
decision-makers: [rapjul]
consulted: []
informed: []
---

# Use Vite PWA and Workbox for Offline Support

## Context and Problem Statement

The legacy service worker relied on a hand-maintained asset list and manual cache-version changes. That made builds fragile when files were added, renamed, or removed, and did not provide a safe update flow for an active game session.

## Decision Drivers

- Generate a production precache manifest from the built application.
- Serve the application shell and compiled assets during offline use.
- Cache optional font files when players select them.
- Avoid reloading the page during an active round when an update arrives.

## Considered Options

- Maintain a hand-written service worker and asset list.
- Use `vite-plugin-pwa` with Workbox precaching and runtime caching.
- Remove service worker support and rely on the browser HTTP cache.

## Decision Outcome

Chosen option: "Use `vite-plugin-pwa` with Workbox", because the build can generate its precache list from emitted files and provide the app shell and assets offline without maintaining a second inventory.

### Consequences

- Good, because the production build precaches the HTML shell, compiled code, vocabulary chunks, declared static images, and Bootstrap icon font.
- Good, because Workbox caches font requests and the app caches selected optional Japanese fonts for later offline use.
- Good, because the app keeps a new worker waiting and prompts for reload at home or after an active round finishes.
- Neutral, because the app's update prompt and offline-font behavior are managed through `virtual:pwa-register` and Cache Storage in addition to the generated worker.
- Bad, because a selected optional font is not available offline until it has been selected while online and successfully cached.

### Confirmation

The generated manifest assets, offline font caching, and deferred service worker update lifecycle are verified in `tests/e2e/offline.spec.ts`.

## More Information

- Workbox precaches built application assets and serves the precached `index.html` for offline navigation.
- Workbox also precaches the Bootstrap icon font so interface icons remain available immediately offline.
- A small activation migration deletes the known `offline-v7` cache left by the former hand-written worker.
- The `fonts-cache` Cache Storage entry is populated when an optional font is selected online. Uncached optional fonts are disabled offline; system fonts remain selectable.
- `registerType: "prompt"` prevents a waiting worker from activating until the player chooses Reload after reaching home or the result screen.
