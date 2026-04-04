# Coding Academy

Coding Academy is a lightweight CLI companion project inspired by Stone Story RPG, Battle! Brave Academy, and bongocat-style desktop companions.

It turns real Claude Code work into a tiny auto-battling adventure:

- reads and searches become scouting
- edits and patches become attacks
- failed checks become enemy hits
- completed tasks become victories, streaks, and souvenirs
- combos, clues, tiny chests, and monster journal entries keep the feedback loop hot

## Project Layout

- `packages/shared`
  - common types, enums, and event contracts
- `packages/runtime`
  - gameplay engine, event normalization, persistence
- `packages/cli`
  - local demo CLI for testing the engine
- `packages/plugin-claude`
  - Claude Code plugin source
- `plugins/coding-academy`
  - shareable plugin synced for one-line install
- `.claude-plugin/marketplace.json`
  - repo-level marketplace manifest

## Commands

- `pnpm install`
- `pnpm demo`
- `pnpm status`
- `pnpm panel`
- `pnpm watch`
- `pnpm build`
- `pnpm typecheck`
- `pnpm plugin:build`
- `pnpm plugin:bundle`
- `pnpm plugin:validate`

## Install

From a local clone:

```bash
claude plugin marketplace add . && claude plugin install coding-academy
```

From GitHub:

```bash
claude plugin marketplace add lyingbird/coding-academy --scope user --sparse .claude-plugin plugins && claude plugin install coding-academy
```

Quick local dev run:

```bash
claude --plugin-dir ./plugins/coding-academy
```

## What Already Works

- the local demo can simulate a full scout -> damage -> victory loop
- state persists in `.academy/state.json`
- `pnpm status` renders a lightweight terminal companion panel by default
- the hero now tracks combo, focus, clues, tiny chests, and a small monster journal
- Claude-style hook payloads can be ingested by:
  - `packages/plugin-claude/bin/academy-hook.js`
- a shareable plugin is synced into the repo at:
  - `plugins/coding-academy`
- the repo exposes a marketplace manifest at:
  - `.claude-plugin/marketplace.json`
- plugin-mode persistence uses `CLAUDE_PLUGIN_DATA/academy-state/state.json` when available
- the repo ships project-level Claude settings at:
  - `.claude/settings.json`

## Product Principle

Cute before deep.

The companion should be fun and easy to keep running every day before it becomes mechanically complex.

## Repository

- GitHub: `https://github.com/lyingbird/coding-academy`
