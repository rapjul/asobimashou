# AGENTS.md — Asobimashou

AI agent guidance for the **Asobimashou** Japanese Kana practice web app.
This file captures architectural decisions, established conventions, and
important gotchas discovered during development.

---

## Project Overview

A vanilla HTML/CSS/JS PWA for practising Japanese Hiragana and Katakana reading.
No build step. No framework. Served directly via `npx serve .` (or `npm run dev`).

**Tech stack**

| Layer         | Technology                            |
|---------------|---------------------------------------|
| Structure     | HTML5 (`index.html`, `offline.html`)  |
| Style         | Vanilla CSS (`assets/css/style.css`)  |
| Logic         | Vanilla JS (`assets/js/script.js`)    |
| IME           | WanaKana (`assets/js/wanakana.min.js`)|
| UI components | Bootstrap 5 (local copy)              |
| PWA           | Service Worker (`serviceWorker.js`)   |
| SW register   | `assets/js/sw-register.js`            |
| Vocab data    | `assets/js/cards.js`                  |

---

## Conventions

### Code style

- **Indentation**: 2 spaces for all file types (HTML, CSS, JS, JSON, YAML).
  Markdown uses 4 spaces. Enforced by `.editorconfig`.
- **Line endings**: LF (Unix). Enforced by `.editorconfig`.
- **Comments**: Every function, method, parameter, and type must have a JSDoc
  comment. This is a hard project rule — do not omit them.
- **CSS variables**: All theme colors must be defined as CSS custom properties
  in `:root` (light mode) and `body.bg-dark` (dark mode). Never hard-code hex
  values directly in selectors.

### Commit style

Follow **Conventional Commits**. Scopes in use:

| Scope    | Usage example                                |
|----------|----------------------------------------------|
| `game`   | Timer, scoring, question flow                |
| `style`  | CSS / visual changes                         |
| `sw`     | Service worker / PWA caching                 |
| `config` | `.editorconfig`, `.hintrc`, `.vscode/`       |

---

## Architectural Decisions

### 1. Timer: `requestAnimationFrame` + `performance.now()`

**Decision**: Use a `requestAnimationFrame` loop driven by `performance.now()`
instead of `setInterval` for the game timer.

**Why**: Safari (macOS and iOS) throttles `setInterval` with a 1-second period
and silently kills it after the first fire. `requestAnimationFrame` is immune
to this throttling while the user is actively interacting with the page.
`performance.now()` is a monotonic clock — it does not jump if the system clock
changes mid-session (NTP, DST, user edits).

**Pattern**:

```js
let timerInterval = null;   // rAF handle
let gameStartTime  = null;  // performance.now() snapshot

// Start
gameStartTime = performance.now();
(function tickLoop() {
  const elapsed = Math.floor((performance.now() - gameStartTime) / 1000);
  if (elapsed !== GAME.timer) {
    GAME.timer = elapsed;
    timeEl.innerHTML = ...;
  }
  timerInterval = requestAnimationFrame(tickLoop);
}());

// Stop / restart
cancelAnimationFrame(timerInterval);
timerInterval = null;
```

**Previous approach (abandoned)**: `setInterval(..., 1000)` — worked on
Chromium/Edge but died after one tick on Safari.

---

### 2. CSS colour architecture: semantic CSS variables

**Decision**: All colors are CSS custom properties scoped to `:root` and
`body.bg-dark`. Selectors consume `var(--name)` — never raw hex values.

**Variable catalogue** (light → dark):

