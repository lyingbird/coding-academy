import {
  FileStore,
  renderPersistedPanel
} from "./chunk-7YEMBPM5.js";

// src/academy-status.ts
async function main() {
  const store = new FileStore();
  const state = await store.load();
  process.stdout.write(`${renderPersistedPanel(state)}
`);
}
void main();
