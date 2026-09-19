---
status: accepted
date: 2026-09-18
decision-makers: [rapjul]
consulted: []
informed: []
---

# Semantic CSS Custom Properties for Dark and Light Theme Architecture

## Context and Problem Statement

Supporting light, dark, and system color themes with hardcoded hex values in stylesheets causes maintenance friction and visual inconsistencies across modal overlays, tables, buttons, and scrollbars.

## Decision Drivers

- Centralized theme palette definition.
- Seamless runtime theme toggling without page reloading.
- Instant adaptation to OS system color preference (`prefers-color-scheme`).

## Considered Options

- Separate CSS stylesheets for dark and light mode
- CSS-in-JS runtime styling
- Centralized CSS custom properties in `:root` and `body.bg-dark`

## Decision Outcome

Chosen option: "Centralized CSS custom properties in :root and body.bg-dark", because native CSS variables allow dynamic theme changes by toggling a single class on `document.body` without re-downloading CSS or incurring runtime framework costs.

### Consequences

- Good, because color tokens are declared in one location and automatically inherited.
- Good, because system theme detection synchronizes effortlessly.
- Neutral, because dark mode overrides require consistent usage of `body.bg-dark` selector overrides.

### Confirmation

Confirmed by theme switching tests in `tests/e2e/options.spec.ts`.
