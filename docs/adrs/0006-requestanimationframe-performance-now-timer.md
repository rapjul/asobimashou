---
status: accepted
date: 2026-09-18
decision-makers: [rapjul]
consulted: []
informed: []
---

# Timer Loop with requestAnimationFrame and performance.now

## Context and Problem Statement

Desktop and mobile Safari aggressively throttle `setInterval` with a 1-second period and silently terminate background or active interval timers after the initial fire. A reliable timer is required for scoring cards per second accurately.

## Decision Drivers

- Immunity to mobile browser timer throttling during active page interactions.
- Monotonic clock measurements resistant to system time jumps (NTP updates, daylight savings).
- Smooth UI rendering and frame synchronization.

## Considered Options

- `setInterval(..., 1000)`
- Web Workers with interval timer
- `requestAnimationFrame` loop driven by `performance.now()`

## Decision Outcome

Chosen option: "requestAnimationFrame loop driven by performance.now()", because `requestAnimationFrame` remains active and responsive during user interactions on Safari and iOS devices, and `performance.now()` offers high-precision monotonic timing.

### Consequences

- Good, because timer throttling on Safari is completely avoided.
- Good, because `performance.now()` provides monotonic elapsed-time measurements.
- Good, because hidden-page intervals are excluded from the practice timer, including when the round ends before the page becomes visible again.
- Neutral, because animation frames pause in background tabs while visibility events separately account for paused time.

### Confirmation

Confirmed in `src/ui/game-controller.ts` and unit tests for hidden, resumed, and stopped-hidden rounds; gameplay timing is also exercised in `tests/e2e/gameplay.spec.ts`.
