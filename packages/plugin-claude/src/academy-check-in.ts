import { FileStore, performBurst, previewBurst, renderBurstResult } from "../../runtime/src/index.js";

async function main() {
  const store = new FileStore();
  const state = await store.load();
  const preview = previewBurst(state);
  const result = performBurst(state);
  await store.save(state);

  process.stdout.write(`${renderBurstResult(result)}\n`);
  if (result.power > 0) {
    process.stdout.write(`Spent effort tag: ${preview.effortTag}\n`);
  }
}

void main();
