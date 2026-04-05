#!/usr/bin/env bash
set -euo pipefail

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

echo
echo "== Coding Academy installer =="
echo

require_command claude

if claude plugin marketplace list 2>/dev/null | grep -Eq '^[[:space:]]*>[[:space:]]+coding-academy[[:space:]]*$'; then
  echo "Updating marketplace cache..."
  claude plugin marketplace update coding-academy
else
  echo "Adding marketplace..."
  claude plugin marketplace add "$marketplace_repo" --scope user --sparse .claude-plugin plugins
fi

if claude plugin list 2>/dev/null | grep -Fq "$plugin_full_name"; then
  echo "Refreshing installed plugin..."
  claude plugin uninstall "$plugin_full_name" >/dev/null || true
fi

echo "Installing plugin..."
claude plugin install "$plugin_name"

echo
echo "Coding Academy is ready."
if claude_running; then
  echo "Claude Code appears to be running right now."
  echo "Please fully close all Claude windows first so the new commands refresh cleanly."
  echo
fi
echo "First run:"
echo "  1. Open any terminal"
echo "  2. Run: claude"
echo "  3. Enter: /coding-academy"
echo "  4. Keep coding normally while the buddy pushes maps on the side"
echo "  5. Cash out with: /coding-academy-check-in"
echo
