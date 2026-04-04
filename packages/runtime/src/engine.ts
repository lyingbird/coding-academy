import {
  type CompanionState,
  type EnemyCategory,
  type EngineUpdate,
  type GameplayEvent,
  type GameplayEventType,
  type HeroProfile,
  type PersistedState,
  type ProfessionType,
  type RawEvent,
  type SessionState,
} from "@academy/shared";

const LEVEL_XP = 100;

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
  };
}

export function createSession(sessionId: string): SessionState {
  return {
    id: sessionId,
    startedAt: nowIso(),
    lastUpdatedAt: nowIso(),
    state: "Idle",
    enemyCategory: "Unknown",
    stats: {
      scoutingCount: 0,
      attackCount: 0,
      hitCount: 0,
      damageCount: 0,
      victories: 0,
      rawEvents: 0,
      currentEnemy: "Unknown",
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
      pushEvent(events, rawEvent, "quest_started", { xpReward: 1 });
      break;
    case "session.started":
      break;
    case "file.read":
    case "search.performed":
      pushEvent(events, rawEvent, "scouting", {
        professionSignals: { Debugger: 1 },
      });
      break;
    case "file.edited":
      pushEvent(events, rawEvent, "attack", {
        enemyCategory: classifyEnemy(rawEvent),
        professionSignals: { Builder: 1, Refactorer: 1 },
        xpReward: 2,
      });
      break;
    case "patch.applied":
      pushEvent(events, rawEvent, "hit_landed", {
        enemyCategory: classifyEnemy(rawEvent),
        professionSignals: { Builder: 1, Refactorer: 2 },
        xpReward: 3,
      });
      break;
    case "command.started":
      pushEvent(events, rawEvent, "attack", {
        professionSignals: { Debugger: 1 },
      });
      break;
    case "command.failed":
    case "tests.failed":
      pushEvent(events, rawEvent, "damage_taken", {
        enemyCategory: classifyEnemy(rawEvent),
        professionSignals: { Debugger: 1 },
      });
      break;
    case "command.succeeded":
    case "tests.passed":
      pushEvent(events, rawEvent, "enemy_weakened", {
        enemyCategory: classifyEnemy(rawEvent),
        professionSignals: { Debugger: 1 },
        xpReward: 4,
      });
      if (payload.majorCheck === true) {
        pushEvent(events, rawEvent, "victory", {
          enemyCategory: classifyEnemy(rawEvent),
          professionSignals: { Debugger: 1 },
          xpReward: 6,
          note: "Major validation passed",
        });
      }
      break;
    case "summary.written":
      pushEvent(events, rawEvent, "loot_collected", {
        professionSignals: { Archivist: 2 },
        xpReward: 3,
      });
      break;
    case "task.completed":
      pushEvent(events, rawEvent, "victory", {
        enemyCategory: classifyEnemy(rawEvent),
        professionSignals: { Builder: 1, Archivist: 1 },
        xpReward: 10,
      });
      pushEvent(events, rawEvent, "rest");
      break;
    case "session.idle":
      pushEvent(events, rawEvent, "fatigue");
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

function applyEvent(profile: HeroProfile, session: SessionState, event: GameplayEvent) {
  session.lastUpdatedAt = event.timestamp;
  session.state = nextStateForEvent(event.type, session.state);
  profile.state = session.state;
  profile.lastStateChangedAt = event.timestamp;

  if (event.enemyCategory) {
    session.enemyCategory = event.enemyCategory;
    session.stats.currentEnemy = event.enemyCategory;
  }

  switch (event.type) {
    case "scouting":
      session.stats.scoutingCount += 1;
      profile.mood = "Focused";
      break;
    case "attack":
      session.stats.attackCount += 1;
      profile.mood = "Focused";
      break;
    case "hit_landed":
    case "enemy_weakened":
      session.stats.hitCount += 1;
      profile.mood = "Tense";
      break;
    case "damage_taken":
      session.stats.damageCount += 1;
      profile.hp = Math.max(1, profile.hp - 1);
      profile.mood = "Hurt";
      break;
    case "victory":
      session.stats.victories += 1;
      profile.totalVictories += 1;
      profile.streak += 1;
      profile.hp = Math.min(profile.maxHp, profile.hp + 2);
      profile.mood = "Proud";
      if (profile.totalVictories % 3 === 0) {
        profile.souvenirs.push(`Victory Token ${profile.totalVictories / 3}`);
      }
      break;
    case "fatigue":
      profile.mood = "Tense";
      break;
    case "rest":
      profile.mood = "Calm";
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
      applyEvent(this.state.profile, session, gameplayEvent);
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
