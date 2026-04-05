import { FileStore, renderSidecarPanel } from "../../runtime/src/index.js";

async function main() {
  const store = new FileStore();
  let lastRendered = "";

  while (true) {
    const state = await store.load();
    const panel = renderSidecarPanel(state);
    if (panel !== lastRendered) {
      console.clear();
      process.stdout.write(`${panel}\n`);
      lastRendered = panel;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

void main();
