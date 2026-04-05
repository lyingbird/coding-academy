import { FileStore, resolveStateFilePath } from "../../runtime/src/index.js";
import { clearSidecarManifest, writeSidecarManifest } from "../../sidecar-shell/src/manifest.js";
import { renderBuddyShell } from "../../sidecar-shell/src/renderer.js";

async function main() {
  const workspace = process.env.ACADEMY_WORKSPACE ?? process.cwd();
  const store = new FileStore(resolveStateFilePath({ workspace }));
  let lastRendered = "";
  let cleaned = false;

  const cleanup = async () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    await clearSidecarManifest(workspace);
  };

  const shutdown = async (code = 0) => {
    await cleanup();
    process.exit(code);
  };

  await writeSidecarManifest(workspace);

  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));
  process.on("SIGHUP", () => void shutdown(0));
  process.on("beforeExit", () => void cleanup());
  process.stdout.on("error", (error) => {
    if ("code" in error && error.code === "EPIPE") {
      void shutdown(0);
    }
  });

  while (true) {
    const state = await store.load();
    const panel = renderBuddyShell(state, "auto", undefined, Math.floor(Date.now() / 700));
    if (panel !== lastRendered) {
      console.clear();
      process.stdout.write(`${panel}\n`);
      lastRendered = panel;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

void main();
