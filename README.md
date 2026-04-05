# Coding Academy

Coding Academy is a sidecar companion platform for AI coding CLIs.

The product target is simple:

- keep a cute buddy visible beside the terminal
- do not interrupt normal vibecoding
- let real coding activity push maps, fights, loot, and growth in the background

It is inspired by Stone Story RPG, Battle! Brave Academy, bongocat-style companions, and the always-visible `/buddy` interaction pattern.

The current repo already has the shared runtime and host communication backbone.
The next product step is to turn that backbone into a true sidecar-first experience.

See the current replan here:

- [Replan](D:\工作\CLI_GAMEPLAY\kb\01_REPLAN_SIDECAR_PLATFORM.md)

The runtime turns real AI coding work into a tiny auto-battling adventure:

- reads and searches become scouting
- edits and patches become attacks
- failed checks become enemy hits
- completed tasks become victories, streaks, and souvenirs
- combos, clues, tiny chests, and monster journal entries keep the feedback loop hot
- vibecoding downtime becomes a low-pressure charge phase instead of dead air

## Product Direction

Coding Academy is no longer framed as a slash-command page or a repo-local `pnpm` toy.

It now has three product layers:

- `host integrations`
  - Claude Code, Codex CLI, Gemini CLI, GPT-style shells, Qwen, domestic wrappers
- `academy hub`
  - one local event bus and shared state model
- `sidecar shell`
  - the actual player-facing buddy

The main player fantasy is:

- code normally
- keep the buddy at the side
- watch it scout, fight, and push the run quietly
- trigger a check-in only when you want a payoff

## Core Communication Model

Coding Academy now treats communication with AI CLIs as a first-class product problem.

The communication stack is split into three layers:

- `host`
  - Claude Code, Codex CLI, Gemini CLI, OpenAI-compatible shells, Qwen, or domestic wrappers
- `adapter`
  - translates host-specific events into Academy raw events
- `academy hub`
  - a local loopback event bus that feeds one shared game runtime and state file

That means the game logic only exists once.

Different AI tools do **not** each get their own combat logic.
They only emit lifecycle events such as:

- prompt submitted
- files read
- search performed
- patch applied
- command started
- tests passed / failed
- task completed

The Academy Hub then turns those events into:

- scouting
- enemy encounters
- damage
- victories
- burst charge
- loot
- check-in recaps

If the hub is offline, wrappers and hooks fall back to local state writes. If the hub is online, every host can feed the same hero run.

## Project Layout

- `packages/shared`
  - common types, enums, and event contracts
- `packages/runtime`
  - gameplay engine, event normalization, persistence
- `packages/cli`
  - host wrappers, health checks, and developer utilities
- `packages/sidecar-shell`
  - the new dedicated front-end shell for the always-visible buddy
- `packages/plugin-claude`
  - Claude Code plugin source
- `packages/runtime/src/adapters`
  - platform adapter mappers for Claude, Codex, Gemini, and generic CLI payloads
- `integrations`
  - sample payloads and rollout notes for multi-CLI bridges
- `plugins/coding-academy`
  - shareable plugin synced for one-line install
- `.claude-plugin/marketplace.json`
  - repo-level marketplace manifest

## Commands

- `pnpm install`
- `pnpm start`
- `pnpm hub`
- `pnpm play`
- `pnpm demo`
- `pnpm status`
- `pnpm panel`
- `pnpm watch`
- `pnpm health`
- `pnpm sidecar:shell`
- `pnpm check-in`
- `pnpm codex`
- `pnpm gemini`
- `pnpm qwen`
- `pnpm openai`
- `pnpm ingest`
- `pnpm relay`
- `pnpm emit`
- `pnpm relay:file`
- `pnpm adapters`
- `pnpm adapter`
- `pnpm scaffold`
- `pnpm bridge:init`
- `pnpm wrap`
- `pnpm wrap:codex`
- `pnpm wrap:gemini`
- `pnpm wrap:openai`
- `pnpm wrap:qwen`
- `pnpm build`
- `pnpm typecheck`
- `pnpm plugin:build`
- `pnpm plugin:bundle`
- `pnpm plugin:validate`

## Current Platform Coverage

The current adapter layer already includes starter mappers for:

- Claude Code
- Codex CLI
- Gemini CLI
- OpenAI-compatible CLI wrappers
- Qwen / domestic coding CLIs
- generic CLI payloads

That means future wrappers for domestic tools or OpenAI-compatible agent shells can plug into the same reward loop instead of forking the game.

## Multi-CLI Communication

The recommended path for real multi-CLI use is:

1. start the local Academy Hub once
2. let Claude/Codex/Gemini/Qwen wrappers emit events into it
3. keep one sidecar companion watching the resulting state

Start the hub:

```bash
pnpm hub
```

Inspect hub status:

```bash
pnpm hub status
pnpm health -- --json
```

Emit provider payloads into the shared runtime:

```bash
pnpm emit codex
pnpm emit gemini
pnpm emit qwen
pnpm emit openai
```

