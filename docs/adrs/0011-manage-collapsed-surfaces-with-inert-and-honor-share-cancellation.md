---
status: accepted
date: 2026-09-23
decision-makers: [rapjul]
consulted: []
informed: []
---

# Manage Collapsed Surfaces with HTML inert and Honor Native Share Cancellation Lifecycle

## Context and Problem Statement

When the options panel is collapsed, CSS transitions visually conceal it with zero opacity and height. However, without focus management, its internal `<select>` and `<button>` elements remain in the document's tab order, causing keyboard and assistive technology users to navigate invisible controls.

Additionally, invoking the Web Share API on modern devices triggers a system-level dialog. When a user intentionally dismisses the sheet, `navigator.share` rejects with an `AbortError`. Treating this cancellation as a generic platform failure caused the application to fall back to copying text to the clipboard and displaying an unwanted success notification.

## Decision Drivers

- Maintain accessible focus order and screen reader semantics without relying on heavy UI component frameworks.
- Preserve smooth CSS slide and opacity transitions on collapsible elements.
- Distinguish explicit user cancellation from platform sharing errors in Web Share.
- Avoid polluting the user's clipboard when an action is aborted.

## Considered Options

- Manual `tabIndex = -1` and `aria-hidden` attributes managed recursively across all child nodes.
- Remove the collapsed element from the DOM entirely when closed.
- Apply the HTML `inert` attribute to the collapsed container when closed and handle `AbortError` specifically in the share lifecycle.

## Decision Outcome

Chosen option: "Apply HTML inert and handle AbortError", because:

1. The standard HTML `inert` attribute removes an entire subtree from the tab order and accessibility tree without requiring recursive DOM attribute updates.
2. Checking `error.name === "AbortError"` respects user cancellation intent while preserving clipboard fallbacks for actual environment failures or unsupported browsers.

### Consequences

- Good, because keyboard users tab cleanly past the collapsed options panel.
- Good, because assistive technologies ignore offscreen controls when the menu is closed.
- Good, because dismissing the native share sheet exits cleanly without copying text or flashing a success toast.
- Good, because genuine share failures and non-supporting browsers continue to benefit from the clipboard fallback.
- Neutral, because dynamic tests running in mock DOM environments must support or stub `inert`.

### Confirmation

Verified by unit tests in `./tests/unit/options.test.ts` and `./tests/unit/game-controller.test.ts`.

## More Information

- `./src/ui/options.ts` synchronizes `wrapper.inert` on toggle and `closeOptions`.
- `./index.html` initializes `#option-wrapper` with `inert` before JavaScript runs.
- `./src/ui/game-controller.ts` catches `AbortError` in `shareResults`.
