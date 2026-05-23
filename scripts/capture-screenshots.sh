#!/bin/bash
# capture-screenshots.sh - Automates screenshot generation for Asobimashou using agent-browser.
#
# Usage:
#   ./scripts/capture-screenshots.sh [-w width] [-h height]

set -euo pipefail

# SCRIPT_DIR: The directory containing this script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# ROOT_DIR: The repository root directory (parent of scripts/).
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PORT=3000
SCREENSHOTS_DIR="assets/images/screenshots"
SERVER_PID=""
VIEWPORT_WIDTH=1500
VIEWPORT_HEIGHT=700

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

trap cleanup EXIT

# Parses command-line arguments to configure the viewport size.
#
# @param {String[]} "$@" - Command line arguments passed to the script.
# @returns {void}
# Parameters:
#   $@ - Command line arguments passed to the script.
# Returns:
#   None
parse_args() {
  while getopts "w:h:" opt; do
    case $opt in
    w)
      if [[ ! "$OPTARG" =~ ^[0-9]+$ ]]; then
        echo "Error: Width must be a positive integer." >&2
        exit 1
      fi
      VIEWPORT_WIDTH="$OPTARG"
      ;;
    h)
      if [[ ! "$OPTARG" =~ ^[0-9]+$ ]]; then
        echo "Error: Height must be a positive integer." >&2
        exit 1
      fi
      VIEWPORT_HEIGHT="$OPTARG"
      ;;
    \?)
      echo "Usage: $0 [-w width] [-h height]" >&2
      exit 1
      ;;
    esac
  done
}

# Main script execution flow.
# Parameters:
#   None
# Returns:
#   None
main() {
  # Change working directory to the repository root.
  cd "$ROOT_DIR"

  # Ensure agent-browser CLI is installed.
  if ! command -v agent-browser &>/dev/null; then
    echo "Error: agent-browser CLI is not installed."
    echo "Please install it via: npm install -g agent-browser"
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

  # Ensure screenshots directory exists.
  mkdir -p "${SCREENSHOTS_DIR}"

  # Run browser automation to capture screenshots.
  echo "Opening browser and setting viewport to ${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT}..."
  agent-browser set viewport "${VIEWPORT_WIDTH}" "${VIEWPORT_HEIGHT}"
  agent-browser open "http://localhost:${PORT}"
  agent-browser wait 1000

  # Clear any active PWA caching toasts before taking screenshots.
  agent-browser eval "document.querySelectorAll('.custom-toast').forEach(el => el.remove())"

  # 1. Capture the start screen (main menu, before options are opened)
  echo "Capturing start screen..."
  agent-browser screenshot "${SCREENSHOTS_DIR}/start_screen.png"
  echo "✓ Screenshot saved to '${SCREENSHOTS_DIR}/start_screen.png'"

  # 2. Capture the options screen (options wrapper expanded/open)
  echo "Opening settings panel..."
  agent-browser click "#option"
  agent-browser wait 800
  echo "Capturing options screen..."
  agent-browser screenshot "${SCREENSHOTS_DIR}/options_screen.png"
  echo "✓ Screenshot saved to '${SCREENSHOTS_DIR}/options_screen.png'"

  # Close options panel before starting game
  agent-browser click "#option"
  agent-browser wait 500

  # 3. Capture the gameplay screen (at the beginning of a new game)
  echo "Starting game..."
  agent-browser click "#start"
  agent-browser wait 1500
  echo "Capturing gameplay start screen..."
  agent-browser screenshot "${SCREENSHOTS_DIR}/gameplay_start.png"
  echo "✓ Screenshot saved to '${SCREENSHOTS_DIR}/gameplay_start.png'"

  # 4. Answer a couple of questions correctly to demonstrate active gameplay and review table
  echo "Answering first question..."
  agent-browser eval "{ const question = document.getElementById('question').childNodes[0].nodeValue.trim(); const romaji = wanakana.toRomaji(wanakana.toHiragana(question, { customKanaMapping: { dzu: 'づ' } })); const inp = document.getElementById('answer'); inp.value = romaji; inp.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' })); }"
  agent-browser wait 1500

  echo "Answering second question..."
  agent-browser eval "{ const question = document.getElementById('question').childNodes[0].nodeValue.trim(); const romaji = wanakana.toRomaji(wanakana.toHiragana(question, { customKanaMapping: { dzu: 'づ' } })); const inp = document.getElementById('answer'); inp.value = romaji; inp.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' })); }"
  agent-browser wait 1500

  echo "Skipping third question..."
  agent-browser click "#skip"
  agent-browser wait 1500

  echo "Capturing gameplay mid screen..."
  agent-browser screenshot "${SCREENSHOTS_DIR}/gameplay_mid.png"
  echo "✓ Screenshot saved to '${SCREENSHOTS_DIR}/gameplay_mid.png'"

  echo "Answering fourth question..."
  agent-browser eval "{ const question = document.getElementById('question').childNodes[0].nodeValue.trim(); const romaji = wanakana.toRomaji(wanakana.toHiragana(question, { customKanaMapping: { dzu: 'づ' } })); const inp = document.getElementById('answer'); inp.value = romaji; inp.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' })); }"
  agent-browser wait 1500

  echo "Answering fifth question..."
  agent-browser eval "{ const question = document.getElementById('question').childNodes[0].nodeValue.trim(); const romaji = wanakana.toRomaji(wanakana.toHiragana(question, { customKanaMapping: { dzu: 'づ' } })); const inp = document.getElementById('answer'); inp.value = romaji; inp.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' })); }"
  agent-browser wait 1500

  echo "Skipping sixth question..."
  agent-browser click "#skip"
  agent-browser wait 1500

  echo "Capturing gameplay late screen..."
  agent-browser screenshot "${SCREENSHOTS_DIR}/gameplay_late.png"
  cp "${SCREENSHOTS_DIR}/gameplay_late.png" assets/images/preview.png
  echo "✓ Screenshot saved to '${SCREENSHOTS_DIR}/gameplay_late.png' (and '${SCREENSHOTS_DIR}/preview.png')"

  # 5. Capture the review screen (at the end of the game after clicking stop/end)
  echo "Ending game..."
  agent-browser click "#stop"
  agent-browser wait 1500
  echo "Capturing review screen..."
  agent-browser screenshot "${SCREENSHOTS_DIR}/review_screen.png"
  echo "✓ Screenshot saved to '${SCREENSHOTS_DIR}/review_screen.png'"

  echo "Closing browser..."
  agent-browser close

  echo "All screenshots generated successfully!"
}

parse_args "$@"
main
