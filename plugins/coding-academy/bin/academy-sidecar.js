import {
  FileStore,
  renderSidecarPanel,
  resolveStateFilePath
} from "./chunk-HKLIPPRN.js";

// src/academy-sidecar.ts
async function main() {
  const store = new FileStore(resolveStateFilePath({ workspace: process.env.ACADEMY_WORKSPACE ?? process.cwd() }));
  let lastRendered = "";
  while (true) {
    const state = await store.load();
    const panel = renderSidecarPanel(state);
    if (panel !== lastRendered) {
      console.clear();
      process.stdout.write(`${panel}
`);
      lastRendered = panel;
    }
    await new Promise((resolve) => setTimeout(resolve, 1e3));
  }
}
void main();
