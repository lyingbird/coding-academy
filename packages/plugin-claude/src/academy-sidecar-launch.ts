import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

function commandExists(command: string): boolean {
  const checker = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(checker, [command], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

function launchWindows(scriptPath: string) {
  const env = { ...process.env, ACADEMY_WORKSPACE: process.cwd() };

  if (commandExists("wt")) {
    const child = spawn(
      "wt",
      ["-w", "0", "split-pane", "-H", "powershell", "-NoExit", "-Command", `node "${scriptPath}"`],
      { detached: true, stdio: "ignore", env },
    );
    child.unref();
    return "Opened sidecar in Windows Terminal split pane.";
  }

  const child = spawn(
    "cmd",
    ["/c", "start", "", "powershell", "-NoExit", "-Command", `node "${scriptPath}"`],
    { detached: true, stdio: "ignore", env },
  );
  child.unref();
  return "Opened sidecar in a separate PowerShell window.";
}

function launchMac(scriptPath: string) {
  const env = { ...process.env, ACADEMY_WORKSPACE: process.cwd() };

  if (process.env.TMUX && commandExists("tmux")) {
    const child = spawn("tmux", ["split-window", "-h", `node '${scriptPath}'`], {
      detached: true,
      stdio: "ignore",
      env,
    });
    child.unref();
    return "Opened sidecar in a tmux split pane.";
  }

  if (commandExists("osascript")) {
    const appleScript = `tell application "Terminal" to do script "node '${scriptPath}'"`;
    const child = spawn("osascript", ["-e", appleScript], {
      detached: true,
      stdio: "ignore",
      env,
    });
    child.unref();
    return "Opened sidecar in a new Terminal window.";
  }

  throw new Error("Could not find tmux or osascript on this macOS machine.");
}

function launchLinux(scriptPath: string) {
  const env = { ...process.env, ACADEMY_WORKSPACE: process.cwd() };
  const terminals = ["x-terminal-emulator", "gnome-terminal", "konsole"];

  for (const terminal of terminals) {
    if (!commandExists(terminal)) {
      continue;
    }

    const args =
      terminal === "konsole"
        ? ["-e", `node "${scriptPath}"`]
        : ["-e", `node "${scriptPath}"`];

    const child = spawn(terminal, args, {
      detached: true,
      stdio: "ignore",
      shell: terminal !== "konsole",
      env,
    });
    child.unref();
    return `Opened sidecar in ${terminal}.`;
  }

  throw new Error("Could not find a supported terminal launcher on this Linux machine.");
}

async function main() {
  const currentFile = fileURLToPath(import.meta.url);
  const binDir = dirname(currentFile);
  const sidecarScript = `${binDir}${process.platform === "win32" ? "\\" : "/"}academy-sidecar.js`;

  if (!existsSync(sidecarScript)) {
    throw new Error(`Missing sidecar script: ${sidecarScript}`);
  }

  let message = "";
  if (process.platform === "win32") {
    message = launchWindows(sidecarScript);
  } else if (process.platform === "darwin") {
    message = launchMac(sidecarScript);
  } else {
    message = launchLinux(sidecarScript);
  }

  process.stdout.write(`${message}\n`);
}

void main();
