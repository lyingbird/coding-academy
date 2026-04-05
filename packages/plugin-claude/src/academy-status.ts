import { FileStore, renderPersistedPanel, resolveStateFilePath } from "../../runtime/src/index.js";

async function main() {
  const store = new FileStore(resolveStateFilePath({ workspace: process.env.ACADEMY_WORKSPACE ?? process.cwd() }));
  const state = await store.load();
  process.stdout.write(`${renderPersistedPanel(state)}\n`);
}

void main();
