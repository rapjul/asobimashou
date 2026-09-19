---
status: accepted
date: 2026-09-18
decision-makers: [rapjul]
consulted: []
informed: []
---

# Use Vitest for Unit Testing and Playwright for End-to-End Testing

## Context and Problem Statement

Prior to modernization, the application had no automated unit test runner or end-to-end browser regression test suite. Verifying functionality required manual browser interactions and CLI verification scripts (`verify-offline.sh`).

## Decision Drivers

- Fast, native TypeScript unit testing sharing the exact same Vite configuration.
- Automated code coverage reporting asserting core logic quality thresholds.
- Reliable cross-browser and cross-device end-to-end testing across desktop and mobile devices.

## Considered Options

- Maintain manual verification scripts without automated runners
- Use Jest and Cypress
- Use Vitest for unit testing and Playwright for E2E testing

## Decision Outcome

Chosen option: "Use Vitest for unit testing and Playwright for E2E testing", because Vitest shares Vite configuration and transforms instantly, while Playwright provides first-class headless testing across Chromium, Desktop Safari, and mobile viewport simulations (iPhone 13 and iPhone 17 Pro Max).

### Consequences

- Good, because unit tests run in milliseconds with detailed coverage breakdowns (`npm run test:coverage`).
- Good, because Playwright automates comprehensive user flows: gameplay answering, skipping, timer metrics, CSV export downloads, options modal pagination, theme switching, and network disconnections.
- Bad, because browser binaries must be downloaded in CI and development environments (`npx playwright install`).

### Confirmation

Verified via `npm run test` (Vitest) and `npm run test:e2e` (Playwright).
