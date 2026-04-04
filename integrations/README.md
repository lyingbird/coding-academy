# Integrations

Coding Academy is designed as a shared gameplay runtime with platform-specific adapters on top.

Use this folder as the starting point for wiring external CLIs into the same effort and burst loop.

## Current Adapter Targets

- Claude Code
- Codex CLI
- Gemini CLI
- OpenAI-compatible CLI shells
- Qwen / domestic coding CLI shells
- generic JSON event bridges

## Minimal Relay Pattern

Every wrapper only needs to turn vendor-specific events into one of the supported adapter payloads, then pipe them into:

```bash
academy relay claude
academy relay codex
academy relay gemini
academy relay openai
academy relay qwen
academy relay generic
```

From the repo root during development:

```bash
pnpm relay claude
pnpm relay codex
pnpm relay gemini
pnpm relay openai
pnpm relay qwen
pnpm relay generic
```

## Why This Shape

- gameplay rules stay in one runtime
- burst rewards stay consistent across platforms
- new CLI support only needs an adapter, not a forked game
- domestic tools can plug in through a JSON bridge first, then get native wrappers later

## Suggested Rollout Order

1. Claude Code
2. Codex CLI
3. Gemini CLI
4. OpenAI-compatible wrappers
5. Qwen / domestic wrappers
6. generic community bridges
