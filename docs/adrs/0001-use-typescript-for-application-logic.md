---
status: accepted
date: 2026-09-18
decision-makers: [rapjul]
consulted: []
informed: []
---

# Use TypeScript for Application Logic and UI Controllers

## Context and Problem Statement

Asobimashou was originally authored as vanilla JavaScript (`assets/js/script.js`) without compile-time type verification. As the application expanded to support complex phonetic filters, custom Romanization mappings, multi-theme switching, and session data exports, maintaining code quality and refactoring safely became increasingly risky and error-prone.

## Decision Drivers

- Enforce strict type checking across card structures, game configurations, and session records.
- Improve maintainability and developer ergonomics through IDE autocompletion and early compile-time error detection.
- Retain high performance without introducing heavyweight runtime frameworks.

## Considered Options

- Continue with vanilla JavaScript and JSDoc annotations
- Adopt TypeScript with strict configuration (`strict: true`)
- Migrate to a component framework like React or Vue

## Decision Outcome

Chosen option: "Adopt TypeScript with strict configuration", because it introduces end-to-end type safety across the entire application codebase without requiring runtime framework overhead or altering vanilla DOM operations.

### Consequences

- Good, because compile-time checks catch edge cases in filtering, options state, and vocabulary data models before runtime.
- Good, because developer velocity increases with automated typings and interface definitions.
- Bad, because a build step is now required to transpile TypeScript to JavaScript for browser delivery.
- Neutral, because vanilla DOM APIs remain the architectural core, preserving zero-framework performance.

### Confirmation

Verified by running `npm run typecheck` (`tsc --noEmit`) across all modules in `src/` and `tests/`.
