import { FileStore, resolveStateFilePath } from "../../runtime/src/index.js";
import { renderBuddyShell } from "../../sidecar-shell/src/renderer.js";

async function main() {
  const store = new FileStore(resolveStateFilePath({ workspace: process.env.ACADEMY_WORKSPACE ?? process.cwd() }));
  let lastRendered = "";

  while (true) {
    const state = await store.load();
    const panel = renderBuddyShell(state, "auto");
    if (panel !== lastRendered) {
      console.clear();
      process.stdout.write(`${panel}\n`);
      lastRendered = panel;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

void main();
