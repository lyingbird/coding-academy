import {
  FileStore,
  renderPersistedPanel,
  resolveStateFilePath
} from "./chunk-HKLIPPRN.js";

// src/academy-status.ts
async function main() {
  const store = new FileStore(resolveStateFilePath({ workspace: process.env.ACADEMY_WORKSPACE ?? process.cwd() }));
  const state = await store.load();
  process.stdout.write(`${renderPersistedPanel(state)}
`);
}
void main();
