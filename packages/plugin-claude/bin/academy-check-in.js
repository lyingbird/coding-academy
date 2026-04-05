import {
  FileStore,
  performBurst,
  previewBurst,
  renderBurstResult,
  resolveStateFilePath
} from "./chunk-S6WBFUWA.js";

// src/academy-check-in.ts
async function main() {
  const store = new FileStore(resolveStateFilePath({ workspace: process.env.ACADEMY_WORKSPACE ?? process.cwd() }));
  const state = await store.load();
  const preview = previewBurst(state);
  const result = performBurst(state);
  await store.save(state);
  process.stdout.write(`${renderBurstResult(result)}
`);
  if (result.power > 0) {
    process.stdout.write(`Spent effort tag: ${preview.effortTag}
`);
  }
}
void main();
