import { FileStore, renderPersistedPanel } from "../../runtime/src/index.js";

async function main() {
  const store = new FileStore();
  const state = await store.load();
  process.stdout.write(`${renderPersistedPanel(state)}\n`);
}

void main();
