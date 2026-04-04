import type {
  CompanionState,
  EnemyCategory,
  EngineUpdate,
  GameplayEvent,
  HeroProfile,
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

  const shortSessionId = session.id.length > 16 ? session.id.slice(-16) : session.id;
  return `Quest ${shortSessionId} | ${session.state} | ${enemyGlyphByCategory[session.stats.currentEnemy]}`;
}

function summarizeEvent(event: GameplayEvent): string {
  switch (event.type) {
    case "quest_started":
      return "Accepted a fresh coding quest";
    case "scouting":
      return "Scouting code paths and clues";
    case "enemy_spotted":
      return "A strange bug peeks out";
    case "elite_encounter":
      return "An elite obstacle steps in";
    case "attack":
      return "Wind-up attack on the current problem";
    case "hit_landed":
      return "Patch landed cleanly";
    case "damage_taken":
      return `Took a hit from ${enemyGlyphByCategory[event.enemyCategory ?? "Unknown"]}`;
    case "enemy_weakened":
      return "Validation weakened the enemy";
    case "victory":
      return `Victory over ${enemyGlyphByCategory[event.enemyCategory ?? "Unknown"]}`;
    case "fatigue":
      return "Momentum slowed down";
    case "loot_collected":
      return "Filed notes and pocketed loot";
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
  lines.push(border("Tiny Hero"));
  lines.push(row(moodLine(profile)));
  lines.push(row(progressBar("HP", profile.hp, profile.maxHp)));
  lines.push(row(progressBar("XP", profile.xp, 100)));
  lines.push(row(`Streak ${profile.streak} | Wins ${profile.totalVictories} | Souvenirs ${profile.souvenirs.length}`));
  lines.push(row(sessionHeadline(session)));
  lines.push(row());
  lines.push(row(`${art[0]}  State ${profile.state}`));
  lines.push(row(`${art[1]}  Profession ${profile.dominantProfession}`));
  lines.push(row(`${art[2]}  Mood ${profile.mood}`));
  lines.push(border());
  return lines;
}

function renderSessionStats(session?: SessionState): string[] {
  const lines: string[] = [];
  lines.push(border("Battle Feed"));

  if (!session) {
    lines.push(row("No live battle. Start Codex or Claude Code."));
    lines.push(border());
    return lines;
  }

  lines.push(row(`Reads ${session.stats.scoutingCount} | Attacks ${session.stats.attackCount} | Hits ${session.stats.hitCount}`));
  lines.push(row(`Damage ${session.stats.damageCount} | Victories ${session.stats.victories} | Raw ${session.stats.rawEvents}`));
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
  lines.push(border("Shelf"));

  const latest = profile.souvenirs.slice(-3);
  if (latest.length === 0) {
    lines.push(row("Empty shelf for now. First victory token awaits."));
    lines.push(border());
    return lines;
  }

  for (const item of latest) {
    lines.push(row(`- ${item}`));
  }
  lines.push(border());
  return lines;
}

export function renderPersistedPanel(state: PersistedState): string {
  const lines = [
    ...renderOverview(state.profile, state.currentSession),
    ...renderSessionStats(state.currentSession),
    ...renderRecentFeed(state.activityLog),
    ...renderSouvenirs(state.profile),
  ];

  return lines.join("\n");
}

export function renderUpdatePanel(update: EngineUpdate, state: PersistedState): string {
  const latestGameplay = update.gameplayEvents.at(-1);
  const headline = latestGameplay ? summarizeEvent(latestGameplay) : "Quiet moment";
  return `${renderPersistedPanel(state)}\n${headline}`;
}
