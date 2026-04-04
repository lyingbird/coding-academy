import type {
  CompanionState,
  EnemyCategory,
  EngineUpdate,
  GameplayEvent,
  HeroProfile,
  MonsterJournalEntry,
  PersistedState,
  SessionState,
  StrategyMode,
} from "@academy/shared";

const PANEL_WIDTH = 58;
const FEED_LIMIT = 6;

const heroArtByState: Record<CompanionState, string[]> = {
  Idle: ["  O  ", " /|\\ ", " / \\ "],
  Scout: ["  O> ", " /|  ", " / \\ "],
  Battle: [" \\O/ ", "  |  ", " / \\ "],
  Cast: ["  O* ", " /|\\ ", " / \\ "],
  Hit: ["  xo ", " /|  ", " / \\ "],
  Victory: [" \\o/ ", "  |  ", " / \\ "],
  Rest: ["  zZ ", " (o) ", " /|\\ "],
  LevelUp: ["  *O* ", " /|\\ ", " / \\ "],
};

const enemyGlyphByCategory: Record<EnemyCategory, string> = {
  Bug: "[bug]",
  TestFailure: "[test]",
  LegacyMonster: "[legacy]",
  RefactorBoss: "[boss]",
  Unknown: "[fog]",
};

function padRight(input: string, width: number): string {
  if (input.length >= width) {
    return input.slice(0, width);
  }
  return input + " ".repeat(width - input.length);
}

function border(title?: string): string {
  if (!title) {
    return `+${"-".repeat(PANEL_WIDTH - 2)}+`;
  }
  const text = ` ${title} `;
  const remaining = Math.max(0, PANEL_WIDTH - 2 - text.length);
  return `+${text}${"-".repeat(remaining)}+`;
}

function row(content = ""): string {
  return `| ${padRight(content, PANEL_WIDTH - 4)} |`;
}

function progressBar(label: string, value: number, total: number, width = 18): string {
  const safeTotal = Math.max(1, total);
  const ratio = Math.max(0, Math.min(1, value / safeTotal));
  const filled = Math.round(ratio * width);
  const bar = `${"#".repeat(filled)}${"-".repeat(width - filled)}`;
  return `${label} [${bar}] ${value}/${total}`;
}

function moodLine(profile: HeroProfile): string {
  return `${profile.name} Lv.${profile.level} ${profile.dominantProfession} | ${profile.mood}`;
}

function strategyHint(strategy: StrategyMode): string {
  switch (strategy) {
    case "Cozy":
      return "Charge softens the next hit";
    case "Flow":
      return "Charge turns clean hits into focus";
    case "Rush":
      return "Charge turns clean hits into combo";
  }
}

function waitingLine(profile: HeroProfile, session?: SessionState): string {
  if (!session) {
    switch (profile.strategy) {
      case "Cozy":
        return "Waiting by the campfire for the next prompt.";
      case "Flow":
        return "Ready to catch the next good thread.";
      case "Rush":
        return "Boots tapping. Ready to burst on the next quest.";
    }
  }

  switch (session?.state) {
    case "Scout":
      return profile.strategy === "Cozy"
        ? "Brewing tea while Claude thinks."
        : profile.strategy === "Flow"
          ? "Following the warmest clue."
          : "Leaning forward for the first opening.";
    case "Battle":
    case "Cast":
      return profile.strategy === "Cozy"
        ? "Holding the line and waiting for a safe swing."
        : profile.strategy === "Flow"
          ? "Riding the thread without forcing it."
          : "Coiling up for a burst finish.";
    case "Hit":
      return profile.strategy === "Cozy"
        ? "Shaking it off. The stance still holds."
        : profile.strategy === "Flow"
          ? "Resetting rhythm after a rough exchange."
          : "Snarling and looking for a snap-back.";
    case "Victory":
      return "Let the reward breathe for a second.";
    case "Rest":
      return "Cooling down before the next prompt.";
    default:
      return "Hovering in the quiet between ideas.";
  }
}

function nextPopLine(profile: HeroProfile): string {
  if (profile.charge === 0) {
    return "Next pop: one quiet beat builds your first charge.";
  }
  if (profile.charge < 3) {
    return `Next pop: ${strategyHint(profile.strategy)}.`;
  }
  return `Next pop: ${profile.strategy} stance is primed for a clean hit.`;
}

function sessionHeadline(session?: SessionState): string {
  if (!session) {
    return "No active quest. Tiny hero is waiting.";
  }

  return `${session.state} | ${session.enemyName} ${enemyGlyphByCategory[session.stats.currentEnemy]}`;
}

