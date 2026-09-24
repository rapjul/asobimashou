---
status: accepted
date: 2026-09-18
decision-makers: [rapjul]
consulted: []
informed: []
---

# Transient Toast Notifications for Romaji Hints and Connectivity Transitions

## Context and Problem Statement

Strictly penalizing users for technical Romaji nuances (such as missing apostrophes before vowels/y-sounds or typing hyphens for prolonged vowels) interrupts practice flow. Similarly, sudden network disconnection must be communicated clearly without blocking user practice.

## Decision Drivers

- Non-intrusive instructional feedback during gameplay.
- Immediate awareness of offline status and font availability.
- Clean visual UI that automatically dismisses after reading.

## Considered Options

- Modal dialog alerts (blocking)
- Inline form validation error labels
- Floating transient toast notifications

## Decision Outcome

Chosen option: "Floating transient toast notifications", because toasts provide passive instructional guidance without interrupting typing flow or blocking interaction.

### Consequences

- Good, because practice rhythm is uninterrupted while subtle hints guide the learner.
- Good, because network disconnection and cache statuses are communicated clearly.
- Neutral, because toasts fade automatically after several seconds.

### Confirmation

Verified by toast behavior in `src/ui/toasts.ts`, game-answer handling in `src/ui/game-controller.ts`, and Playwright assertions in `tests/e2e/gameplay.spec.ts` and `tests/e2e/offline.spec.ts`.
