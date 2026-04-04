# Claude Plugin Dev Install

This step keeps the original goal intact:

- one local plugin directory
- one local marketplace artifact
- as little manual setup as possible while we are still building

## Fastest Development Path

Use Claude Code's local plugin loading mode:

```bash
claude --plugin-dir ./packages/plugin-claude
```

This is the shortest feedback loop during development.

## Bundled Dev Marketplace

Build a redistributable local plugin bundle:

```bash
pnpm plugin:bundle
```

This writes:

- `dist/claude-plugin/coding-academy`
- `dist/claude-marketplace/marketplace.json`

The intended local test flow is:

1. Start Claude Code from the repo parent directory.
2. Add the local marketplace.
3. Install `coding-academy` from that marketplace.

## Current Plugin Surfaces

- hooks:
  - session start
  - prompt submit
  - pre-tool use
  - post-tool use
  - post-tool failure for bash
  - stop
- command:
  - `/coding-academy:academy-status`

## Why This Matters

We are not optimizing for deep mechanics first.

We are optimizing for:

- local install feeling effortless
- the hero waking up as soon as Claude starts working
- a plugin package that can later move into a real marketplace without being restructured
