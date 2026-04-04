import {
  type CompanionState,
  type EnemyCategory,
  type EngineUpdate,
  type GameplayEvent,
  type GameplayEventType,
  type HeroProfile,
  type MonsterJournalEntry,
  type PersistedState,
  type ProfessionType,
  type RawEvent,
  type SessionState,
} from "@academy/shared";

const LEVEL_XP = 100;

const ENEMY_NAME_POOL: Record<EnemyCategory, string[]> = {
  Bug: ["Null Pointer Wisp", "Syntax Slime", "Stack Trace Imp"],
  TestFailure: ["Red Test Bat", "Flaky Slime", "Assertion Crow"],
  LegacyMonster: ["Legacy Golem", "Cobweb Troll", "Dusty Module Giant"],
  RefactorBoss: ["Refactor Ogre", "Merge Hydra", "Broken Path Dragon"],
  Unknown: ["Fog Mimic", "Quiet Gremlin", "Shadow TODO"],
};

const CHEST_POOL = [
  "Victory Token",
  "Debug Ribbon",
  "Clean Patch Medal",
  "Lucky Test Feather",
  "Tiny Chest Key",
];

function nowIso() {
  return new Date().toISOString();
}

export function createDefaultProfile(name = "Tiny Hero"): HeroProfile {
  return {
    name,
    level: 1,
    xp: 0,
    hp: 10,
    maxHp: 10,
    streak: 0,
    totalVictories: 0,
    souvenirs: [],
    professionProgress: {
      Debugger: 0,
      Builder: 0,
      Refactorer: 0,
      Archivist: 0,
    },
    dominantProfession: "Debugger",
    state: "Idle",
    lastStateChangedAt: nowIso(),
    mood: "Calm",
    combo: 0,
    maxCombo: 0,
    focus: 0,
    clues: 0,
    chestsOpened: 0,
  };
}

export function createSession(sessionId: string): SessionState {
  return {
    id: sessionId,
    startedAt: nowIso(),
    lastUpdatedAt: nowIso(),
    state: "Idle",
    enemyCategory: "Unknown",
    enemyName: "Fog Mimic",
    stats: {
      scoutingCount: 0,
      attackCount: 0,
      hitCount: 0,
      damageCount: 0,
      victories: 0,
      rawEvents: 0,
      currentEnemy: "Unknown",
      currentEnemyName: "Fog Mimic",
    },
    lastEvents: [],
  };
}

