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

export const strategyModes = ["Cozy", "Flow", "Rush"] as const;

export type StrategyMode = (typeof strategyModes)[number];

export const adapterPlatforms = [
  "claude-code",
  "codex-cli",
  "gemini-cli",
  "qwen-code",
  "openai-cli",
  "openai-compatible",
  "generic-cli",
] as const;

export type AdapterPlatform = (typeof adapterPlatforms)[number];

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
  enemyName?: string;
  professionSignals?: Partial<Record<ProfessionType, number>>;
  xpReward?: number;
  note?: string;
  rewardLabel?: string;
  chestItem?: string;
}

export interface SessionStats {
  scoutingCount: number;
  attackCount: number;
  hitCount: number;
  damageCount: number;
  victories: number;
  rawEvents: number;
  currentEnemy: EnemyCategory;
  currentEnemyName: string;
  estimatedTokens: number;
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
  combo: number;
  maxCombo: number;
  focus: number;
  clues: number;
  charge: number;
  chestsOpened: number;
  strategy: StrategyMode;
  lastChestItem?: string;
}

export interface SessionState {
  id: string;
  startedAt: string;
  lastUpdatedAt: string;
  state: CompanionState;
  enemyCategory: EnemyCategory;
  enemyName: string;
  stats: SessionStats;
  lastEvents: GameplayEvent[];
}

export interface MonsterJournalEntry {
  name: string;
  category: EnemyCategory;
  defeats: number;
  lastSeenAt: string;
}

export interface BurstBank {
  estimatedTokens: number;
  typedChars: number;
  prompts: number;
  reads: number;
  edits: number;
  validations: number;
  failures: number;
  victories: number;
  lastEnemyName?: string;
  lastSummaryAt?: string;
}

export interface BurstResult {
  mode: StrategyMode;
  power: number;
  grade: "Quiet" | "Warm" | "Hot" | "Blazing";
  effortTag: "exploration-heavy" | "patch-heavy" | "validation-heavy" | "mixed";
  xpGain: number;
  focusGain: number;
  cluesGain: number;
  comboGain: number;
  chestItem?: string;
  estimatedTokens: number;
  chargeSpent: number;
  recap?: BurstRecap;
}

export interface BurstRecap {
  timestamp: string;
  title: string;
  summary: string;
  mode: StrategyMode;
  grade: "Quiet" | "Warm" | "Hot" | "Blazing";
  effortTag: "exploration-heavy" | "patch-heavy" | "validation-heavy" | "mixed";
  primaryEnemy?: string;
  loot?: string;
  estimatedTokens: number;
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
  monsterJournal: MonsterJournalEntry[];
  burstBank: BurstBank;
  recentBursts: BurstRecap[];
}

export interface AcademyBridgeTarget {
  workspace?: string;
  storageDir?: string;
  stateFile?: string;
}

export interface AcademyBridgeEnvelope {
  adapter?: AdapterPlatform;
  payload?: unknown;
  events?: RawEvent[];
  target?: AcademyBridgeTarget;
  source?: string;
  emittedAt?: string;
}

export interface AcademyHubManifest {
  host: string;
  port: number;
  token: string;
  pid: number;
  startedAt: string;
  version: 1;
}

export interface AcademyDispatchReceipt {
  accepted: boolean;
  via: "hub" | "local";
  rawEventCount: number;
  storePath: string;
  sessionId?: string;
}
