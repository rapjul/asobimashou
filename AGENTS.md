# AGENTS.md — Asobimashou

AI agent guidance for the **Asobimashou** Japanese Kana practice web app.
This file captures architectural decisions, established conventions, and
important gotchas discovered during development.

---

## Project Overview

A modern TypeScript PWA for practising Japanese Hiragana and Katakana reading.
Built with Vite, tested with Vitest and Playwright.

**Tech stack**

| Layer         | Technology                                          |
| ------------- | --------------------------------------------------- |
| Build & Dev   | Vite (`vite.config.ts`)                             |
| Structure     | HTML5 (`index.html`)                                |
| Style         | Vanilla CSS (`assets/css/style.css`)                |
| Logic         | TypeScript (`src/main.ts`, `src/ui/`, `src/logic/`) |
| IME           | WanaKana (`wanakana` npm package)                   |
| UI components | Bootstrap 5 (`bootstrap` npm package)               |
| PWA & SW      | Vite PWA & Workbox (`virtual:pwa-register`)         |
| Vocab data    | JSON (`src/data/jlpt.json`, `src/data/random.json`) |
| Testing       | Vitest (Unit) & Playwright (E2E)                    |

---

## Conventions

### Code style

- **Indentation**: Tabs (width 4) for HTML, JS, TS, and Shell scripts.
  4 spaces for Markdown. 2 spaces for CSS, JSON, and YAML.
  Enforced by `.editorconfig` and Prettier.
- **Line endings**: LF (Unix). Enforced by `.editorconfig`.
- **Comments**: Every function, method, parameter, and type must have a JSDoc
  comment. This is a hard project rule — do not omit them.
- **CSS variables**: All theme colors must be defined as CSS custom properties in `:root` (light mode) and `body.bg-dark` (dark mode). Never hard-code hex values directly in selectors.

### Commit style

Follow **Conventional Commits**. Scopes in use:

| Scope    | Usage example                          |
| -------- | -------------------------------------- |
| `game`   | Timer, scoring, question flow          |
| `style`  | CSS / visual changes                   |
| `sw`     | Service worker / PWA caching           |
| `config` | `.editorconfig`, `.hintrc`, `.vscode/` |

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

| Variable               | Light            | Dark             | Purpose                         |
| ---------------------- | ---------------- | ---------------- | ------------------------------- |
| `--app-bg`             | `#f2f2f2`        | `#212529`        | Main application background     |
| `--result-bg`          | `#e5e5e5`        | `#181a1b`        | Review screen (slightly darker) |
| `--table-hover-bg`     | `#d6d6d6`        | `#3a3a3a`        | Table row hover                 |
| `--scrollbar-track-bg` | rgba(228…, 0.25) | rgba(228…, 0.15) | Custom scrollbar track          |
| `--scrollbar-thumb-bg` | rgba(161…, 0.25) | rgba(161…, 0.15) | Custom scrollbar thumb          |
| `--input-focus-shadow` | `gray`           | rgba(255…, 0.2)  | Answer input focus glow         |
| `--input-focus-border` | `#ced4da`        | `#495057`        | Select element focus border     |
| `--kbd-shadow`         | rgba(0…, 0.1)    | rgba(255…, 0.1)  | `<kbd>` box-shadow              |
| `--btn-dark-hover-bg`  | `#343a40`        | (same)           | Dark button hover state         |
| `--btn-light-hover-bg` | `#e2e6ea`        | (same)           | Light button hover state        |
| `--toast-bg`           | rgba(255…, 0.9)  | rgba(33…, 0.9)   | Toast notification background   |
| `--toast-border`       | rgba(0…, 0.1)    | rgba(255…, 0.15) | Toast notification border       |
| `--toast-color`        | `#212529`        | `#f8f9fa`        | Toast notification text         |
| `--toast-shadow`       | rgba(0…, 0.15)   | rgba(0…, 0.4)    | Toast notification drop shadow  |
| `--opt-border-1`       | `#6c757d`        | `#adb5bd`        | Option group 1 border           |
| `--opt-border-2`       | `#adb5bd`        | `#6c757d`        | Option group 2 border           |
| `--opt-border-3`       | `#495057`        | `#dee2e6`        | Option group 3 border           |

