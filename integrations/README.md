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

Relay a saved payload file instead of piping stdin:

```bash
pnpm relay:file codex integrations/codex.sample.json
pnpm relay:file gemini integrations/gemini.sample.json
pnpm relay:file openai integrations/openai.sample.json
pnpm relay:file qwen integrations/qwen.sample.json
```

List the supported adapters and bridge entry names:

```bash
pnpm adapters
```

Show one adapter in detail:

```bash
pnpm adapter codex
pnpm adapter qwen
```

Scaffold a starter payload into your own path:

```bash
pnpm scaffold codex
pnpm scaffold openai .tmp/openai.bridge.json
```

Initialize a bridge wrapper starter project:

```bash
pnpm bridge:init codex
pnpm bridge:init gemini .bridges/gemini
pnpm bridge:init qwen .bridges/qwen-domestic
```

Each generated bridge starter includes:

- `bridge.mjs`
- `sample-event.json`
- `package.json`
- `README.md`

## Fast Wrapper Path

If you do not want to write a bridge yet, wrap a real CLI command directly:

```bash
pnpm codex -- --help
pnpm gemini -- --help
pnpm qwen -- --help
pnpm openai -- --help
pnpm wrap codex --cmd node -- -e "console.log('codex batch ok')"
pnpm wrap:codex -- --help
pnpm wrap:gemini -- --help
pnpm wrap:qwen -- --help
```

This is a lifecycle wrapper, not a deep protocol adapter.

It is useful when you want:

- a low-friction first integration
- burst rewards around real batch runs
- a stepping stone before building a native bridge

## Why This Shape

- gameplay rules stay in one runtime
- burst rewards stay consistent across platforms
- new CLI support only needs an adapter, not a forked game
- domestic tools can plug in through a JSON bridge first, then get native wrappers later

## Generic JSON Bridge

Use [generic-bridge.schema.json](D:\工作\CLI_GAMEPLAY\integrations\generic-bridge.schema.json) when a CLI cannot be wrapped natively yet.

The rule is simple:

- emit an `events` array of normalized `RawEvent` objects
- pipe that JSON into `academy relay generic`
- keep vendor specifics outside the runtime

## Suggested Rollout Order

1. Claude Code
2. Codex CLI
3. Gemini CLI
4. OpenAI-compatible wrappers
5. Qwen / domestic wrappers
6. generic community bridges
