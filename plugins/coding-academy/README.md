# Claude Plugin Skeleton

This package contains the first Claude Code plugin integration layer for Coding Academy.

## Current State

Implemented:

- plugin metadata
- hook relay script build
- status renderer script build
- hook configuration skeleton
- event ingestion into the shared runtime engine
- development bundle packaging

Not implemented yet:

- user-facing plugin install package
- slash command runtime integration
- visible companion renderer
- production packaging and release flow

## Important Files

- plugin metadata:
  - `.claude-plugin/plugin.json`
- hooks:
  - `hooks/hooks.json`
- relay source:
  - `src/academy-hook.ts`
- status source:
  - `src/academy-status.ts`
- built relay:
  - `bin/academy-hook.js`
- built status:
  - `bin/academy-status.js`

## Runtime Behavior

The relay script:

1. reads Claude hook JSON from stdin
2. maps it into normalized raw events
3. runs the academy engine
4. saves local state

When `CLAUDE_PLUGIN_DATA` is set, local state is written under:

- `CLAUDE_PLUGIN_DATA/academy-state/state.json`

The status script reads the same state store and renders the terminal companion panel.

## Development Install

Fastest path:

- `claude --plugin-dir ./plugins/coding-academy`

One-line local install from the repo root:

- `claude plugin marketplace add . && claude plugin install coding-academy@coding-academy`

Recommended GitHub install after publishing:

- `claude plugin marketplace add OWNER/REPO --scope user --sparse .claude-plugin plugins && claude plugin install coding-academy@coding-academy`

Bundled local marketplace path:

- `pnpm plugin:bundle`
- repo marketplace: `.claude-plugin/marketplace.json`
- repo plugin: `plugins/coding-academy`
- plugin bundle: `dist/claude-plugin/coding-academy`
- marketplace manifest: `dist/claude-marketplace/marketplace.json`
