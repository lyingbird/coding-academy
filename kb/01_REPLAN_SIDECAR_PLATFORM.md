# Coding Academy Replan

## One-line definition

Coding Academy is a sidecar companion platform for AI coding CLIs.

It should live next to the user's terminal, stay out of the way, and turn real coding activity into a visible lightweight adventure.

## What was wrong with the previous direction

The old direction drifted toward:

- slash-command pages
- repo-local `pnpm` entry points
- status dashboards that felt like tooling instead of play

That is not the right player path.

The user does not want a page that explains the game.
The user wants a small buddy that keeps pushing the map while they work.

## New product principles

### 1. Sidecar first

The primary form is a sidecar companion:

- visible beside the terminal
- persistent through a coding session
- low-noise by default
- expressive only at key moments

### 2. Host-agnostic by design

Coding Academy is not a Claude-only plugin.

It should work with:

- Claude Code
- Codex CLI
- Gemini CLI
- GPT-style OpenAI-compatible shells
- Qwen and domestic coding CLIs
- future wrappers that can emit JSON lifecycle events

### 3. One runtime, many hosts

All gameplay meaning lives in one shared runtime.

Hosts do not own game logic.
Hosts only emit lifecycle events.

### 4. Cute before deep

The user should first feel:

- "it is alive"
- "it is moving while I work"
- "I can glance at it and smile"

Depth comes later.

## Product shape

The product now has three layers.

### A. Host integrations

These are thin adapters:

- Claude plugin hooks
- Codex wrapper
- Gemini wrapper
- OpenAI-compatible wrapper
- Qwen wrapper
- generic bridge for custom domestic tools

Responsibility:

- observe host lifecycle
- emit normalized events

### B. Academy Hub

This is the local event bus.

Responsibility:

- receive events from any host
- route them to the correct workspace state
- keep one shared hero run alive

### C. Sidecar shell

This is the actual player-facing product.

Responsibility:

- render the companion
- show current enemy / route / mood / loot
- animate key moments lightly
- stay visible without interrupting coding

## Player path

The correct player path is no longer:

- open repo
- run `pnpm`
- read a status page

The correct path should become:

1. install once
2. open their AI CLI normally
3. start the sidecar companion
4. keep coding
5. glance at the buddy when they want
6. optionally trigger check-in / burst

## Distribution targets

We should explicitly support two product shapes.

### Shape 1. Claude-compatible plugin edition

This is constrained by Claude's plugin API.

Primary behavior:

- plugin hooks feed Academy Hub
- slash commands are helper controls
- sidecar is external, not the main chat pane

Goal:

- closest possible buddy-like experience without requiring Claude internals

### Shape 2. Academy native shell edition

This is the long-term ideal.

Primary behavior:

- own wrapper around Codex / Gemini / Qwen / generic CLIs
- built-in sidecar layout
- narrow-width fallback like buddy
- richer control over persistent UI

Goal:

- true embedded companion experience

## What to keep

- shared schema
- runtime battle economy
- adapter layer
- Academy Hub
- sidecar rendering direction

## What to demote

- full-screen slash help pages
- repo-local `pnpm` player messaging
- dashboard-heavy status framing

These can stay as developer tools, but not as the main product story.

## V2 implementation order

### Phase 1. Stabilize the platform core

- keep Academy Hub as the communication backbone
- make all hosts write to the same shape
- make state routing explicit per workspace

### Phase 2. Build a real sidecar shell

- dedicate one package to sidecar UX
- make it visually cute and compact
- add short bubbles and lightweight motion states

### Phase 3. Reframe host integrations

- Claude plugin launches / focuses sidecar
- Codex / Gemini / Qwen wrappers feed the same run
- slash commands become controls, not the product itself

### Phase 4. Native shell experiment

- explore an embedded terminal-side companion layout
- copy the good interaction principles from buddy:
  - side presence
  - narrow fallback
  - sparse speech
  - strong character silhouette

## Non-goals right now

- heavy academy management
- complex economy
- dense stats dashboards
- forcing all play through Claude slash commands
- building a bespoke GUI app before the sidecar shell is proven

## Immediate next coding steps

1. Add a dedicated `packages/sidecar-shell`
2. Move player-facing sidecar rendering there
3. Reduce `README` to the new product story
4. Reposition Claude plugin as one host integration, not the whole product
