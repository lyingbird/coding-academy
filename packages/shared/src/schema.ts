export const companionStates = [
  "Idle",
  "Scout",
  "Battle",
  "Cast",
  "Hit",
  "Victory",
  "Rest",
  "LevelUp",
] as const;

export type CompanionState = (typeof companionStates)[number];

export const enemyCategories = [
  "Bug",
  "TestFailure",
  "LegacyMonster",
  "RefactorBoss",
  "Unknown",
] as const;

export type EnemyCategory = (typeof enemyCategories)[number];

export const professionTypes = [
  "Debugger",
  "Builder",
  "Refactorer",
  "Archivist",
] as const;

export type ProfessionType = (typeof professionTypes)[number];

export const rawEventTypes = [
  "session.started",
  "prompt.submitted",
  "file.read",
  "search.performed",
  "file.edited",
  "patch.applied",
  "command.started",
  "command.succeeded",
  "command.failed",
  "tests.failed",
  "tests.passed",
  "summary.written",
  "task.completed",
  "session.idle",
  "session.ended",
] as const;

export type RawEventType = (typeof rawEventTypes)[number];

export const gameplayEventTypes = [
  "quest_started",
  "scouting",
  "enemy_spotted",
  "elite_encounter",
  "attack",
  "hit_landed",
  "damage_taken",
  "enemy_weakened",
  "victory",
  "fatigue",
  "loot_collected",
  "rest",
] as const;

export type GameplayEventType = (typeof gameplayEventTypes)[number];

export interface RawEvent {
  type: RawEventType;
  timestamp: string;
  sessionId: string;
  payload?: Record<string, unknown>;
}

export interface GameplayEvent {
  type: GameplayEventType;
  timestamp: string;
  sessionId: string;
  enemyCategory?: EnemyCategory;
  professionSignals?: Partial<Record<ProfessionType, number>>;
  xpReward?: number;
  note?: string;
}

export interface SessionStats {
  scoutingCount: number;
  attackCount: number;
  hitCount: number;
  damageCount: number;
  victories: number;
  rawEvents: number;
  currentEnemy: EnemyCategory;
}

export interface HeroProfile {
  name: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  streak: number;
  totalVictories: number;
  souvenirs: string[];
  professionProgress: Record<ProfessionType, number>;
  dominantProfession: ProfessionType;
  state: CompanionState;
  lastStateChangedAt: string;
  mood: "Calm" | "Focused" | "Tense" | "Hurt" | "Proud";
}

export interface SessionState {
  id: string;
  startedAt: string;
  lastUpdatedAt: string;
  state: CompanionState;
  enemyCategory: EnemyCategory;
  stats: SessionStats;
  lastEvents: GameplayEvent[];
}

export interface EngineUpdate {
  rawEvent: RawEvent;
  gameplayEvents: GameplayEvent[];
  profile: HeroProfile;
  session: SessionState;
}

export interface PersistedState {
  profile: HeroProfile;
  currentSession?: SessionState;
  activityLog: GameplayEvent[];
}
