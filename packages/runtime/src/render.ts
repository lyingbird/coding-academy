import type {
  CompanionState,
  EnemyCategory,
  EngineUpdate,
  GameplayEvent,
  HeroProfile,
  MonsterJournalEntry,
  PersistedState,
  SessionState,
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
  lines.push(row(`Combo x${profile.combo} | Focus ${profile.focus} | Clues ${profile.clues}`));
  lines.push(row(`Streak ${profile.streak} | Wins ${profile.totalVictories} | Chests ${profile.chestsOpened}`));
  lines.push(row(sessionHeadline(session)));
  lines.push(row());
  lines.push(row(`${art[0]}  Hero ${profile.name}`));
  lines.push(row(`${art[1]}  Job ${profile.dominantProfession}`));
  lines.push(row(`${art[2]}  Mood ${profile.mood}`));
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
