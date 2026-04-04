# One-Line Install

The repo is now shaped so the repository itself can act as a Claude Code marketplace.

## Fastest Local Install

From the repository root:

```bash
claude plugin marketplace add . && claude plugin install coding-academy@coding-academy
```

This uses the root marketplace manifest:

- `.claude-plugin/marketplace.json`

and installs the synced shareable plugin:

- `plugins/coding-academy`

## Fastest GitHub Install

After publishing the repo to GitHub, the install line becomes:

```bash
claude plugin marketplace add OWNER/REPO --scope user --sparse .claude-plugin plugins && claude plugin install coding-academy@coding-academy
```

Replace `OWNER/REPO` with the real GitHub repository.

The `--sparse .claude-plugin plugins` part keeps checkout small for this monorepo.

## Zero-Install Dev Run

For testing without installing into Claude's plugin manager:

```bash
claude --plugin-dir ./plugins/coding-academy
```

## Maintainer Flow

Whenever plugin runtime files change, refresh the shareable copy:

```bash
pnpm plugin:bundle
```

That updates:

- `plugins/coding-academy`
- `.claude-plugin/marketplace.json`
- `dist/claude-plugin/coding-academy`
- `dist/claude-marketplace/marketplace.json`

## Why This Is The Simplest Path

It keeps the original product goal intact:

- the repo itself is the install source
- no extra packaging service is required
- users can install from a local checkout or from GitHub
- the user-facing install line stays short and memorable
