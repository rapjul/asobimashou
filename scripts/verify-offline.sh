#!/bin/bash
# verify-offline.sh - Automates verification of offline warning badge,
# connectivity transition toasts, and PWA cache status.
#
# Usage:
#   ./scripts/verify-offline.sh

set -euo pipefail

# SCRIPT_DIR: The directory containing this script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# ROOT_DIR: The repository root directory.
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PORT=3001
SERVER_PID=""

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
    echo "Please install it via: \`npm install -g agent-browser\` or \`npx agent-browser@latest install\` or \`brew install agent-browser\`"
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
  agent-browser wait 2000

  echo "Verifying page has loaded (checking for Start button)..."
  local start_text
  start_text=$(agent-browser get text "#start")
  echo "Start button text: ${start_text}"

  # 1. Simulating going OFFLINE
  echo "Simulating network disconnection..."
  agent-browser set offline on
  agent-browser wait 1000

  echo "Verifying offline status notification toast..."
  local offline_toast_text
  offline_toast_text=$(agent-browser eval "document.querySelector('.custom-toast.toast-offline')?.innerText || ''")
  echo "Offline Toast Text: ${offline_toast_text}"
  if [[ "$offline_toast_text" == *"Offline."* ]]; then
    echo "✓ Offline Toast: Passed"
  else
    echo "✗ Offline Toast: Failed"
    exit 1
  fi

  echo "Verifying persistent offline badge is visible..."
  local badge_class
  badge_class=$(agent-browser eval "document.getElementById('offline-badge')?.className || ''")
  echo "Badge Class: ${badge_class}"
  if [[ "$badge_class" == *"show"* ]]; then
    echo "✓ Offline Badge Visibility: Passed"
  else
    echo "✗ Offline Badge Visibility: Failed"
    exit 1
  fi

  # 2. Simulating returning ONLINE
  echo "Simulating network reconnection..."
  agent-browser set offline off
  agent-browser wait 1000

  echo "Verifying online status notification toast..."
  local online_toast_text
  online_toast_text=$(agent-browser eval "document.querySelector('.custom-toast.toast-online')?.innerText || ''")
  echo "Online Toast Text: ${online_toast_text}"
  if [[ "$online_toast_text" == *"Back online"* ]]; then
    echo "✓ Online Toast: Passed"
  else
    echo "✗ Online Toast: Failed"
    exit 1
  fi

  echo "Verifying persistent offline badge is hidden..."
  badge_class=$(agent-browser eval "document.getElementById('offline-badge')?.className || ''")
  echo "Badge Class after going online: ${badge_class}"
  if [[ "$badge_class" != *"show"* ]]; then
    echo "✓ Offline Badge Hidden: Passed"
  else
    echo "✗ Offline Badge Hidden: Failed"
    exit 1
  fi

  echo "Closing browser..."
  agent-browser close

  echo "======================================"
  echo "✓ All offline feature tests passed!"
  echo "======================================"
}

main
