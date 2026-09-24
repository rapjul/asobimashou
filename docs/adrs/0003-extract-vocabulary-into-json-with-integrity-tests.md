---
status: accepted
date: 2026-09-18
decision-makers: [rapjul]
consulted: []
informed: []
---

# Extract Vocabulary Datasets into Static JSON Assets with Integrity Verification

## Context and Problem Statement

The vocabulary database was previously embedded directly within an executable JavaScript script (`assets/js/cards.js`), which also contained DOM mutations that altered the start button state upon loading. This tight coupling made it difficult to inspect data independently, validate schemas, or optimize asset caching.

## Decision Drivers

- Clean separation between pure vocabulary data and application runtime logic.
- Ability to validate data integrity, uniqueness, and schema conformity using automated unit tests.
- Enable efficient static asset caching and on-demand code splitting for large dictionary datasets.

## Considered Options

- Keep vocabulary embedded inside executable JavaScript files
- Migrate vocabulary to static JSON files (`jlpt.json` and `random.json`)
- Move vocabulary into a backend database or remote API

## Decision Outcome

Chosen option: "Migrate vocabulary to static JSON files", because it decouples data from DOM execution while keeping the application fully static, client-side, and capable of complete offline operation.

### Consequences

- Good, because vocabulary data is pure data, easily validated by Vitest test suites.
- Good, because dictionary data can be loaded statically or chunked independently by Vite.
- Bad, because reading JSON files in development requires JSON-import support configured in TypeScript and bundlers.

### Confirmation

Confirmed by the 100% data parity and schema integrity test suite in `tests/unit/data-integrity.test.ts`.
