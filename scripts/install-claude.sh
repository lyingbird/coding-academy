#!/usr/bin/env bash
set -euo pipefail

marketplace_name="coding-academy"
marketplace_repo="lyingbird/coding-academy"
plugin_name="coding-academy"
plugin_full_name="coding-academy@coding-academy"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

claude_running() {
  if command -v pgrep >/dev/null 2>&1; then
    pgrep -x claude >/dev/null 2>&1 && return 0
    pgrep -x Claude >/dev/null 2>&1 && return 0
  fi
  return 1
}

ensure_marketplace() {
  if claude plugin marketplace list 2>/dev/null | grep -Eq "^[[:space:]]*>[[:space:]]+${marketplace_name}[[:space:]]*$"; then
    echo "Refreshing marketplace..."
    claude plugin marketplace update "$marketplace_name"
    return
  fi

  echo "Adding marketplace..."
  claude plugin marketplace add "$marketplace_repo" --scope user --sparse .claude-plugin plugins
}

refresh_plugin() {
  if claude plugin list 2>/dev/null | grep -Fq "$plugin_full_name"; then
    echo "Refreshing plugin..."
    claude plugin uninstall "$plugin_full_name" >/dev/null || true
  else
    echo "Installing plugin..."
  fi

  claude plugin install "$plugin_name"
}

echo
echo "Coding Academy setup"
echo "--------------------"
echo

require_command claude
ensure_marketplace
refresh_plugin

echo
echo "Done."
if claude_running; then
  echo "Close every Claude window once so the new slash command refreshes."
fi
echo
echo "Start in 3 steps:"
echo "  1. Open any terminal"
echo "  2. Run: claude"
echo "  3. In Claude, type: /coding-academy"
echo
echo "When you want a payoff, type: /coding-academy-check-in"
echo