function summarizeEvent(event: GameplayEvent): string {
  switch (event.type) {
    case "quest_started":
      return "Accepted a fresh coding quest";
    case "scouting":
      return "Scouting code paths and clues";
    case "enemy_spotted":
      return `Spotted ${event.enemyName ?? "a sneaky enemy"}`;
    case "elite_encounter":
      return `${event.enemyName ?? "An elite foe"} blocks the path`;
    case "attack":
      return `Charged at ${event.enemyName ?? "the problem"}`;
    case "hit_landed":
      return `Patch landed on ${event.enemyName ?? "the target"}`;
    case "damage_taken":
      return `Took a hit from ${event.enemyName ?? enemyGlyphByCategory[event.enemyCategory ?? "Unknown"]}`;
    case "enemy_weakened":
      return `${event.enemyName ?? "The enemy"} is cracking`;
    case "victory":
      return `Victory over ${event.enemyName ?? enemyGlyphByCategory[event.enemyCategory ?? "Unknown"]}`;
    case "fatigue":
      return "Momentum slowed down";
    case "loot_collected":
      return event.chestItem ? `Opened chest: ${event.chestItem}` : "Filed notes and pocketed loot";
    case "rest":
      return "Taking a short rest";
    default:
      return event.type;
  }
}

function renderHeroArt(state: CompanionState): string[] {
  return heroArtByState[state] ?? heroArtByState.Idle;
}

function renderOverview(profile: HeroProfile, session?: SessionState): string[] {
  const art = renderHeroArt(profile.state);
  const lines: string[] = [];
  lines.push(border("Adventure"));
  lines.push(row(moodLine(profile)));
  lines.push(row(progressBar("HP", profile.hp, profile.maxHp)));
  lines.push(row(progressBar("XP", profile.xp, 100)));
  lines.push(row(`Vibe ${profile.strategy} | Charge ${profile.charge} | Combo x${profile.combo}`));
  lines.push(row(`Focus ${profile.focus} | Clues ${profile.clues} | Max Combo ${profile.maxCombo}`));
  lines.push(row(`Streak ${profile.streak} | Wins ${profile.totalVictories} | Chests ${profile.chestsOpened}`));
  lines.push(row(sessionHeadline(session)));
  lines.push(row());
  lines.push(row(`${art[0]}  Hero ${profile.name}`));
  lines.push(row(`${art[1]}  Job ${profile.dominantProfession}`));
  lines.push(row(`${art[2]}  Mood ${profile.mood}`));
  lines.push(border());
  return lines;
}

function renderVibeLoop(profile: HeroProfile, session?: SessionState): string[] {
  const lines: string[] = [];
  lines.push(border("Vibe Loop"));
  lines.push(row(waitingLine(profile, session)));
  lines.push(row(nextPopLine(profile)));
  lines.push(border());
  return lines;
}

function renderDuel(session?: SessionState): string[] {
  const lines: string[] = [];
  lines.push(border("Current Duel"));

  if (!session) {
    lines.push(row("No live battle. Start Codex or Claude Code."));
    lines.push(border());
    return lines;
  }

  lines.push(row(`Enemy ${session.enemyName}`));
  lines.push(row(`Reads ${session.stats.scoutingCount} | Attacks ${session.stats.attackCount} | Hits ${session.stats.hitCount}`));
  lines.push(row(`Damage ${session.stats.damageCount} | Victories ${session.stats.victories}`));
  lines.push(border());
  return lines;
}

function renderRecentFeed(events: GameplayEvent[]): string[] {
  const lines: string[] = [];
  lines.push(border("Recent Moments"));

  const recent = events.slice(-FEED_LIMIT);
  if (recent.length === 0) {
    lines.push(row("No memorable moments yet."));
    lines.push(border());
    return lines;
  }

  for (const event of recent) {
    lines.push(row(`- ${summarizeEvent(event)}`));
  }
  lines.push(border());
  return lines;
}

function renderSouvenirs(profile: HeroProfile): string[] {
  const lines: string[] = [];
  lines.push(border("Loot"));

  const latest = profile.souvenirs.slice(-3);
  if (latest.length === 0) {
    lines.push(row("Bag is light. First tiny chest still waiting."));
    lines.push(border());
    return lines;
  }

  if (profile.lastChestItem) {
    lines.push(row(`Latest chest: ${profile.lastChestItem}`));
  }
  for (const item of latest) {
    lines.push(row(`- ${item}`));
  }
  lines.push(border());
  return lines;
}

function renderJournal(entries: MonsterJournalEntry[]): string[] {
  const lines: string[] = [];
  lines.push(border("Monster Journal"));

  const latest = entries.slice(0, 3);
  if (latest.length === 0) {
    lines.push(row("No monsters logged yet."));
    lines.push(border());
    return lines;
  }

  for (const entry of latest) {
    lines.push(row(`- ${entry.name} x${entry.defeats}`));
  }
  lines.push(border());
  return lines;
}

export function renderPersistedPanel(state: PersistedState): string {
  const lines = [
    ...renderOverview(state.profile, state.currentSession),
    ...renderVibeLoop(state.profile, state.currentSession),
    ...renderDuel(state.currentSession),
    ...renderRecentFeed(state.activityLog),
    ...renderSouvenirs(state.profile),
    ...renderJournal(state.monsterJournal),
  ];

  return lines.join("\n");
}

export function renderUpdatePanel(update: EngineUpdate, state: PersistedState): string {
  const latestGameplay = update.gameplayEvents.at(-1);
  const headline = latestGameplay
    ? `${summarizeEvent(latestGameplay)}${latestGameplay.rewardLabel ? ` · ${latestGameplay.rewardLabel}` : ""}`
    : "Quiet moment";
  return `${renderPersistedPanel(state)}\n${headline}`;
}