**Rule**: When adding new styled elements, define variables in `:root` and
`body.bg-dark` first, then reference them in the selector.

---

### 3. Toast notifications for Romaji input hints

**Decision**:

- **Apostrophe Hints**: When a user types a Romaji answer that is missing a required apostrophe (e.g. `tenin` instead of `ten'in` for `てんいん`), accept the answer as correct but immediately display a transient toast notification showing the correct spelling with the apostrophe.
- **Vowel Lengthening Hints**: When a user types a hyphen `-` or `ー`, or gets an answer incorrect on a card containing the vowel lengthening character `ー`, display a transient toast notification reminding them to duplicate the preceding vowel (e.g., write `ii` for `iー`).

**Why**:

- The apostrophe and vowel lengthening rules are genuine Romaji constraints, but enforcing them strictly as errors blocks the flow of learning Kana. Toasts keep the focus on practice while providing passive instruction.

**Implementation files**: `src/ui/game-controller.ts`, `src/ui/toasts.ts`, `assets/css/style.css` (`.custom-toast`, `#toast-container`), and `index.html` (`#toast-container`).

---

### 4. Service worker caching and update lifecycle

**Strategies in use**:

| Request type                | Strategy                                           |
| --------------------------- | -------------------------------------------------- |
| HTML (`navigate`)           | Serve the precached `index.html` application shell |
| Built JS / CSS / JSON / img | Precache during service worker installation        |
| Bootstrap icon font         | Precache during service worker installation        |
| Optional Japanese fonts     | Workbox `CacheFirst`; cached when selected online  |

Vite PWA generates a Workbox precache manifest from the production build. The new worker installs the build assets before it can activate, and Workbox serves the precached application shell for offline navigation. Workbox removes outdated precache entries when the new worker activates; do not maintain a separate manual cache version. On activation, a migration script also deletes only the known `offline-v7` cache left by the former hand-written worker.

Bundled optional Japanese fonts are cached in `fonts-cache` when selected while online. Offline, cached optional fonts remain available, uncached optional fonts are disabled, and system fonts stay available. A saved uncached font falls back to `system-ui` with a notice; reconnecting restores the saved font choice.

With `registerType: "prompt"`, a new worker waits for an explicit reload. The app shows a persistent Reload notice at home or after the current round reaches its result screen. Starting a round hides the notice; an update does not interrupt active play.

After a successful service worker install, the app shell, compiled code, vocabulary chunks, and declared static images are available offline. Optional Japanese fonts become available offline after the player selects them while online.

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

**Decision**: Keep the `Tab` keydown on `#answer` as an End Game shortcut.

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

### 8. Indentation: Tabs for HTML/JS/TS/Shell, 4 spaces for Markdown, 2 spaces for CSS/JSON/YAML

**Decision**: Literal tab indentation (`\t` at 4-column display width) for HTML, JS, TS,
and Shell scripts. 4 spaces for Markdown files. 2 spaces for CSS, JSON, and YAML files.
All enforced by `.editorconfig` and Prettier.

**Rationale**: Hard tabs allow individual developers to display indentation at their preferred
width in their editor without modifying file bytes, while 4 spaces in Markdown conforms to
standard CommonMark/GFM list syntax, and 2 spaces in JSON and CSS keeps data structures
and selectors compact.

---

### 9. Webpage and PWA Icons: Font Availability and Rendering

**Decision**: The static asset generation script (`scripts/generate-icons.sh`) must ensure that the specific fonts referenced in the source SVG are installed on the local system/runner before conversion.

**Why**:

- Browsers render SVG fonts dynamically by fetching external links (e.g., Google Fonts `<link>` tag in `icon-previewer.html`).
- Local command-line rendering tools (like `rsvg-convert`, `imagemagick`, and `inkscape`) run offline and do not resolve remote font URLs. If a font like `Outfit` is not installed on the system, the rendering tool will silently fall back to `sans-serif` (e.g., Arial or Helvetica), resulting in layout shifts or incorrect styling in the generated PNG icons.

