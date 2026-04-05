import { FileStore, resolveStateFilePath } from "@academy/runtime";
import { renderBuddyShell } from "./renderer.js";

function resolveWorkspace(): string {
  return process.env.ACADEMY_WORKSPACE ?? process.cwd();
}

function resolveMode(): "auto" | "narrow" | "full" {
  const explicit = process.argv.find((arg) => arg.startsWith("--mode="));
  const direct = explicit?.split("=")[1] ?? process.argv[3];
  if (direct === "narrow" || direct === "full" || direct === "auto") {
    return direct;
  }
  return "auto";
}

async function loadPanel(): Promise<string> {
  const store = new FileStore(resolveStateFilePath({ workspace: resolveWorkspace() }));
  const state = await store.load();
  return renderBuddyShell(state, resolveMode());
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
    case "narrow":
      process.argv[3] = "narrow";
      await runSnapshot();
      return;
    case "full":
      process.argv[3] = "full";
      await runSnapshot();
      return;
    default:
      console.error(`Unknown sidecar-shell command: ${command}`);
      process.exitCode = 1;
  }
}

void main();
