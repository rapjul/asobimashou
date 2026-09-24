---
status: accepted
date: 2026-09-22
decision-makers: [rapjul]
consulted: []
informed: []
---

# Preserve Player Choices and Finish Rounds Safely

## Context and Problem Statement

The modernization replaces several saved setting names and changes the round flow. Resetting those settings would discard players' Kana mode, Kanji choice, deck, filters, font, or theme. An update that activates while a round is in progress can also interrupt practice and lose the session review.

## Decision Drivers

- Preserve valid player preferences across the settings migration.
- Make a normal practice round short and predictable while allowing longer or unlimited practice.
- Keep an active round intact when a new service worker is available.
- Make bundled optional fonts usable offline without requiring all font files on every first visit.

## Considered Options

- Reset existing settings and activate service worker updates automatically.
- Migrate existing preferences, use a 20-card default with selectable limits, and defer update prompts while a round is active.
- Migrate existing preferences, default to unlimited practice, and allow a waiting update to activate at any time.

## Decision Outcome

Chosen option: "Migrate preferences and protect active rounds", because it preserves player choices while making the common practice flow predictable and keeping update installation out of active gameplay.

### Consequences

- Good, because legacy `type` and `kanji` settings map to the current Kana and Show Kanji settings, while valid saved choices take precedence over defaults.
- Good, because the default deck remains JLPT, whose smaller size supports focused practice, and the default font remains Noto Sans JP.
- Good, because a round defaults to 20 cards and can be set to 10, 20, 50, 100, 150, 200, 250, or Unlimited. Finite rounds end after the selected number of answers and skips.
- Good, because a waiting update prompts at home or after a round, and never reloads an active session.
- Neutral, because uncached optional fonts are unavailable offline until the player selects them while online; system fonts remain available offline.
- Bad, because settings normalization and service worker lifecycle behavior require regression tests as the stored settings or round flow changes.

### Confirmation

Verified by settings migration and round-length tests in `tests/e2e/options.spec.ts` and `tests/e2e/gameplay.spec.ts`, font and update tests in `tests/e2e/offline.spec.ts`, and stable vocabulary and logic tests in Vitest.

## More Information

- `src/ui/options.ts` normalizes stored settings and caches selected optional font files.
- `src/ui/game-controller.ts` completes finite rounds after answers or skips and notifies the app when a round ends.
- `src/main.ts` displays the persistent update prompt only when a round is not active.
- English meanings remain available in review and exports; the Show Kanji option controls the Kanji reading aid above the Kana.
