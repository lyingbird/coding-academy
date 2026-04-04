# Coding Academy

Coding Academy is a lightweight CLI companion project inspired by Stone Story RPG, Battle! Brave Academy, and bongocat-style desktop companions.

The first goal is simple:

- keep installation low-friction
- keep the companion cute and useful
- visualize real CLI coding work as scouting, battle, victory, fatigue, and growth

## Current Focus

This repository currently implements the V1 foundation:

- shared event and gameplay schema
- runtime engine for normalized gameplay events
- hero companion state machine
- local persistence
- a small CLI demo entry point
- a Claude Code plugin hook relay skeleton

## Workspace

- `packages/shared`
  - common types, enums, and event contracts
- `packages/runtime`
  - gameplay engine, event normalization, persistence
- `packages/cli`
  - local demo CLI for testing the engine
- `packages/plugin-claude`
  - Claude Code plugin skeleton
- `kb`
  - product and implementation notes

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

## Claude Dev Loop

- local plugin loading:
  - `claude --plugin-dir ./plugins/coding-academy`
- repo auto-enable:
  - this repo ships `.claude/settings.json` so trusted workspaces can auto-register the marketplace and enable the plugin
- one-line install from a cloned repo:
  - `claude plugin marketplace add . && claude plugin install coding-academy@coding-academy`
- one-line install after you publish to GitHub:
  - `claude plugin marketplace add OWNER/REPO --scope user --sparse .claude-plugin plugins && claude plugin install coding-academy@coding-academy`
- bundled dev marketplace:
  - run `pnpm plugin:bundle`
  - install from `dist/claude-marketplace/marketplace.json`
- live companion panel:
  - run `pnpm watch` in a separate terminal while Claude Code is active

## What Already Works

- the local demo can simulate a full scout -> damage -> victory loop
- state persists in `.academy/state.json`
- `pnpm status` renders a lightweight terminal companion panel by default
- Claude-style hook payloads can be ingested by:
  - `packages/plugin-claude/bin/academy-hook.js`
- a shareable plugin is synced into the repo at:
  - `plugins/coding-academy`
- the repo itself now exposes a marketplace manifest at:
  - `.claude-plugin/marketplace.json`
- a bundled local plugin package can be produced in:
  - `dist/claude-plugin/coding-academy`
- a bundled local marketplace manifest can be produced in:
  - `dist/claude-marketplace/marketplace.json`
- plugin-mode persistence uses `CLAUDE_PLUGIN_DATA/academy-state/state.json` when available
- the repo ships project-level Claude settings at:
  - `.claude/settings.json`

## Product Principle

Cute before deep.

The companion should be fun and easy to keep running every day before it becomes mechanically complex.
