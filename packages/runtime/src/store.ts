import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { PersistedState } from "@academy/shared";
import { createDefaultProfile } from "./engine.js";
import { createSession } from "./engine.js";

function findWorkspaceRoot(startDir: string): string {
  let current = startDir;
  while (true) {
    if (existsSync(join(current, "pnpm-workspace.yaml")) || existsSync(join(current, ".git"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return startDir;
    }
    current = parent;
  }
}

function resolveStorageDir(): string {
  const pluginData = process.env.CLAUDE_PLUGIN_DATA;
  if (pluginData) {
    return join(pluginData, "academy-state");
  }
  return join(findWorkspaceRoot(process.cwd()), ".academy");
}

const DEFAULT_STORAGE_DIR = resolveStorageDir();
const DEFAULT_STATE_FILE = join(DEFAULT_STORAGE_DIR, "state.json");

export class FileStore {
  constructor(private readonly filePath = DEFAULT_STATE_FILE) {}

  async load(): Promise<PersistedState> {
    try {
      const content = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(content) as Partial<PersistedState>;
      const fallbackSession = parsed.currentSession ? createSession(parsed.currentSession.id) : undefined;
      return {
        profile: {
          ...createDefaultProfile(),
          ...parsed.profile,
          professionProgress: {
            ...createDefaultProfile().professionProgress,
            ...(parsed.profile?.professionProgress ?? {}),
          },
        },
        currentSession: parsed.currentSession
          ? {
              ...fallbackSession,
              ...parsed.currentSession,
              stats: {
                ...fallbackSession?.stats,
                ...(parsed.currentSession.stats ?? {}),
              },
              lastEvents: parsed.currentSession.lastEvents ?? [],
            }
          : undefined,
        activityLog: parsed.activityLog ?? [],
        monsterJournal: parsed.monsterJournal ?? [],
      };
    } catch {
      return { profile: createDefaultProfile(), activityLog: [], monsterJournal: [] };
    }
  }

  async save(state: PersistedState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }

  get path(): string {
    return this.filePath;
  }
}
