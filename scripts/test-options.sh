#!/usr/bin/env bash
# test-options.sh - Automates verification of the Options section layout stability,
# interaction with all options groups, and closing shortcuts.
#
# Usage:
#   ./scripts/test-options.sh

set -euo pipefail

# SCRIPT_DIR: The directory containing this script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# ROOT_DIR: The repository root directory.
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PORT=3002
SERVER_PID=""

# Viewport dimensions
VIEWPORT_NORMAL_WIDTH="${VIEWPORT_NORMAL_WIDTH:-1280}"
VIEWPORT_NORMAL_HEIGHT="${VIEWPORT_NORMAL_HEIGHT:-900}"
VIEWPORT_CONSTRAINED_WIDTH="${VIEWPORT_CONSTRAINED_WIDTH:-500}"
VIEWPORT_CONSTRAINED_HEIGHT="${VIEWPORT_CONSTRAINED_HEIGHT:-600}"

# Stop the background server on script exit.
# Parameters:
#   None
# Returns:
#   None
cleanup() {
  if [ -n "${SERVER_PID}" ]; then
    echo "Stopping local server (PID ${SERVER_PID})..."
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}

# Register cleanup function to be called on exit
trap cleanup EXIT

# Main verification flow.
# Parameters:
#   None
# Returns:
#   None
main() {
  cd "$ROOT_DIR"

  # Ensure agent-browser CLI is installed.
  if ! command -v agent-browser &>/dev/null; then
    echo "Error: agent-browser CLI is not installed."
    exit 1
  fi

  echo "Starting local web server on port ${PORT}..."
  npx serve -l "${PORT}" . >/dev/null 2>&1 &
  SERVER_PID=$!

  echo "Waiting for local server to become responsive..."
  local success=false
  for _ in {1..20}; do
    if curl -s "http://localhost:${PORT}" >/dev/null; then
      success=true
      break
    fi
    sleep 0.5
  done

  if [ "$success" = false ]; then
    echo "Error: Server failed to start on port ${PORT} within 10 seconds."
    exit 1
  fi

  echo "✓ Server is up and running."

  echo "Opening browser and loading app..."
  agent-browser open "http://localhost:${PORT}"
  agent-browser wait 1000

  echo "Clearing service workers and cache to ensure fresh assets..."
  agent-browser eval "(async () => { if (navigator.serviceWorker) { const regs = await navigator.serviceWorker.getRegistrations(); for (const reg of regs) { await reg.unregister(); } } if (window.caches) { const keys = await caches.keys(); for (const key of keys) { await caches.delete(key); } } window.location.reload(); })()"
  agent-browser wait 1500

  echo "Setting viewport to ${VIEWPORT_NORMAL_WIDTH}x${VIEWPORT_NORMAL_HEIGHT}..."
  agent-browser set viewport "${VIEWPORT_NORMAL_WIDTH}" "${VIEWPORT_NORMAL_HEIGHT}"
  agent-browser wait 500

  # Helper: verify width and height stability
  # Parameters:
  #   $1 - Description of the state being tested
  verify_dimensions() {
    local label=$1
    local width
    local offset_h
    local scroll_h

    width=$(agent-browser eval "document.querySelector('#option-wrapper').offsetWidth")
    offset_h=$(agent-browser eval "document.querySelector('#option-wrapper').offsetHeight")
    scroll_h=$(agent-browser eval "document.querySelector('#option-wrapper').scrollHeight")

    echo "Checking dimensions: ${label} (width: ${width}px, offsetHeight: ${offset_h}px, scrollHeight: ${scroll_h}px)"

    if [ "${width}" != "400" ]; then
      echo "✗ FAIL: Width is not stable at 400px (got ${width}px)"
      local debug_info
      debug_info=$(agent-browser eval "const g = document.querySelector('#main-menu-group'); JSON.stringify({width: g?.offsetWidth, styleWidth: g ? window.getComputedStyle(g).width : null, classes: g?.className, inlineStyle: g?.style.cssText, cssRules: Array.from(document.styleSheets).flatMap(s => { try { return Array.from(s.cssRules || []); } catch(e) { return []; } }).filter(r => r.selectorText && r.selectorText.includes('main-menu-group')).map(r => r.cssText)})")
      echo "Debug info: ${debug_info}"
      exit 1
    fi

    if ((scroll_h > offset_h)); then
      echo "✗ FAIL: Options content is cut off (scrollHeight ${scroll_h}px > offsetHeight ${offset_h}px)"
      exit 1
    fi
    echo "✓ Passed."
  }

  echo "Opening Options panel..."
  agent-browser click "#option"
  agent-browser wait 500
  verify_dimensions "Opened (default Hiragana mode)"

  # 1. Interact with Font Selection Group
  echo "Changing Font Selection..."
  agent-browser eval "const f = document.getElementById('game-font'); f.value = 'Klee One'; f.dispatchEvent(new Event('change'));"
  agent-browser wait 200
  verify_dimensions "After Font Selection"

  # 2. Interact with Theme Selection Group
  echo "Changing Theme Selection..."
  agent-browser click "button.game-theme[value='dark']"
  agent-browser wait 200
  verify_dimensions "After Theme Selection (Dark)"

  # 3. Interact with Kanji Display Group
  echo "Toggling Show Kanji..."
  agent-browser click "#game-kanji"
  agent-browser wait 600
  verify_dimensions "After Kanji Toggle"

  # 4. Switch to Katakana mode to show Small Vowels and Vowel Length filters
  echo "Switching to Katakana Mode..."
  agent-browser click "#game-katakana"
  agent-browser wait 600
  verify_dimensions "After Switching to Katakana Mode"

  # Take standard viewport screenshots
  echo "Taking screenshot of options panel at standard viewport (${VIEWPORT_NORMAL_WIDTH}x${VIEWPORT_NORMAL_HEIGHT})..."
  mkdir -p assets/images/screenshots
  agent-browser screenshot "$ROOT_DIR/assets/images/screenshots/options_screen_${VIEWPORT_NORMAL_WIDTH}x${VIEWPORT_NORMAL_HEIGHT}.png"

  echo "Navigating to extra options screen..."
  agent-browser click "#options-btn-more"
  agent-browser wait 500
  verify_dimensions "Extra Options Screen (Katakana mode)"

  echo "Taking screenshot of extra options panel at standard viewport (${VIEWPORT_NORMAL_WIDTH}x${VIEWPORT_NORMAL_HEIGHT})..."
  agent-browser screenshot "$ROOT_DIR/assets/images/screenshots/options_screen_${VIEWPORT_NORMAL_WIDTH}x${VIEWPORT_NORMAL_HEIGHT}_extra.png"

  echo "Returning to primary options screen..."
  agent-browser click "#options-btn-back"
  agent-browser wait 500
  verify_dimensions "Primary Options Screen (Katakana mode)"

  # Test viewport constraint (${VIEWPORT_CONSTRAINED_WIDTH}x${VIEWPORT_CONSTRAINED_HEIGHT})
  echo "Scaling viewport to ${VIEWPORT_CONSTRAINED_WIDTH}x${VIEWPORT_CONSTRAINED_HEIGHT} for layout constraint check..."
  agent-browser set viewport "${VIEWPORT_CONSTRAINED_WIDTH}" "${VIEWPORT_CONSTRAINED_HEIGHT}"
  agent-browser wait 500
  verify_dimensions "Primary Options at ${VIEWPORT_CONSTRAINED_WIDTH}x${VIEWPORT_CONSTRAINED_HEIGHT} Viewport"

  echo "Verifying title visibility under layout constraint..."
  local title_visible
  title_visible=$(agent-browser eval "(() => { const el = document.querySelector('#title-wrapper'); if (!el) return false; const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; })()")
  if [ "${title_visible}" != "true" ]; then
    echo "✗ FAIL: Title wrapper is not visible in ${VIEWPORT_CONSTRAINED_WIDTH}x${VIEWPORT_CONSTRAINED_HEIGHT} viewport (obscured or scrolled off)"
    exit 1
  fi
  echo "✓ Title wrapper is visible under layout constraint."

  echo "Taking screenshot of primary options panel under layout constraint (${VIEWPORT_CONSTRAINED_WIDTH}x${VIEWPORT_CONSTRAINED_HEIGHT})..."
  agent-browser screenshot "$ROOT_DIR/assets/images/screenshots/options_screen_${VIEWPORT_CONSTRAINED_WIDTH}x${VIEWPORT_CONSTRAINED_HEIGHT}.png"

  echo "Navigating to extra options screen at ${VIEWPORT_CONSTRAINED_WIDTH}x${VIEWPORT_CONSTRAINED_HEIGHT}..."
  agent-browser click "#options-btn-more"
  agent-browser wait 500
  verify_dimensions "Extra Options at ${VIEWPORT_CONSTRAINED_WIDTH}x${VIEWPORT_CONSTRAINED_HEIGHT} Viewport"

  echo "Taking screenshot of extra options panel under layout constraint (${VIEWPORT_CONSTRAINED_WIDTH}x${VIEWPORT_CONSTRAINED_HEIGHT})..."
  agent-browser screenshot "$ROOT_DIR/assets/images/screenshots/options_screen_${VIEWPORT_CONSTRAINED_WIDTH}x${VIEWPORT_CONSTRAINED_HEIGHT}_extra.png"

  echo "Returning to primary options screen at ${VIEWPORT_CONSTRAINED_WIDTH}x${VIEWPORT_CONSTRAINED_HEIGHT}..."
  agent-browser click "#options-btn-back"
  agent-browser wait 500
  verify_dimensions "Primary Options at ${VIEWPORT_CONSTRAINED_WIDTH}x${VIEWPORT_CONSTRAINED_HEIGHT} Viewport"

  # Restore standard viewport
  echo "Restoring viewport to ${VIEWPORT_NORMAL_WIDTH}x${VIEWPORT_NORMAL_HEIGHT}..."
  agent-browser set viewport "${VIEWPORT_NORMAL_WIDTH}" "${VIEWPORT_NORMAL_HEIGHT}"
  agent-browser wait 500

  # 5. Interact with Deck Selection Group
  echo "Changing Deck Selection..."
  agent-browser click "button.game-card[value='JLPT']"
  agent-browser wait 600
  verify_dimensions "After Deck Selection (JLPT)"

  # 6. Interact with Phonetic Filters Group (including small/length)
  echo "Navigating to extra options screen for phonetic filters..."
  agent-browser click "#options-btn-more"
  agent-browser wait 500
  verify_dimensions "Extra Options Screen before toggling"

  echo "Toggling Dakuten Filter..."
  agent-browser click "#game-dakuten"
  agent-browser wait 600
  verify_dimensions "After Dakuten Toggle"

  echo "Toggling Small Vowels Filter..."
  agent-browser click "#game-smallvowel"
  agent-browser wait 600
  verify_dimensions "After Small Vowels Toggle"

  echo "Toggling Vowel Length Filter..."
  agent-browser click "#game-vowellength"
  agent-browser wait 600
  verify_dimensions "After Vowel Length Toggle"

  # 7. Test options hover text stability
  echo "Testing hover description width and cutoff stability..."
  agent-browser hover "#game-smallvowel"
  agent-browser wait 200
  verify_dimensions "Hovering Small Vowels"

  echo "Returning to primary options screen..."
  agent-browser click "#options-btn-back"
  agent-browser wait 500
  verify_dimensions "Primary Options Screen before close"

  # 8. Test Escape key closing
  echo "Testing Escape key closing..."
  agent-browser press Escape
  agent-browser wait 500
  local is_open
  is_open=$(agent-browser eval "document.querySelector('#option-wrapper').classList.contains('collapsed') ? 'true' : 'false'")
  if [ "${is_open}" = "true" ]; then
    echo "✗ FAIL: Escape key did not close options"
    exit 1
  fi
  echo "✓ Options closed via Escape."

  # 9. Test click outside closing
  echo "Re-opening Options panel..."
  agent-browser click "#option"
  agent-browser wait 500
  echo "Clicking outside Options panel..."
  agent-browser click "body"
  agent-browser wait 500
  is_open=$(agent-browser eval "document.querySelector('#option-wrapper').classList.contains('collapsed') ? 'true' : 'false'")
  if [ "${is_open}" = "true" ]; then
    echo "✗ FAIL: Clicking outside did not close options"
    exit 1
  fi
  echo "✓ Options closed via Click Outside."

  echo "Closing browser..."
  agent-browser close

  echo "======================================"
  echo "✓ All options layout and closing tests passed!"
  echo "======================================"
}

main
