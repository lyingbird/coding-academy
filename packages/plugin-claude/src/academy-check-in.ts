import { FileStore, performBurst, previewBurst, renderBurstResult, resolveStateFilePath } from "../../runtime/src/index.js";

async function main() {
  const store = new FileStore(resolveStateFilePath({ workspace: process.env.ACADEMY_WORKSPACE ?? process.cwd() }));
  const state = await store.load();
  const preview = previewBurst(state);
  const result = performBurst(state);
  await store.save(state);

  process.stdout.write(`${renderBurstResult(result)}\n`);
  if (result.power > 0) {
    process.stdout.write(`Spent effort tag: ${preview.effortTag}\n`);
  } else {
    process.stdout.write("Tip: just keep coding for a bit, then come back when the buddy has bottled some effort.\n");
  }
}

void main();
