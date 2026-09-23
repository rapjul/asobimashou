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
- A header-first, rectangular card table with RFC 4180 CSV escaping (quotes, commas, newlines, and Japanese characters).
- Per-card response timing for comparing practice pace across readings.
- Effortless download triggering across modern desktop and mobile browsers.

## Considered Options

- Server-side CSV generation endpoint
- Simple unescaped string concatenation in the browser
- RFC 4180 compliant escaping with client-side blob download trigger

## Decision Outcome

Chosen option: "Header-first card rows with RFC 4180 escaping and a client-side Blob download", because spreadsheet and data import tools can identify the first row as column names and every following row describes one card. Session totals remain on the results screen and in Share text.

### Consequences

- Good, because data exports succeed offline without server dependencies.
- Good, because Japanese text and fields containing special characters are escaped properly according to standards.
- Good, because spreadsheet-oriented CSV and TSV output prefixes cells that could be interpreted as formulas.
- Good, because CSV begins with `Status,Kanji,Kana,Romaji,Your Answer,Meaning,Response Time (s),Seconds per Kana Character`; each following row has the same eight columns.
- Good, because response times use the active-time clock, display numeric seconds to two decimal places, and leave per-character pace blank for skipped cards.
- Neutral, because moving from summary-prefixed six-column CSV to header-first eight-column card rows changes the export schema; existing CSV consumers must adapt.
- Neutral, because formula-protection prefixes and TSV separator cleanup can affect programmatic imports or differ between spreadsheet applications; there is no universal sanitization strategy.
- Good, because CSV downloads are verified by automated Playwright E2E tests.

### Confirmation

Confirmed in `src/logic/export.ts`, `src/ui/game-controller.ts`, `tests/unit/export.test.ts`, `tests/unit/game-controller.test.ts`, and `tests/e2e/gameplay.spec.ts`. The current CSV prefix follows OWASP's Excel-resistant guidance; the TSV apostrophe prefix is a best-effort guard, and spreadsheet applications may handle either differently or remove prefixes when saving and reopening files.
