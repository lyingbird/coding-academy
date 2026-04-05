import {
  FileStore,
  performBurst,
  previewBurst,
  renderBurstResult
} from "./chunk-7YEMBPM5.js";

// src/academy-check-in.ts
async function main() {
  const store = new FileStore();
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
