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
echo "Next:"
echo "  1. Restart Claude Code"
echo "  2. Enter /coding-academy"
echo "  3. Keep coding normally"
echo
