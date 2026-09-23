---
status: accepted
date: 2026-09-18
decision-makers: [rapjul]
consulted: []
informed: []
---

# Client-Side Session CSV Export via RFC 4180 Specification

## Context and Problem Statement

Learners reviewing their practice sessions need to export performance data into external study apps, spreadsheets, or Anki decks without relying on a server-side storage backend or external tracking services.

## Decision Drivers

- 100% client-side data privacy and offline capability.
- Strict compliance with RFC 4180 CSV escaping rules (handling quotes, commas, newlines, and Japanese characters).
- Effortless download triggering across modern desktop and mobile browsers.

## Considered Options

- Server-side CSV generation endpoint
- Simple unescaped string concatenation in the browser
- RFC 4180 compliant escaping with client-side blob download trigger

## Decision Outcome

Chosen option: "RFC 4180 compliant escaping with client-side blob download trigger", because it generates valid CSV documents entirely client-side using `Blob` and temporary object URLs, keeping user data private and operable offline.

### Consequences

- Good, because data exports succeed offline without server dependencies.
- Good, because Japanese text and fields containing special characters are escaped properly according to standards.
- Good, because spreadsheet-oriented CSV and TSV output prefixes cells that could be interpreted as formulas.
- Neutral, because formula-protection prefixes and TSV separator cleanup can affect programmatic imports or differ between spreadsheet applications; there is no universal sanitization strategy.
- Good, because CSV downloads are verified by automated Playwright E2E tests.

### Confirmation

Confirmed in `src/logic/export.ts`, `tests/unit/export.test.ts`, and `tests/e2e/gameplay.spec.ts`. The current CSV prefix follows OWASP's Excel-resistant guidance; the TSV apostrophe prefix is a best-effort guard, and spreadsheet applications may handle either differently or remove prefixes when saving and reopening files.
