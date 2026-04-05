# Academy Bridge Protocol

Coding Academy talks to Claude Code, Codex, Gemini, GPT-style shells, and domestic coding CLIs through one local bridge model:

1. the host emits lifecycle JSON
2. an adapter maps that JSON into Academy raw events
3. the local Academy Hub applies those events to the shared game runtime

## Why this exists

Without a bridge layer, every host would need its own:

- combat logic
- charge rules
- burst payout rules
- journal logic
- sidecar sync rules

That would fork the product.

The bridge keeps the product single-source:

- one runtime
- many adapters
- many wrappers

## Runtime contract

An Academy bridge envelope can contain either:

- `events`
  - already-normalized Academy raw events
- `adapter + payload`
  - host-specific payload plus the adapter key to translate it

Optional target routing:

- `target.workspace`
  - use this workspace's `.academy/state.json`
- `target.storageDir`
  - use a custom storage folder
- `target.stateFile`
  - use an explicit state file

## Local Hub

Start once per machine or once per coding session:

```bash
academy hub
```

or in this repo:

```bash
pnpm hub
```

The hub writes a local manifest under the user home directory and listens on loopback only.

Hosts then push events with:

```bash
academy emit codex < some-event.json
academy emit gemini < some-event.json
academy emit qwen < some-event.json
academy emit openai < some-event.json
```

If the hub is offline, the exact same bridge path falls back to local state writes so gameplay still works.

## Recommended host event shape

Every host should be able to express at least:

- prompt submitted
- file read
- search performed
- file edited
- patch applied
- command started
- command succeeded
- command failed
- tests passed / failed
- summary written
- session ended

That is enough to make the buddy:

- scout
- spot monsters
- take damage
- land hits
- win fights
- build burst charge
- produce recap loot

## Product rule

Hosts are translators, not game engines.

All game meaning lives in the Academy runtime.
