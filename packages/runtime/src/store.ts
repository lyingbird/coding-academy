import { existsSync } from "node:fs";
import { mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { PersistedState } from "@academy/shared";
import { createBurstBank, createDefaultProfile, createSession } from "./engine.js";

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

  private get lockPath(): string {
    return `${this.filePath}.lock`;
  }

  private async sleep(milliseconds: number) {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await mkdir(dirname(this.filePath), { recursive: true });

    const startedAt = Date.now();
    while (true) {
      try {
        const handle = await open(this.lockPath, "wx");
        try {
          return await fn();
        } finally {
          await handle.close();
          await rm(this.lockPath, { force: true });
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
          throw error;
        }

        if (Date.now() - startedAt > 10_000) {
          throw new Error(`Timed out waiting for academy state lock: ${this.lockPath}`);
        }

        await this.sleep(50);
      }
    }
  }

  private async loadUnsafe(): Promise<PersistedState> {
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
        burstBank: {
          ...createBurstBank(),
          ...(parsed.burstBank ?? {}),
        },
      };
    } catch {
      return {
        profile: createDefaultProfile(),
        activityLog: [],
        monsterJournal: [],
        burstBank: createBurstBank(),
      };
    }
  }

  private async saveUnsafe(state: PersistedState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }

  async load(): Promise<PersistedState> {
    return this.loadUnsafe();
  }

  async save(state: PersistedState): Promise<void> {
    await this.withLock(async () => {
      await this.saveUnsafe(state);
    });
  }

  async transact<T>(mutate: (state: PersistedState) => Promise<T> | T): Promise<{ state: PersistedState; result: T }> {
    return this.withLock(async () => {
      const state = await this.loadUnsafe();
      const result = await mutate(state);
      await this.saveUnsafe(state);
      return {
        state,
        result,
      };
    });
  }

  get path(): string {
    return this.filePath;
  }
}