| Variable                | Light            | Dark              | Purpose                          |
|-------------------------|------------------|-------------------|----------------------------------|
| `--app-bg`              | `#f2f2f2`        | `#212529`         | Main application background      |
| `--result-bg`           | `#e5e5e5`        | `#181a1b`         | Review screen (slightly darker)  |
| `--table-hover-bg`      | `#d6d6d6`        | `#3a3a3a`         | Table row hover                  |
| `--scrollbar-track-bg`  | rgba(228…, 0.25) | rgba(228…, 0.15)  | Custom scrollbar track           |
| `--scrollbar-thumb-bg`  | rgba(161…, 0.25) | rgba(161…, 0.15)  | Custom scrollbar thumb           |
| `--input-focus-shadow`  | `gray`           | rgba(255…, 0.2)   | Answer input focus glow          |
| `--input-focus-border`  | `#ced4da`        | `#495057`         | Select element focus border      |
| `--kbd-shadow`          | rgba(0…, 0.1)    | rgba(255…, 0.1)   | `<kbd>` box-shadow               |
| `--btn-dark-hover-bg`   | `#343a40`        | (same)            | Dark button hover state          |
| `--btn-light-hover-bg`  | `#e2e6ea`        | (same)            | Light button hover state         |
| `--toast-bg`            | rgba(255…, 0.9)  | rgba(33…, 0.9)    | Toast notification background    |
| `--toast-border`        | rgba(0…, 0.1)    | rgba(255…, 0.15)  | Toast notification border        |
| `--toast-color`         | `#212529`        | `#f8f9fa`         | Toast notification text          |
| `--toast-shadow`        | rgba(0…, 0.15)   | rgba(0…, 0.4)     | Toast notification drop shadow   |

**Rule**: When adding new styled elements, define variables in `:root` and
`body.bg-dark` first, then reference them in the selector.

---

### 3. Toast notifications for Romaji input hints

**Decision**: When a user types a Romaji answer that is missing a required
apostrophe (e.g. `tenin` instead of `ten'in` for `てんいん`), accept the answer
as correct but immediately display a transient toast notification showing the
correct spelling with the apostrophe.

**Why**: The apostrophe for `ん` before a vowel or `y` is a genuine Romaji
rule, but enforcing it as a hard error would frustrate learners. A toast keeps
the focus on learning Kana, not Romaji punctuation.

**Implementation files**: `assets/js/script.js` (`showApostropheToast`),
`assets/css/style.css` (`.custom-toast`, `#toast-container`),
`index.html` (`#toast-container`).

---

### 4. Service worker fetch strategy: network-first + stale-while-revalidate

**Strategies in use**:

| Request type              | Strategy               |
|---------------------------|------------------------|
| HTML (`navigate`)         | Network-first          |
| JS / CSS / fonts / images | Stale-while-revalidate |

**Network-first for HTML**: Every navigation hits the network first. On
success the cache is refreshed; on failure the cached shell or `./offline.html`
is served. Guarantees Safari never indefinitely serves a stale page.

**Stale-while-revalidate for static assets**: The cache is served immediately
(fast load), then a background fetch updates the cache entry for the next visit.
Users always get a responsive load and always get fresh assets on the following
visit — no manual version bump required for routine edits.

**How updates are loaded**:
Because static assets use stale-while-revalidate, when an update is deployed:

1. On the **first load/visit**, the browser immediately renders the page using the *stale* (old) cached JS/CSS files.
2. Simultaneously, the Service Worker triggers a background fetch to get the *new* JS/CSS files and updates the cache.
3. The user must **reload the page** (typically after a brief moment for the background fetch to finish) to load and execute the new version.

**Flow for a cached static asset**:

```
Request arrives
  ↓
Cache hit? → respond immediately from cache
           → background: fetch network → update cache (silent, non-blocking)
           → if network fails AND cache existed: console.warn in SW scope
Cache miss? → fetch network → cache → serve (same as before)
```

**Offline warning**: When the background revalidation fetch fails and a cached
copy was already served, the SW emits:

```
[asobimashou SW] Offline — serving stale cache for: <url>
```

This is visible in the browser's **DevTools → Console** (with "All contexts"
or "Service Worker" selected). It does not interrupt the user experience.

**When to still bump `CACHE_NAME`**: Stale-while-revalidate keeps cache
entries fresh automatically for files that already exist in the cache. You must
still bump `CACHE_NAME` (e.g. `offline-v6`) when:

- A file is **deleted or renamed** — the old cache entry would otherwise linger.
- A **hard reset** of all caches is needed (e.g. emergency rollback).

The `activate` event purges any cache whose name does not match `CACHE_NAME`,
so bumping it is sufficient.

**Offline fallback order** (navigation, no network):

1. Try to match the exact URL in cache
2. Fall back to `./offline.html`

**PWA guarantee**: All assets listed in `toCache` are pre-fetched during the
SW `install` event, so the app is fully playable offline from the first visit.