**Implementation**:

- The `scripts/generate-icons.sh` script scans the target SVG file for specific fonts (`Outfit`, `Klee One`, `Noto Serif JP`, `Yuji Syuku`).
- If missing, it downloads the corresponding `.ttf` from the Google Fonts upstream repository and installs it locally:
    - **macOS**: `~/Library/Fonts/` (native CoreText registers files written here immediately).
    - **Linux**: `~/.local/share/fonts/` (user-local directory for fontconfig).
- If `fc-cache` is present (common on Linux and on macOS when Homebrew installs graphical dependencies), it runs `fc-cache -f` to rebuild the Fontconfig cache, ensuring command-line utilities immediately see the new font.

---

### 10. Broadened diacritic filtering pattern

**Decision**: The `dakutenRegex` includes both Hiragana and Katakana voiced and semi-voiced characters (including `ゔ` and `ヴ`). In addition, the game filtering loop checks both the Hiragana (`h`) and Kanji/Katakana (`k`) properties of the cards:
`if (!SETTINGS.dakuten && (dakutenRegex.test(h) || dakutenRegex.test(k))) continue;`

**Why**: This aligns Katakana Dakuten/Handakuten handling with other phonetic filters (e.g., small vowels, doubled consonants) and ensures consistent filtering across all Hiragana/Katakana game modes.

---

## Known Gotchas

### Safari `setInterval` throttling

Safari aggressively throttles `setInterval` — it can fire once and then die
silently without throwing an error. **Never rely on `setInterval` for game
state timing.** Use `requestAnimationFrame` + `performance.now()` instead.

### Service worker updates during gameplay

The app leaves an updated worker waiting while a round is active. It displays a persistent Reload notice at home or after the result screen; do not switch the registration to automatic activation, because that can interrupt an active round. To reset PWA state during development, clear site data for the local origin in the browser's developer tools. Local apps served with the same scheme, hostname, and port share an origin; registrations with overlapping service worker scopes can update one another. Use a different port for another local app (for example, `npm run dev -- --port 5174`) or unregister the stale worker in DevTools → Application → Service Workers before reusing a port.

### Answer input and WanaKana conversion

The answer handler converts typed Romaji with WanaKana on `keyup`.
`agent-browser fill` sets `.value` directly and does not fire that handler. To
test answer comparison in automation, dispatch `keyup` after setting `.value`:

```js
answerInput.value = "tenin";
answerInput.dispatchEvent(new KeyboardEvent("keyup", { key: "n" }));
```

### Vocabulary JSON structure

The selected deck is loaded dynamically from `src/data/jlpt.json` or
`src/data/random.json` according to `SETTINGS.card`. Cards contain `kanji`,
`hiragana` (a string or an array of alternate readings), and `meaning` fields.
Romaji is derived from the selected Hiragana reading at runtime.

---

## Development Workflow

```bash
# Start local dev server
npm run dev

# Run unit tests and coverage
npm run test:coverage

# Run Playwright E2E tests
npm run test:e2e

# Build and preview production PWA
npm run build
npm run preview
```

Vitest V8 coverage includes runtime TypeScript under `src/`, including application startup and UI modules. Type-only declarations and the logic re-export barrel are excluded; Playwright separately verifies browser behavior across engines.

### Architectural Decision Records (ADRs)

Detailed architectural decision records are documented in `./docs/adrs/`:

- `0001-use-typescript-for-application-logic.md`
- `0002-adopt-vite-build-and-dev-tool.md`
- `0003-extract-vocabulary-into-json-with-integrity-tests.md`
- `0004-migrate-service-worker-to-vite-pwa.md`
- `0005-use-vitest-and-playwright-for-testing.md`
- `0006-requestanimationframe-performance-now-timer.md`
- `0007-semantic-css-custom-properties-for-theming.md`
- `0008-transient-toast-notifications-for-romaji-hints.md`
- `0009-client-side-session-csv-export.md`
- `0010-preserve-player-choices-and-finish-rounds-safely.md`
- `0011-manage-collapsed-surfaces-with-inert-and-honor-share-cancellation.md`
