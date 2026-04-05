import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

export interface SidecarManifest {
  pid: number;
  workspace: string;
  workspaceId: string;
  startedAt: string;
}

export function sidecarManifestPath(): string {
  return join(homedir(), ".coding-academy", "sidecar.json");
}

export function workspaceId(workspace: string): string {
  return createHash("sha1").update(workspace).digest("hex").slice(0, 12);
}

export async function readSidecarManifest(): Promise<SidecarManifest | null> {
  try {
    const raw = await readFile(sidecarManifestPath(), "utf8");
    return JSON.parse(raw) as SidecarManifest;
  } catch {
    return null;
  }
}

export async function writeSidecarManifest(workspace: string): Promise<SidecarManifest> {
  const manifest: SidecarManifest = {
    pid: process.pid,
    workspace,
    workspaceId: workspaceId(workspace),
    startedAt: new Date().toISOString(),
  };
  await mkdir(join(homedir(), ".coding-academy"), { recursive: true });
  await writeFile(sidecarManifestPath(), JSON.stringify(manifest, null, 2), "utf8");
  return manifest;
}

export async function clearSidecarManifest(workspace?: string): Promise<void> {
  const current = await readSidecarManifest();
  if (!current) {
    return;
  }
  if (workspace && current.workspace !== workspace) {
    return;
  }
  await rm(sidecarManifestPath(), { force: true });
}

export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function sidecarManifestExists(): boolean {
  return existsSync(sidecarManifestPath());
}