function dominantProfession(progress: Record<ProfessionType, number>): ProfessionType {
  return (Object.entries(progress).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Debugger") as ProfessionType;
}

function pushEvent(
  events: GameplayEvent[],
  rawEvent: RawEvent,
  type: GameplayEventType,
  options: Partial<GameplayEvent> = {},
) {
  events.push({
    type,
    timestamp: rawEvent.timestamp,
    sessionId: rawEvent.sessionId,
    ...options,
  });
}

function hashText(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function namedEnemy(category: EnemyCategory, rawEvent: RawEvent): string {
  const pool = ENEMY_NAME_POOL[category];
  const payloadSeed =
    typeof rawEvent.payload?.target === "string"
      ? rawEvent.payload.target
      : typeof rawEvent.payload?.command === "string"
        ? rawEvent.payload.command
        : rawEvent.type;
  const index = hashText(`${rawEvent.sessionId}:${payloadSeed}:${category}`) % pool.length;
  return pool[index] ?? ENEMY_NAME_POOL.Unknown[0];
}

function rolledChestItem(rawEvent: RawEvent): string {
  const index = hashText(`${rawEvent.sessionId}:${rawEvent.type}:chest`) % CHEST_POOL.length;
  return CHEST_POOL[index] ?? CHEST_POOL[0];
}

function classifyEnemy(rawEvent: RawEvent): EnemyCategory {
  switch (rawEvent.type) {
    case "tests.failed":
      return "TestFailure";
    case "command.failed":
      return "Bug";
    case "file.edited":
    case "patch.applied":
      return "LegacyMonster";
    case "task.completed":
      return "RefactorBoss";
    default:
      return "Unknown";
  }
}

export function normalizeRawEvent(rawEvent: RawEvent): GameplayEvent[] {
  const events: GameplayEvent[] = [];
  const payload = rawEvent.payload ?? {};
  switch (rawEvent.type) {
    case "prompt.submitted":
      pushEvent(events, rawEvent, "quest_started", { xpReward: 1, rewardLabel: "Quest On" });
      break;
    case "session.started":
      break;
    case "file.read":
    case "search.performed":
      pushEvent(events, rawEvent, "scouting", {
        professionSignals: { Debugger: 1 },
        rewardLabel: "Clue +1",
        note: "Found a clue",
      });
      break;
    case "file.edited":
      pushEvent(events, rawEvent, "attack", {
        enemyCategory: classifyEnemy(rawEvent),
        enemyName: namedEnemy(classifyEnemy(rawEvent), rawEvent),
        professionSignals: { Builder: 1, Refactorer: 1 },
        xpReward: 2,
        rewardLabel: "Focus Spent",
      });
      break;
    case "patch.applied":
      pushEvent(events, rawEvent, "hit_landed", {
        enemyCategory: classifyEnemy(rawEvent),
        enemyName: namedEnemy(classifyEnemy(rawEvent), rawEvent),
        professionSignals: { Builder: 1, Refactorer: 2 },
        xpReward: 3,
        rewardLabel: "Combo Up",
      });
      break;
    case "command.started":
      if (payload.majorCheck === true) {
        pushEvent(events, rawEvent, "elite_encounter", {
          enemyCategory: "RefactorBoss",
          enemyName: namedEnemy("RefactorBoss", rawEvent),
          note: "Trial incoming",
        });
      } else {
        pushEvent(events, rawEvent, "enemy_spotted", {
          enemyCategory: "Bug",
          enemyName: namedEnemy("Bug", rawEvent),
          note: "Enemy spotted",
        });
      }
      break;
    case "command.failed":
    case "tests.failed":
      pushEvent(events, rawEvent, "damage_taken", {
        enemyCategory: classifyEnemy(rawEvent),
        enemyName: namedEnemy(classifyEnemy(rawEvent), rawEvent),
        professionSignals: { Debugger: 1 },
        note: "Enemy hit back",
      });
      break;
    case "command.succeeded":
    case "tests.passed":
      pushEvent(events, rawEvent, "enemy_weakened", {
        enemyCategory: classifyEnemy(rawEvent),
        enemyName: namedEnemy(classifyEnemy(rawEvent), rawEvent),
        professionSignals: { Debugger: 1 },
        xpReward: 4,
        rewardLabel: "Combo Up",
      });
      if (payload.majorCheck === true) {
        pushEvent(events, rawEvent, "victory", {
          enemyCategory: classifyEnemy(rawEvent),
          enemyName: namedEnemy(classifyEnemy(rawEvent), rawEvent),
          professionSignals: { Debugger: 1 },
          xpReward: 6,
          note: "Trial cleared",
          rewardLabel: "Tiny Chest",
          chestItem: rolledChestItem(rawEvent),
        });
      }
      break;
    case "summary.written":
      pushEvent(events, rawEvent, "loot_collected", {
        professionSignals: { Archivist: 2 },
        xpReward: 3,
        rewardLabel: "Loot Secured",
        note: "Filed the loot",
      });
      break;
    case "task.completed":
      pushEvent(events, rawEvent, "victory", {
        enemyCategory: classifyEnemy(rawEvent),
        enemyName: namedEnemy(classifyEnemy(rawEvent), rawEvent),
        professionSignals: { Builder: 1, Archivist: 1 },
        xpReward: 10,
        rewardLabel: "Tiny Chest",
        chestItem: rolledChestItem(rawEvent),
      });
      pushEvent(events, rawEvent, "rest");
      break;
    case "session.idle":
      pushEvent(events, rawEvent, "fatigue", {
        note: "Momentum slipping",
      });
      break;
    case "session.ended":
      break;
  }
  return events;
}

function nextStateForEvent(eventType: GameplayEventType, currentState: CompanionState): CompanionState {
  switch (eventType) {
    case "quest_started":
      return "Scout";
    case "scouting":
      return "Scout";
    case "attack":
      return currentState === "Battle" ? "Cast" : "Battle";
    case "hit_landed":
    case "enemy_weakened":
      return "Battle";
    case "damage_taken":
      return "Hit";
    case "victory":
      return "Victory";
    case "rest":
      return "Rest";
    case "loot_collected":
      return "Victory";
    case "fatigue":
      return currentState === "Idle" ? "Idle" : "Hit";
    case "elite_encounter":
    case "enemy_spotted":
      return "Battle";
    default:
      return currentState;
  }
}

function applyProfessionSignals(profile: HeroProfile, event: GameplayEvent) {
  if (!event.professionSignals) {
    return;
  }

  for (const profession of Object.keys(event.professionSignals) as ProfessionType[]) {
    profile.professionProgress[profession] += event.professionSignals[profession] ?? 0;
  }
  profile.dominantProfession = dominantProfession(profile.professionProgress);
}

function applyRewards(profile: HeroProfile, event: GameplayEvent) {
  profile.xp += event.xpReward ?? 0;

  while (profile.xp >= LEVEL_XP) {
    profile.xp -= LEVEL_XP;
    profile.level += 1;
    profile.maxHp += 2;
    profile.hp = profile.maxHp;
    profile.state = "LevelUp";
    profile.lastStateChangedAt = event.timestamp;
    profile.mood = "Proud";
  }
}

function updateMonsterJournal(state: PersistedState, event: GameplayEvent) {
  if (event.type !== "victory" || !event.enemyName || !event.enemyCategory) {
    return;
  }

  const existing = state.monsterJournal.find((entry) => entry.name === event.enemyName);
  if (existing) {
    existing.defeats += 1;
    existing.lastSeenAt = event.timestamp;
    return;
  }

  const entry: MonsterJournalEntry = {
    name: event.enemyName,
    category: event.enemyCategory,
    defeats: 1,
    lastSeenAt: event.timestamp,
  };
  state.monsterJournal = [entry, ...state.monsterJournal].slice(0, 12);
}

function applyEvent(state: PersistedState, profile: HeroProfile, session: SessionState, event: GameplayEvent) {
  session.lastUpdatedAt = event.timestamp;
  session.state = nextStateForEvent(event.type, session.state);
  profile.state = session.state;
  profile.lastStateChangedAt = event.timestamp;

  if (event.enemyCategory) {
    session.enemyCategory = event.enemyCategory;
    session.stats.currentEnemy = event.enemyCategory;
  }
  if (event.enemyName) {
    session.enemyName = event.enemyName;
    session.stats.currentEnemyName = event.enemyName;
  }

  switch (event.type) {
    case "scouting":
      session.stats.scoutingCount += 1;
      profile.mood = "Focused";
      profile.clues += 1;
      profile.focus = Math.min(9, profile.focus + 1);
      break;
    case "enemy_spotted":
    case "elite_encounter":
      profile.mood = "Tense";
      profile.focus = Math.min(9, profile.focus + 1);
      break;
    case "attack":
      session.stats.attackCount += 1;
      profile.mood = "Focused";
      profile.focus = Math.max(0, profile.focus - 1);
      break;
    case "hit_landed":
    case "enemy_weakened":
      session.stats.hitCount += 1;
      profile.mood = "Tense";
      profile.combo += 1;
      profile.maxCombo = Math.max(profile.maxCombo, profile.combo);
      break;
    case "damage_taken":
      session.stats.damageCount += 1;
      profile.hp = Math.max(1, profile.hp - 1);
      profile.mood = "Hurt";
      profile.combo = 0;
      profile.focus = Math.max(0, profile.focus - 1);
      break;
    case "victory":
      session.stats.victories += 1;
      profile.totalVictories += 1;
      profile.streak += 1;
      profile.hp = Math.min(profile.maxHp, profile.hp + 2);
      profile.mood = "Proud";
      profile.combo += 1;
      profile.maxCombo = Math.max(profile.maxCombo, profile.combo);
      if (event.chestItem) {
        profile.chestsOpened += 1;
        profile.lastChestItem = event.chestItem;
        profile.souvenirs = [...profile.souvenirs, event.chestItem].slice(-12);
      } else if (profile.totalVictories % 3 === 0) {
        profile.souvenirs = [...profile.souvenirs, `Victory Token ${profile.totalVictories / 3}`].slice(-12);
      }
      updateMonsterJournal(state, event);
      break;
    case "fatigue":
      profile.mood = "Tense";
      break;
    case "loot_collected":
      profile.mood = "Proud";
      break;
    case "rest":
      profile.mood = "Calm";
      profile.combo = 0;
      if (profile.state !== "LevelUp") {
        profile.state = "Rest";
      }
      break;
  }

  applyProfessionSignals(profile, event);
  applyRewards(profile, event);
  const lastEvent = session.lastEvents.at(-1);
  const isDuplicateRest = lastEvent?.type === "rest" && event.type === "rest";
  if (!isDuplicateRest) {
    session.lastEvents = [...session.lastEvents.slice(-4), event];
  }
}

export class AcademyEngine {
  private state: PersistedState;

  constructor(state?: Partial<PersistedState>) {
    this.state = {
      profile: state?.profile ?? createDefaultProfile(),
      currentSession: state?.currentSession,
      activityLog: state?.activityLog ?? [],
      monsterJournal: state?.monsterJournal ?? [],
    };
  }

  get snapshot(): PersistedState {
    return structuredClone(this.state);
  }

  process(rawEvent: RawEvent): EngineUpdate {
    const session =
      this.state.currentSession && this.state.currentSession.id === rawEvent.sessionId
        ? this.state.currentSession
        : createSession(rawEvent.sessionId);

    session.stats.rawEvents += 1;
    const gameplayEvents = normalizeRawEvent(rawEvent);

    for (const gameplayEvent of gameplayEvents) {
      applyEvent(this.state, this.state.profile, session, gameplayEvent);
    }

    if (gameplayEvents.length > 0) {
      for (const gameplayEvent of gameplayEvents) {
        const lastEvent = this.state.activityLog.at(-1);
        const isDuplicateRest = lastEvent?.type === "rest" && gameplayEvent.type === "rest";
        if (!isDuplicateRest) {
          this.state.activityLog = [...this.state.activityLog, gameplayEvent].slice(-12);
        }
      }
    }

    if (rawEvent.type === "session.ended") {
      this.state.currentSession = undefined;
    } else {
      this.state.currentSession = session;
    }

    return {
      rawEvent,
      gameplayEvents,
      profile: structuredClone(this.state.profile),
      session: structuredClone(session),
    };
  }
}
