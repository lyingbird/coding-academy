import type { PersistedState } from "@academy/shared";
import { FileStore, renderPersistedPanel, resolveStateFilePath } from "../../runtime/src/index.js";

function isFreshState(state: PersistedState): boolean {
  return !state.currentSession &&
    state.activityLog.length === 0 &&
    state.recentBursts.length === 0 &&
    state.profile.level === 1 &&
    state.profile.xp === 0 &&
    state.profile.totalVictories === 0 &&
    state.profile.souvenirs.length === 0;
}

function renderFirstOpenCard(state: PersistedState): string {
  const lines = [
    "Coding Academy",
    "",
    "        .-----------------------.",
    "       /  hatching a tiny buddy  \\",
    "      /  it will push maps while  \\",
    "      \\   you vibe through code   /",
    "       '-----------------------'",
    "                \\",
    "               /\\_/\\\\",
    "              ( o.o )",
    "               > ^ <",
    "",
    `${state.profile.name} just woke up as a Lv.${state.profile.level} ${state.profile.dominantProfession}.`,
    "",
    "What to do next:",
    "1. Keep coding normally in Claude Code.",
    "2. Leave the buddy on the side while it tracks your run.",
    "3. When you want a payoff, type /coding-academy-check-in.",
  ];

  return lines.join("\n");
}

async function main() {
  const store = new FileStore(resolveStateFilePath({ workspace: process.env.ACADEMY_WORKSPACE ?? process.cwd() }));
  const state = await store.load();
  const panel = isFreshState(state) ? renderFirstOpenCard(state) : renderPersistedPanel(state);
  process.stdout.write(`${panel}\n`);
}

void main();