`emit` reads provider JSON from stdin, maps it through the adapter layer, and pushes it into the Academy Hub when available.

If the hub is not running, the same command still works by writing directly to the workspace state file.

This is the key compatibility contract for future GPT or domestic AI wrappers:

- emit JSON
- map it through an adapter
- feed the local Academy Hub

## Install

From a local clone:

```bash
claude plugin marketplace add . && claude plugin install coding-academy
```

From GitHub:

```bash
claude plugin marketplace add lyingbird/coding-academy --scope user --sparse .claude-plugin plugins && claude plugin install coding-academy
```

## Claude Integration

Claude is now treated as one host integration, not the whole product.

The Claude flow is:

1. install the plugin once in a system terminal
2. open `claude` from any terminal
3. type `/coding-academy`

Inside Claude, the intended command is:

```text
/coding-academy
```

To cash out a run without leaving Claude:

```text
/coding-academy-check-in
```

The older lower-level status command still exists:

```text
/academy:status
```

Slash commands are helper controls.
They are not the final product shape.

The long-term player-facing target is still a persistent sidecar, not a full chat-page command.

## Local Contributor Flow

Developer entry point:

```bash
pnpm start
```

Check what is actually ready on this machine:

```bash
pnpm health
pnpm health -- --json
```

The loop is intentionally simple:

```bash
pnpm codex -- --help
pnpm gemini -- --help
pnpm qwen -- --help
pnpm openai -- --help
```

Then cash out the run:

```bash
pnpm check-in
```

`check-in` now gives you two layers:

- the payout
- a short recap of the run's main enemy and effort style

Legacy smart entry point:

```bash
pnpm play
```

What `pnpm play` still does:

- launches real Claude mode if your Claude session is healthy
- falls back to the local demo if Claude auth or org access is broken
- tells you exactly how to recover real mode

## macOS / Windows

The current runtime and wrapper flow are designed to work on both macOS and Windows:

- command discovery uses platform-aware checks
- wrapper spawning only forces shell mode on Windows
- storage paths use Node path utilities instead of hardcoded separators
- generated bridge starters now inherit the same Windows/macOS shell behavior

Use `pnpm health` on any machine to see which provider commands are ready, missing, or need fixing.

This repo also ships a GitHub Actions smoke matrix for:

- Windows
- macOS

It typechecks, builds, runs `pnpm health -- --json`, and executes wrapper smoke runs with safe `node --version` overrides.

Direct real-mode run:

```bash
claude
```

Choose a lightweight vibe strategy any time:

```bash
pnpm strategy cozy
pnpm strategy flow
pnpm strategy rush
```

- `cozy`
  - safer, calmer, good for long waiting stretches
- `flow`
  - balanced default, keeps momentum smooth
- `rush`
  - turns charge into combo spikes for a hotter payoff

Cash out a quiet vibecoding stretch when you feel like checking in:

```bash
pnpm burst
pnpm check-in
pnpm burst cozy
pnpm burst flow
pnpm burst rush
```

`burst` turns your background effort into a short release card:

- estimated token spend
- prompt / edit / validation mix
- a release result based on your chosen stance
- XP, clues, combo, and possible chest payout

Generic adapter ingestion entry:

```bash
pnpm ingest claude
pnpm ingest codex
pnpm ingest gemini
pnpm ingest openai
pnpm ingest qwen
pnpm ingest generic
```

Relay alias:

```bash
pnpm relay codex
pnpm relay gemini
pnpm relay openai
pnpm relay qwen
```

Relay from saved files:

```bash
pnpm relay:file codex integrations/codex.sample.json
pnpm relay:file gemini integrations/gemini.sample.json
pnpm relay:file openai integrations/openai.sample.json
pnpm relay:file qwen integrations/qwen.sample.json
```

Show supported adapter names:

```bash
pnpm adapters
```

Show one adapter in detail:

```bash
pnpm adapter codex
pnpm adapter qwen
```

Scaffold a starter bridge payload:

```bash
pnpm scaffold codex
pnpm scaffold openai .tmp/openai.bridge.json
```

Initialize a wrapper project starter for a target CLI:

```bash
pnpm bridge:init codex
pnpm bridge:init qwen .bridges/qwen-domestic
```

Run a real CLI command through Coding Academy without writing a custom bridge first:

```bash
pnpm wrap codex --cmd node -- -e "console.log('codex batch ok')"
pnpm wrap:codex -- --help
pnpm wrap:gemini -- --help
```

Wrapper notes:

- best for one-shot or batch CLI calls first
- emits session start, optional prompt, command lifecycle, victory/failure, and session end
- if you already know the prompt text, pass `--prompt "..."` to improve token and effort tracking
- if a run succeeds and you want a cleaner archive reward, pass `--summary "what this run accomplished"`

## What Already Works

- the local demo can simulate a full scout -> damage -> victory loop
- state persists in `.academy/state.json`
- `pnpm status` renders a lightweight terminal companion panel by default
- the hero now tracks strategy, charge, combo, focus, clues, tiny chests, and a small monster journal
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
