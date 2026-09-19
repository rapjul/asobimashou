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
- Good, because clock elapsed time is exact and monotonic.
- Bad, because the animation frame loop stops when the browser tab is hidden or backgrounded (which naturally pauses practice sessions).

### Confirmation

Confirmed in `src/ui/game-controller.ts` and automated gameplay verification in `tests/e2e/gameplay.spec.ts`.
