import { AcademyEngine } from "@academy/runtime";
import { FileStore } from "@academy/runtime";
import { mapCodexInputToRawEvents } from "@academy/runtime";
import { mapClaudeHookInputToRawEvents } from "@academy/runtime";
import { mapGeminiInputToRawEvents } from "@academy/runtime";
import { mapGenericInputToRawEvents } from "@academy/runtime";
import { mapOpenAiCliInputToRawEvents } from "@academy/runtime";
import { mapQwenCodeInputToRawEvents } from "@academy/runtime";
import { performBurst, previewBurst, renderBurstResult } from "@academy/runtime";
import type { AdapterPlatform, PersistedState, RawEvent, StrategyMode } from "@academy/shared";
import { renderPersistedPanel, renderUpdatePanel } from "./renderer.js";

async function readStdinText(): Promise<string> {
  const chunks: string[] = [];
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return chunks.join("").replace(/^\uFEFF/, "").trim();
}

function createEvent(sessionId: string, type: RawEvent["type"], payload?: Record<string, unknown>): RawEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    sessionId,
    payload,
  };
}

function printUpdate(update: ReturnType<AcademyEngine["process"]>, state: PersistedState) {
  console.log(renderUpdatePanel(update, state));
}

async function runDemo() {
  const store = new FileStore();
  const persisted = await store.load();
  const engine = new AcademyEngine(persisted);
  const sessionId = `demo-${Date.now()}`;

  const script: RawEvent[] = [
    createEvent(sessionId, "session.started"),
    createEvent(sessionId, "prompt.submitted"),
    createEvent(sessionId, "search.performed"),
    createEvent(sessionId, "file.read"),
    createEvent(sessionId, "command.started", { command: "pnpm test", majorCheck: true }),
    createEvent(sessionId, "tests.failed"),
    createEvent(sessionId, "file.edited"),
    createEvent(sessionId, "patch.applied"),
    createEvent(sessionId, "tests.passed", { majorCheck: true }),
    createEvent(sessionId, "summary.written"),
    createEvent(sessionId, "task.completed"),
    createEvent(sessionId, "session.ended"),
  ];

  for (const rawEvent of script) {
    const update = engine.process(rawEvent);
    if (update.gameplayEvents.length === 0) {
      continue;
    }
    printUpdate(update, engine.snapshot);
  }

  await store.save(engine.snapshot);
  console.log(`saved=${store.path}`);
}

async function runStatus() {
  const store = new FileStore();
  const persisted = await store.load();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(persisted, null, 2));
    return;
  }
  console.log(renderPersistedPanel(persisted));
}

async function runWatch() {
  const store = new FileStore();
  let lastRendered = "";

  while (true) {
    const persisted = await store.load();
    const panel = renderPersistedPanel(persisted);
    if (panel !== lastRendered) {
      console.clear();
      console.log(panel);
      console.log(`\nWatching ${store.path}`);
      lastRendered = panel;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

function parseStrategy(input?: string): StrategyMode | null {
  const normalized = input?.trim().toLowerCase();
  switch (normalized) {
    case "cozy":
      return "Cozy";
    case "flow":
      return "Flow";
    case "rush":
      return "Rush";
    default:
      return null;
  }
}

async function runStrategy() {
  const store = new FileStore();
  const persisted = await store.load();
  const selected = parseStrategy(process.argv[3]);

  if (!selected) {
    console.log(`Current strategy: ${persisted.profile.strategy}`);
    console.log("Available strategies: cozy, flow, rush");
    console.log("Use: pnpm strategy cozy|flow|rush");
    return;
  }

  persisted.profile.strategy = selected;
  await store.save(persisted);
  console.log(`Strategy set to ${selected}.`);
  console.log(renderPersistedPanel(persisted));
}

async function runBurst() {
  const store = new FileStore();
  const persisted = await store.load();
  const selected = parseStrategy(process.argv[3]);

  if (selected) {
    persisted.profile.strategy = selected;
  }

  const preview = previewBurst(persisted);
  const result = performBurst(persisted);
  await store.save(persisted);

  console.log(renderPersistedPanel(persisted));
  console.log();
  console.log(renderBurstResult(result));
  if (result.power > 0) {
    console.log(`Spent effort tag: ${preview.effortTag}`);
  }
}

async function runHook() {
  const input = await readStdinText();
  const hookPayload = JSON.parse(input);
  const rawEvents = mapClaudeHookInputToRawEvents(hookPayload);
  if (rawEvents.length === 0) {
    return;
  }

  const store = new FileStore();
  const persisted = await store.load();
  const engine = new AcademyEngine(persisted);

  for (const rawEvent of rawEvents) {
    engine.process(rawEvent);
  }

  await store.save(engine.snapshot);
}

function parseAdapter(input?: string): AdapterPlatform | null {
  const normalized = input?.trim().toLowerCase();
  switch (normalized) {
    case "claude":
    case "claude-code":
      return "claude-code";
    case "codex":
    case "codex-cli":
      return "codex-cli";
    case "gemini":
    case "gemini-cli":
      return "gemini-cli";
    case "openai":
    case "openai-cli":
      return "openai-cli";
    case "qwen":
    case "qwen-code":
      return "qwen-code";
    case "generic":
    case "generic-cli":
      return "generic-cli";
    default:
      return null;
  }
}

function mapAdapterPayload(adapter: AdapterPlatform, payload: unknown): RawEvent[] {
  switch (adapter) {
    case "claude-code":
      return mapClaudeHookInputToRawEvents(payload as Record<string, unknown>);
    case "codex-cli":
      return mapCodexInputToRawEvents(payload as Record<string, unknown>);
    case "gemini-cli":
      return mapGeminiInputToRawEvents(payload as Record<string, unknown>);
    case "openai-cli":
      return mapOpenAiCliInputToRawEvents(payload as Record<string, unknown>);
    case "qwen-code":
      return mapQwenCodeInputToRawEvents(payload as Record<string, unknown>);
    case "generic-cli":
      return mapGenericInputToRawEvents(payload as Record<string, unknown>);
    default:
      return [];
  }
}

async function runIngest() {
  const adapter = parseAdapter(process.argv[3]);
  if (!adapter) {
    console.error("Use: pnpm ingest claude|codex|gemini|openai|qwen|generic");
    process.exitCode = 1;
    return;
  }

  const input = await readStdinText();
  const payload = JSON.parse(input);
  const rawEvents = mapAdapterPayload(adapter, payload);
  if (rawEvents.length === 0) {
    console.log(`No raw events mapped for ${adapter}.`);
    return;
  }

  const store = new FileStore();
  const persisted = await store.load();
  const engine = new AcademyEngine(persisted);

  for (const rawEvent of rawEvents) {
    engine.process(rawEvent);
  }

  await store.save(engine.snapshot);
  console.log(renderPersistedPanel(engine.snapshot));
}

async function main() {
  const command = process.argv[2] ?? "demo";
  switch (command) {
    case "demo":
      await runDemo();
      return;
    case "status":
    case "panel":
      await runStatus();
      return;
    case "watch":
      await runWatch();
      return;
    case "strategy":
      await runStrategy();
      return;
    case "burst":
      await runBurst();
      return;
    case "hook":
      await runHook();
      return;
    case "ingest":
    case "relay":
      await runIngest();
      return;
    default:
      console.error(`Unknown command: ${command}`);
      process.exitCode = 1;
  }
}

void main();
