---
status: accepted
date: 2026-09-18
decision-makers: [rapjul]
consulted: []
informed: []
---

# Migrate Service Worker to Vite PWA and Workbox Runtime Caching

## Context and Problem Statement

The legacy manual service worker (`serviceWorker.js` and `assets/js/sw-register.js`) relied on hand-maintained asset lists (`toCache`) and manual version bumps (`offline-v7`). Adding or renaming files risked cache staleness or breaking offline capabilities if developer updates were missed.

## Decision Drivers

- Automatic precaching asset manifest generation on build.
- Granular runtime caching strategies for static bundles and web fonts.
- Standards-compliant PWA manifest generation and lifecycle event hooks.

## Considered Options

- Maintain manual vanilla service worker script
- Adopt `vite-plugin-pwa` with Workbox-powered precaching and runtime caching
- Remove service worker and rely solely on browser HTTP cache

## Decision Outcome

Chosen option: "Adopt vite-plugin-pwa with Workbox", because it automates precache manifests for all generated assets during `vite build` and provides declarative runtime caching rules for web fonts.

### Consequences

- Good, because all built HTML, CSS, JS, and JSON assets are automatically precached without manual list editing.
- Good, because font caching uses declarative `CacheFirst` strategies with maximum age expirations.
- Good, because lifecycle updates are easily handled via `virtual:pwa-register`.
- Bad, because Service Worker logic is managed through build tool plugins rather than a single raw file.

### Confirmation

Verified through automated Playwright offline tests in `tests/e2e/offline.spec.ts`.
