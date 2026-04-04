import {
  FileStore,
  renderPersistedPanel
} from "./chunk-DBHBI6XR.js";

// src/academy-status.ts
async function main() {
  const store = new FileStore();
  const state = await store.load();
  process.stdout.write(`${renderPersistedPanel(state)}
`);
}
void main();
