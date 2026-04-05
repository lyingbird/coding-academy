import { FileStore, renderSidecarPanel, resolveStateFilePath } from "@academy/runtime";

function resolveWorkspace(): string {
  return process.env.ACADEMY_WORKSPACE ?? process.cwd();
}

async function loadPanel(): Promise<string> {
  const store = new FileStore(resolveStateFilePath({ workspace: resolveWorkspace() }));
  const state = await store.load();
  return renderSidecarPanel(state);
}

async function runSnapshot() {
  process.stdout.write(`${await loadPanel()}\n`);
}

async function runStart() {
  let lastRendered = "";

  while (true) {
    const panel = await loadPanel();
    if (panel !== lastRendered) {
      console.clear();
      process.stdout.write(`${panel}\n`);
      lastRendered = panel;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function main() {
  const command = process.argv[2] ?? "start";
  switch (command) {
    case "start":
      await runStart();
      return;
    case "snapshot":
      await runSnapshot();
      return;
    default:
      console.error(`Unknown sidecar-shell command: ${command}`);
      process.exitCode = 1;
  }
}

void main();
