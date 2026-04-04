import { AcademyEngine } from "@academy/runtime";
import { FileStore } from "@academy/runtime";
import { mapClaudeHookInputToRawEvents } from "@academy/runtime";
import type { PersistedState, RawEvent } from "@academy/shared";
import { renderPersistedPanel, renderUpdatePanel } from "./renderer.js";

async function readStdinText(): Promise<string> {
  const chunks: string[] = [];
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return chunks.join("");
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
    case "hook":
      await runHook();
      return;
    default:
      console.error(`Unknown command: ${command}`);
      process.exitCode = 1;
  }
}

void main();
