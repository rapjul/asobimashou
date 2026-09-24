---
status: accepted
date: 2026-09-18
decision-makers: [rapjul]
consulted: []
informed: []
---

# Adopt Vite as the Modern Build and Development Tool

## Context and Problem Statement

The original web application relied on static file serving with no bundling, code splitting, or optimization pipeline. Large vocabulary datasets and modular TypeScript files required an efficient modern development server with Instant HMR and an optimized production bundling pipeline.

## Decision Drivers

- Sub-second cold start and rapid Hot Module Replacement (HMR).
- Production bundling with Rollup to generate minified, tree-shaken chunks.
- Frictionless integration with modern TypeScript, Vitest, and PWA plugins.

## Considered Options

- Continue with raw static file serving (`npx serve .`)
- Adopt Webpack
- Adopt Vite

## Decision Outcome

Chosen option: "Adopt Vite", because of its superior developer experience, ESM-native dev server, zero-config TypeScript handling, and rich plugin ecosystem (including `vite-plugin-pwa` and `vitest`).

### Consequences

- Good, because local development feedback loops are near-instantaneous.
- Good, because production builds are optimized with automated asset hashing and chunk generation.
- Bad, because build tools and node development dependencies are introduced to the project repository.

### Confirmation

Verified via `npm run dev` local serving and automated production builds with `npm run build`.