**Practical effects**:

| Scenario | What happens |
|----------|--------------|
| You update `script.js` or `style.css` | First visit serves the stale cached version while fetching the update in the background; a subsequent page reload executes the updated version |
| User is fully offline | Cached assets are served instantly; SW logs a `console.warn` per asset in the browser's DevTools |
| First ever visit (nothing cached yet) | Every asset is fetched from the network and cached; subsequent visits are fast |
| You delete or rename a cached file | Old cache entry lingers until `CACHE_NAME` is bumped, and the SW reactivates |
| You need a forced hard reset | Bump `CACHE_NAME` — the `activate` event purges all older caches on next visit |

---

### 5. Review screen: solid background, slide-in from bottom

**Decision**: The `#result` review screen uses `var(--result-bg)` with
`!important` to guarantee the main game view is fully obscured. It animates in
from the bottom (`top: 100% → slide-in class`) symmetrically with its exit
animation.

**Implementation note**: A browser reflow (`void result.offsetHeight;`) must be
triggered after removing `d-none` and before adding `slide-in`. Without it,
the browser skips the initial `top: 100%` state and the slide-in transition
does not execute.

---

### 6. Tab key as End Game shortcut (for Desktop only)

**Decision**: Keep the `Tab` keydown on `#answer` → `#stop.click()` shortcut.

**Context**: The shortcut is intentional for desktop use; iOS users should use the on-screen
End button.

**Hint**: The `<kbd>Tab</kbd>` hint is shown only on non-touch devices via
`.hint-keyboard` (`@media (pointer: coarse) { display: none }`).

---

### 7. Kana mapping: `dzu` → `づ`

**Decision**: WanaKana is configured with `customKanaMapping: { dzu: 'づ' }` in
the keyup answer handler. This ensures `dzu` maps to `づ` (voiced version) rather
than the default behaviour.

---

### 8. Indentation: 2-space spaces throughout

**Decision**: 2-space indentation with LF endings for all source files (HTML,
CSS, JS, JSON, YAML). Markdown uses 4 spaces for list indentation.

**Why spaces over tabs**: The entire codebase predated this decision and was
already written with spaces. Switching to tabs would produce a noisy, semantically
empty diff. Web tooling (Prettier, ESLint defaults) also prefers spaces.

**Why 2 over 4 spaces in JS**: Reduces horizontal pressure given Bootstrap's
deeply nested HTML structure and the long selector chains in CSS. Consistent
with the HTML and CSS files.

---

## Known Gotchas

### Safari `setInterval` throttling

Safari aggressively throttles `setInterval` — it can fire once and then die
silently without throwing an error. **Never rely on `setInterval` for game
state timing.** Use `requestAnimationFrame` + `performance.now()` instead.

### Service worker cache persistence in Safari

Safari does not automatically clear the SW cache when `CACHE_NAME` changes.
The old SW keeps serving the old cache until **all tabs** for the origin are
closed and reopened. There is no JS API to force this faster.

To manually clear during development:
> Safari → Settings → Privacy → Manage Website Data → Remove

### WanaKana `bind` on `#answer`

WanaKana is bound to the answer input. `agent-browser fill` sets `.value`
directly, bypassing the IME layer. To test the answer comparison in automation,
manually dispatch a `keyup` event after setting `.value` to trigger the handler:

```js
answerInput.value = 'tenin';
answerInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'n' }));
```

### `cards.js` structure

`cards.js` exports a global `cards` object. The first two lines enable the
Start button:

```js
const startBtn = document.getElementById('start');
startBtn.disabled = false;
```

The deck key used at runtime is `SETTINGS.card` (e.g. `"Random"`, `"JLPT"`).
Card objects have at minimum `hiragana` and `romaji` properties.

---

## Development Workflow

```bash
# Start local server
npx serve .

# Verify timer (agent-browser)
agent-browser open http://localhost:<port>
agent-browser click @<start-button-ref>
agent-browser wait 3000
agent-browser eval "document.getElementById('time').innerText"
# Expect: "3" (or higher)
```

Bump `CACHE_NAME` in `serviceWorker.js` after any change to cached assets to
invalidate Safari's SW cache on next visit.
