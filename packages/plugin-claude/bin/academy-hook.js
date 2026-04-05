import {
  AcademyEngine,
  FileStore,
  mapClaudeHookInputToRawEvents
} from "./chunk-7YEMBPM5.js";

// src/academy-hook.ts
async function readStdinText() {
  const chunks = [];
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return chunks.join("");
}
async function main() {
  const input = await readStdinText();
  const payload = JSON.parse(input);
  const rawEvents = mapClaudeHookInputToRawEvents(payload);
  if (rawEvents.length === 0) {
    return;
  }
  const store = new FileStore();
  const state = await store.load();
  const engine = new AcademyEngine(state);
  for (const rawEvent of rawEvents) {
    engine.process(rawEvent);
  }
  await store.save(engine.snapshot);
}
void main();
