// ../sidecar-shell/src/manifest.ts
import { existsSync } from "fs";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { createHash } from "crypto";
import { homedir } from "os";
import { join } from "path";
function sidecarManifestPath() {
  return join(homedir(), ".coding-academy", "sidecar.json");
}
function workspaceId(workspace) {
  return createHash("sha1").update(workspace).digest("hex").slice(0, 12);
}
async function readSidecarManifest() {
  try {
    const raw = await readFile(sidecarManifestPath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
async function writeSidecarManifest(workspace) {
  const manifest = {
    pid: process.pid,
    workspace,
    workspaceId: workspaceId(workspace),
    startedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await mkdir(join(homedir(), ".coding-academy"), { recursive: true });
  await writeFile(sidecarManifestPath(), JSON.stringify(manifest, null, 2), "utf8");
  return manifest;
}
async function clearSidecarManifest(workspace) {
  const current = await readSidecarManifest();
  if (!current) {
    return;
  }
  if (workspace && current.workspace !== workspace) {
    return;
  }
  await rm(sidecarManifestPath(), { force: true });
}
function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export {
  readSidecarManifest,
  writeSidecarManifest,
  clearSidecarManifest,
  isPidAlive
};
