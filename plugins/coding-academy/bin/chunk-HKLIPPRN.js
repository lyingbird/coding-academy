// ../runtime/src/engine.ts
var LEVEL_XP = 100;
var ENEMY_NAME_POOL = {
  Bug: ["Null Pointer Wisp", "Syntax Slime", "Stack Trace Imp"],
  TestFailure: ["Red Test Bat", "Flaky Slime", "Assertion Crow"],
  LegacyMonster: ["Legacy Golem", "Cobweb Troll", "Dusty Module Giant"],
  RefactorBoss: ["Refactor Ogre", "Merge Hydra", "Broken Path Dragon"],
  Unknown: ["Fog Mimic", "Quiet Gremlin", "Shadow TODO"]
};
var CHEST_POOL = [
  "Victory Token",
  "Debug Ribbon",
  "Clean Patch Medal",
  "Lucky Test Feather",
  "Tiny Chest Key"
];
function createBurstBank() {
  return {
    estimatedTokens: 0,
    typedChars: 0,
    prompts: 0,
    reads: 0,
    edits: 0,
    validations: 0,
    failures: 0,
    victories: 0
  };
}
function createBurstRecapHistory() {
  return [];
}
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function createDefaultProfile(name = "Tiny Hero") {
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
      Archivist: 0
    },
    dominantProfession: "Debugger",
    state: "Idle",
    lastStateChangedAt: nowIso(),
    mood: "Calm",
    combo: 0,
    maxCombo: 0,
    focus: 0,
    clues: 0,
    charge: 0,
    chestsOpened: 0,
    strategy: "Flow"
  };
}
function createSession(sessionId) {
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
      estimatedTokens: 0
    },
    lastEvents: []
  };
}
function dominantProfession(progress) {
  return Object.entries(progress).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Debugger";
}
function pushEvent(events, rawEvent, type, options = {}) {
  events.push({
    type,
    timestamp: rawEvent.timestamp,
    sessionId: rawEvent.sessionId,
    ...options
  });
}
function hashText(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = hash * 31 + input.charCodeAt(index) >>> 0;
  }
  return hash;
}
function namedEnemy(category, rawEvent) {
  const pool = ENEMY_NAME_POOL[category];
  const payloadSeed = typeof rawEvent.payload?.target === "string" ? rawEvent.payload.target : typeof rawEvent.payload?.command === "string" ? rawEvent.payload.command : rawEvent.type;
  const index = hashText(`${rawEvent.sessionId}:${payloadSeed}:${category}`) % pool.length;
  return pool[index] ?? ENEMY_NAME_POOL.Unknown[0];
}
function rolledChestItem(rawEvent) {
  const index = hashText(`${rawEvent.sessionId}:${rawEvent.type}:chest`) % CHEST_POOL.length;
  return CHEST_POOL[index] ?? CHEST_POOL[0];
}
function rolledBurstChestItem(bank, strategy) {
  const index = hashText(
    `${bank.estimatedTokens}:${bank.prompts}:${bank.edits}:${bank.validations}:${strategy}:burst`
  ) % CHEST_POOL.length;
  return CHEST_POOL[index] ?? CHEST_POOL[0];
}
function classifyEnemy(rawEvent) {
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
function estimateTokens(rawEvent) {
  const payload = rawEvent.payload ?? {};
  const textParts = [
    typeof payload.prompt === "string" ? payload.prompt : "",
    typeof payload.summary === "string" ? payload.summary : "",
    typeof payload.command === "string" ? payload.command : "",
    typeof payload.target === "string" ? payload.target : "",
    typeof payload.target_file === "string" ? payload.target_file : "",
    typeof payload.file_path === "string" ? payload.file_path : "",
    typeof payload.path === "string" ? payload.path : ""
  ].join(" ");
  const serializedPayload = JSON.stringify(payload);
  const charCount = textParts.length + Math.min(serializedPayload.length, 400);
  return Math.max(1, Math.ceil(charCount / 4));
}
function gainCharge(profile, amount) {
  profile.charge = Math.min(5, profile.charge + amount);
}
function spendCharge(profile, amount) {
  profile.charge = Math.max(0, profile.charge - amount);
}
function applyStrategyOnCleanHit(profile) {
  if (profile.charge <= 0) {
    return;
  }
  switch (profile.strategy) {
    case "Cozy":
      spendCharge(profile, 1);
      profile.hp = Math.min(profile.maxHp, profile.hp + 1);
      break;
    case "Flow":
      spendCharge(profile, 1);
      profile.focus = Math.min(9, profile.focus + 1);
      break;
    case "Rush":
      spendCharge(profile, 1);
      profile.combo += 1;
      profile.maxCombo = Math.max(profile.maxCombo, profile.combo);
      break;
  }
}
function updateBurstBank(bank, rawEvent, gameplayEvents) {
  const payload = rawEvent.payload ?? {};
  const estimated = estimateTokens(rawEvent);
  bank.estimatedTokens += estimated;
  bank.lastSummaryAt = rawEvent.timestamp;
  if (typeof payload.prompt === "string") {
    bank.typedChars += payload.prompt.length;
  }
  switch (rawEvent.type) {
    case "prompt.submitted":
      bank.prompts += 1;
      break;
    case "file.read":
    case "search.performed":
      bank.reads += 1;
      break;
    case "file.edited":
    case "patch.applied":
      bank.edits += 1;
      break;
    case "command.started":
    case "command.succeeded":
    case "command.failed":
    case "tests.passed":
    case "tests.failed":
      bank.validations += 1;
      break;
  }
  for (const event of gameplayEvents) {
    if (event.type === "damage_taken") {
      bank.failures += 1;
    }
    if (event.type === "victory") {
      bank.victories += 1;
      if (event.enemyName) {
        bank.lastEnemyName = event.enemyName;
      }
    }
  }
}
function burstEffortTag(bank) {
  const exploration = bank.reads;
  const patching = bank.edits;
  const validation = bank.validations;
  const maxValue = Math.max(exploration, patching, validation);
  if (maxValue === 0) {
    return "mixed";
  }
  if (exploration === maxValue && exploration > patching && exploration > validation) {
    return "exploration-heavy";
  }
  if (patching === maxValue && patching > exploration && patching > validation) {
    return "patch-heavy";
  }
  if (validation === maxValue && validation > exploration && validation > patching) {
    return "validation-heavy";
  }
  return "mixed";
}
function burstGrade(power) {
  if (power >= 12) {
    return "Blazing";
  }
  if (power >= 8) {
    return "Hot";
  }
  if (power >= 4) {
    return "Warm";
  }
  return "Quiet";
}
function summarizeBurstRecap(state, result) {
  const recent = state.activityLog.slice(-8);
  const enemyCounts = /* @__PURE__ */ new Map();
  for (const event of recent) {
    if (event.enemyName) {
      enemyCounts.set(event.enemyName, (enemyCounts.get(event.enemyName) ?? 0) + 1);
    }
  }
  const primaryEnemy = [...enemyCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? state.burstBank.lastEnemyName;
  const title = primaryEnemy ? result.grade === "Blazing" || result.grade === "Hot" ? `${primaryEnemy} broke open` : `${primaryEnemy} paid out` : `${result.grade} ${result.mode} release`;
  let summary = "A quiet pocket of work still moved the hero forward.";
  switch (result.effortTag) {
    case "exploration-heavy":
      summary = "Most of this payout came from clue-hunting, repo reading, and finding the safe path.";
      break;
    case "patch-heavy":
      summary = "This run leaned on edits and patch pressure. Fewer words, more blade work.";
      break;
    case "validation-heavy":
      summary = "This payout was forged in checks. You kept tightening the loop until the run gave way.";
      break;
    case "mixed":
      summary = "This was a mixed run: scouting, patching, and checking all fed the release.";
      break;
  }
  if (result.grade === "Blazing") {
    summary = `${summary} It landed with real heat.`;
  } else if (result.grade === "Hot") {
    summary = `${summary} Strong enough to feel like a proper check-in.`;
  }
  return {
    timestamp: nowIso(),
    title,
    summary,
    mode: result.mode,
    grade: result.grade,
    effortTag: result.effortTag,
    primaryEnemy,
    loot: result.chestItem,
    estimatedTokens: result.estimatedTokens
  };
}
function burstPower(profile, bank) {
  const tokenPower = Math.floor(bank.estimatedTokens / 120);
  const activityPower = bank.prompts + bank.reads + bank.edits + bank.validations;
  const victoryPower = bank.victories * 2;
  const chargePower = profile.charge;
  return Math.max(1, tokenPower + Math.floor(activityPower / 3) + victoryPower + chargePower);
}
function previewBurst(state) {
  const mode = state.profile.strategy;
  const hasWork = state.burstBank.estimatedTokens > 0 || state.burstBank.prompts > 0 || state.burstBank.reads > 0 || state.burstBank.edits > 0 || state.burstBank.validations > 0 || state.burstBank.victories > 0;
  if (!hasWork) {
    return {
      mode,
      power: 0,
      grade: "Quiet",
      effortTag: "mixed",
      xpGain: 0,
      focusGain: 0,
      cluesGain: 0,
      comboGain: 0,
      estimatedTokens: 0,
      chargeSpent: 0
    };
  }
  const power = burstPower(state.profile, state.burstBank);
  const grade = burstGrade(power);
  const effortTag = burstEffortTag(state.burstBank);
  const chargeSpent = Math.min(state.profile.charge, Math.max(1, Math.ceil(power / 3)));
  let xpGain = power * 2;
  let focusGain = 0;
  let cluesGain = 0;
  let comboGain = 0;
  let chestItem;
  switch (mode) {
    case "Cozy":
      xpGain += 2;
      focusGain = 1;
      break;
    case "Flow":
      focusGain = Math.max(1, Math.ceil(power / 3));
      cluesGain = Math.max(1, Math.ceil(power / 3));
      break;
    case "Rush":
      comboGain = Math.max(1, Math.ceil(power / 3));
      if (power >= 6) {
        chestItem = rolledBurstChestItem(state.burstBank, mode);
      }
      break;
  }
  if (!chestItem && power >= 10) {
    chestItem = rolledBurstChestItem(state.burstBank, mode);
  }
  return {
    mode,
    power,
    grade,
    effortTag,
    xpGain,
    focusGain,
    cluesGain,
    comboGain,
    chestItem,
    estimatedTokens: state.burstBank.estimatedTokens,
    chargeSpent
  };
}
function performBurst(state) {
  const result = previewBurst(state);
  if (result.power === 0) {
    return result;
  }
  const recap = summarizeBurstRecap(state, result);
  state.profile.xp += result.xpGain;
  state.profile.focus = Math.min(9, state.profile.focus + result.focusGain);
  state.profile.clues += result.cluesGain;
  state.profile.combo += result.comboGain;
  state.profile.maxCombo = Math.max(state.profile.maxCombo, state.profile.combo);
  spendCharge(state.profile, result.chargeSpent);
  if (result.mode === "Cozy") {
    state.profile.hp = Math.min(state.profile.maxHp, state.profile.hp + Math.max(1, Math.ceil(result.power / 4)));
  }
  if (result.chestItem) {
    state.profile.chestsOpened += 1;
    state.profile.lastChestItem = result.chestItem;
    state.profile.souvenirs = [...state.profile.souvenirs, result.chestItem].slice(-12);
  }
  while (state.profile.xp >= LEVEL_XP) {
    state.profile.xp -= LEVEL_XP;
    state.profile.level += 1;
    state.profile.maxHp += 2;
    state.profile.hp = state.profile.maxHp;
    state.profile.state = "LevelUp";
    state.profile.mood = "Proud";
  }
  state.burstBank = createBurstBank();
  state.recentBursts = [recap, ...state.recentBursts ?? []].slice(0, 6);
  return {
    ...result,
    recap
  };
}
function normalizeRawEvent(rawEvent) {
  const events = [];
  const payload = rawEvent.payload ?? {};
  switch (rawEvent.type) {
    case "prompt.submitted":
      pushEvent(events, rawEvent, "quest_started", { xpReward: 1, rewardLabel: "Quest On", note: "Campfire lit" });
      break;
    case "session.started":
      break;
    case "file.read":
    case "search.performed":
      pushEvent(events, rawEvent, "scouting", {
        professionSignals: { Debugger: 1 },
        rewardLabel: "Clue +1",
        note: "Found a clue"
      });
      break;
    case "file.edited":
      pushEvent(events, rawEvent, "attack", {
        enemyCategory: classifyEnemy(rawEvent),
        enemyName: namedEnemy(classifyEnemy(rawEvent), rawEvent),
        professionSignals: { Builder: 1, Refactorer: 1 },
        xpReward: 2,
        rewardLabel: "Focus Spent"
      });
      break;
    case "patch.applied":
      pushEvent(events, rawEvent, "hit_landed", {
        enemyCategory: classifyEnemy(rawEvent),
        enemyName: namedEnemy(classifyEnemy(rawEvent), rawEvent),
        professionSignals: { Builder: 1, Refactorer: 2 },
        xpReward: 3,
        rewardLabel: "Combo Up"
      });
      break;
    case "command.started":
      if (payload.majorCheck === true) {
        pushEvent(events, rawEvent, "elite_encounter", {
          enemyCategory: "RefactorBoss",
          enemyName: namedEnemy("RefactorBoss", rawEvent),
          note: "Trial incoming"
        });
      } else {
        pushEvent(events, rawEvent, "enemy_spotted", {
          enemyCategory: "Bug",
          enemyName: namedEnemy("Bug", rawEvent),
          note: "Enemy spotted"
        });
      }
      break;
    case "command.failed":
    case "tests.failed":
      pushEvent(events, rawEvent, "damage_taken", {
        enemyCategory: classifyEnemy(rawEvent),
        enemyName: namedEnemy(classifyEnemy(rawEvent), rawEvent),
        professionSignals: { Debugger: 1 },
        note: "Enemy hit back"
      });
      break;
    case "command.succeeded":
    case "tests.passed":
      pushEvent(events, rawEvent, "enemy_weakened", {
        enemyCategory: classifyEnemy(rawEvent),
        enemyName: namedEnemy(classifyEnemy(rawEvent), rawEvent),
        professionSignals: { Debugger: 1 },
        xpReward: 4,
        rewardLabel: "Combo Up"
      });
      if (payload.majorCheck === true) {
        pushEvent(events, rawEvent, "victory", {
          enemyCategory: classifyEnemy(rawEvent),
          enemyName: namedEnemy(classifyEnemy(rawEvent), rawEvent),
          professionSignals: { Debugger: 1 },
          xpReward: 6,
          note: "Trial cleared",
          rewardLabel: "Tiny Chest",
          chestItem: rolledChestItem(rawEvent)
        });
      }
      break;
    case "summary.written":
      pushEvent(events, rawEvent, "loot_collected", {
        professionSignals: { Archivist: 2 },
        xpReward: 3,
        rewardLabel: "Loot Secured",
        note: "Filed the loot"
      });
      break;
    case "task.completed":
      pushEvent(events, rawEvent, "victory", {
        enemyCategory: classifyEnemy(rawEvent),
        enemyName: namedEnemy(classifyEnemy(rawEvent), rawEvent),
        professionSignals: { Builder: 1, Archivist: 1 },
        xpReward: 10,
        rewardLabel: "Tiny Chest",
        chestItem: rolledChestItem(rawEvent)
      });
      pushEvent(events, rawEvent, "rest");
      break;
    case "session.idle":
      pushEvent(events, rawEvent, "fatigue", {
        note: "Momentum slipping"
      });
      break;
    case "session.ended":
      break;
  }
  return events;
}
function nextStateForEvent(eventType, currentState) {
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
function applyProfessionSignals(profile, event) {
  if (!event.professionSignals) {
    return;
  }
  for (const profession of Object.keys(event.professionSignals)) {
    profile.professionProgress[profession] += event.professionSignals[profession] ?? 0;
  }
  profile.dominantProfession = dominantProfession(profile.professionProgress);
}
function applyRewards(profile, event) {
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
function updateMonsterJournal(state, event) {
  if (event.type !== "victory" || !event.enemyName || !event.enemyCategory) {
    return;
  }
  const existing = state.monsterJournal.find((entry2) => entry2.name === event.enemyName);
  if (existing) {
    existing.defeats += 1;
    existing.lastSeenAt = event.timestamp;
    return;
  }
  const entry = {
    name: event.enemyName,
    category: event.enemyCategory,
    defeats: 1,
    lastSeenAt: event.timestamp
  };
  state.monsterJournal = [entry, ...state.monsterJournal].slice(0, 12);
}
function applyEvent(state, profile, session, event) {
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
      gainCharge(profile, 1);
      session.stats.scoutingCount += 1;
      profile.mood = "Focused";
      profile.clues += 1;
      profile.focus = Math.min(9, profile.focus + 1);
      break;
    case "quest_started":
      gainCharge(profile, 1);
      profile.mood = "Calm";
      break;
    case "enemy_spotted":
    case "elite_encounter":
      profile.mood = "Tense";
      profile.focus = Math.min(9, profile.focus + 1);
      gainCharge(profile, 1);
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
      applyStrategyOnCleanHit(profile);
      break;
    case "damage_taken":
      session.stats.damageCount += 1;
      if (profile.strategy === "Cozy" && profile.charge > 0) {
        spendCharge(profile, 1);
        profile.mood = "Focused";
      } else {
        profile.hp = Math.max(1, profile.hp - 1);
        profile.mood = "Hurt";
      }
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
      if (profile.strategy === "Cozy" && profile.charge > 0) {
        profile.hp = Math.min(profile.maxHp, profile.hp + 1);
      }
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
var AcademyEngine = class {
  state;
  constructor(state) {
    this.state = {
      profile: state?.profile ?? createDefaultProfile(),
      currentSession: state?.currentSession,
      activityLog: state?.activityLog ?? [],
      monsterJournal: state?.monsterJournal ?? [],
      burstBank: state?.burstBank ?? createBurstBank(),
      recentBursts: state?.recentBursts ?? createBurstRecapHistory()
    };
  }
  get snapshot() {
    return structuredClone(this.state);
  }
  process(rawEvent) {
    const session = this.state.currentSession && this.state.currentSession.id === rawEvent.sessionId ? this.state.currentSession : createSession(rawEvent.sessionId);
    session.stats.rawEvents += 1;
    session.stats.estimatedTokens += estimateTokens(rawEvent);
    const gameplayEvents = normalizeRawEvent(rawEvent);
    updateBurstBank(this.state.burstBank, rawEvent, gameplayEvents);
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
      this.state.currentSession = void 0;
    } else {
      this.state.currentSession = session;
    }
    return {
      rawEvent,
      gameplayEvents,
      profile: structuredClone(this.state.profile),
      session: structuredClone(session)
    };
  }
};

// ../runtime/src/store.ts
import { existsSync } from "fs";
import { mkdir, open, readFile, rm, writeFile } from "fs/promises";
import { homedir } from "os";
import { dirname, join } from "path";
function findWorkspaceRoot(startDir) {
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
function resolveAcademyHomeDir() {
  return join(homedir(), ".coding-academy");
}
function resolveStorageDir(target) {
  if (target?.stateFile) {
    return dirname(target.stateFile);
  }
  if (target?.storageDir) {
    return target.storageDir;
  }
  if (process.env.ACADEMY_STATE_FILE) {
    return dirname(process.env.ACADEMY_STATE_FILE);
  }
  if (process.env.ACADEMY_STORAGE_DIR) {
    return process.env.ACADEMY_STORAGE_DIR;
  }
  if (target?.workspace) {
    return join(findWorkspaceRoot(target.workspace), ".academy");
  }
  const pluginData = process.env.CLAUDE_PLUGIN_DATA;
  if (pluginData) {
    return join(pluginData, "academy-state");
  }
  return join(findWorkspaceRoot(process.cwd()), ".academy");
}
var DEFAULT_STORAGE_DIR = resolveStorageDir();
var DEFAULT_STATE_FILE = join(DEFAULT_STORAGE_DIR, "state.json");
function resolveStateFilePath(target) {
  if (target?.stateFile) {
    return target.stateFile;
  }
  if (process.env.ACADEMY_STATE_FILE) {
    return process.env.ACADEMY_STATE_FILE;
  }
  return join(resolveStorageDir(target), "state.json");
}
var FileStore = class {
  constructor(filePath = DEFAULT_STATE_FILE) {
    this.filePath = filePath;
  }
  filePath;
  get lockPath() {
    return `${this.filePath}.lock`;
  }
  async sleep(milliseconds) {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
  async withLock(fn) {
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
        if (error.code !== "EEXIST") {
          throw error;
        }
        if (Date.now() - startedAt > 1e4) {
          throw new Error(`Timed out waiting for academy state lock: ${this.lockPath}`);
        }
        await this.sleep(50);
      }
    }
  }
  async loadUnsafe() {
    try {
      const content = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(content);
      const fallbackSession = parsed.currentSession ? createSession(parsed.currentSession.id) : void 0;
      return {
        profile: {
          ...createDefaultProfile(),
          ...parsed.profile,
          professionProgress: {
            ...createDefaultProfile().professionProgress,
            ...parsed.profile?.professionProgress ?? {}
          }
        },
        currentSession: parsed.currentSession ? {
          ...fallbackSession,
          ...parsed.currentSession,
          stats: {
            ...fallbackSession?.stats,
            ...parsed.currentSession.stats ?? {}
          },
          lastEvents: parsed.currentSession.lastEvents ?? []
        } : void 0,
        activityLog: parsed.activityLog ?? [],
        monsterJournal: parsed.monsterJournal ?? [],
        burstBank: {
          ...createBurstBank(),
          ...parsed.burstBank ?? {}
        },
        recentBursts: parsed.recentBursts ?? createBurstRecapHistory()
      };
    } catch {
      return {
        profile: createDefaultProfile(),
        activityLog: [],
        monsterJournal: [],
        burstBank: createBurstBank(),
        recentBursts: createBurstRecapHistory()
      };
    }
  }
  async saveUnsafe(state) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }
  async load() {
    return this.loadUnsafe();
  }
  async save(state) {
    await this.withLock(async () => {
      await this.saveUnsafe(state);
    });
  }
  async transact(mutate) {
    return this.withLock(async () => {
      const state = await this.loadUnsafe();
      const result = await mutate(state);
      await this.saveUnsafe(state);
      return {
        state,
        result
      };
    });
  }
  get path() {
    return this.filePath;
  }
};

// ../runtime/src/render.ts
var PANEL_WIDTH = 58;
var FEED_LIMIT = 6;
var heroArtByState = {
  Idle: ["  O  ", " /|\\ ", " / \\ "],
  Scout: ["  O> ", " /|  ", " / \\ "],
  Battle: [" \\O/ ", "  |  ", " / \\ "],
  Cast: ["  O* ", " /|\\ ", " / \\ "],
  Hit: ["  xo ", " /|  ", " / \\ "],
  Victory: [" \\o/ ", "  |  ", " / \\ "],
  Rest: ["  zZ ", " (o) ", " /|\\ "],
  LevelUp: ["  *O* ", " /|\\ ", " / \\ "]
};
var enemyGlyphByCategory = {
  Bug: "[bug]",
  TestFailure: "[test]",
  LegacyMonster: "[legacy]",
  RefactorBoss: "[boss]",
  Unknown: "[fog]"
};
function padRight(input, width) {
  if (input.length >= width) {
    if (width <= 3) {
      return input.slice(0, width);
    }
    return `${input.slice(0, width - 3)}...`;
  }
  return input + " ".repeat(width - input.length);
}
function border(title) {
  if (!title) {
    return `+${"-".repeat(PANEL_WIDTH - 2)}+`;
  }
  const text = ` ${title} `;
  const remaining = Math.max(0, PANEL_WIDTH - 2 - text.length);
  return `+${text}${"-".repeat(remaining)}+`;
}
function row(content = "") {
  return `| ${padRight(content, PANEL_WIDTH - 4)} |`;
}
function progressBar(label, value, total, width = 18) {
  const safeTotal = Math.max(1, total);
  const ratio = Math.max(0, Math.min(1, value / safeTotal));
  const filled = Math.round(ratio * width);
  const bar = `${"#".repeat(filled)}${"-".repeat(width - filled)}`;
  return `${label} [${bar}] ${value}/${total}`;
}
function moodLine(profile) {
  return `${profile.name} Lv.${profile.level} ${profile.dominantProfession} | ${profile.mood}`;
}
function strategyHint(strategy) {
  switch (strategy) {
    case "Cozy":
      return "Charge softens the next hit";
    case "Flow":
      return "Charge turns clean hits into focus";
    case "Rush":
      return "Charge turns clean hits into combo";
  }
}
function companionVoice(profile, session, state) {
  const enemy = session?.enemyName ?? state?.burstBank.lastEnemyName;
  if (session?.state === "Battle" || session?.state === "Cast") {
    switch (profile.strategy) {
      case "Cozy":
        return `I see ${enemy ?? "the problem"}. Slow hands, clean win.`;
      case "Flow":
        return `Thread is warm. ${enemy ?? "This one"} will break if we keep rhythm.`;
      case "Rush":
        return `${enemy ?? "This thing"} is almost open. Say the word and I spike it.`;
    }
  }
  if (profile.charge >= 4) {
    switch (profile.strategy) {
      case "Cozy":
        return "We have enough charge. Cash it gently and keep the streak safe.";
      case "Flow":
        return "Charge is ripe. One check-in and we turn this run into momentum.";
      case "Rush":
        return "Battery is hot. Pull me over and let me burst.";
    }
  }
  if (profile.mood === "Hurt") {
    return "Little messy, but not a wipe. Give me one clean pass and I am back.";
  }
  if (profile.mood === "Proud") {
    return `That last chest felt good. ${enemy ? `We clipped ${enemy} on the way out.` : "Let's keep that energy."}`;
  }
  return "Keep vibecoding. I am bottling the effort until you want the payoff.";
}
function waitingLine(profile, session) {
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
      return profile.strategy === "Cozy" ? "Brewing tea while Claude thinks." : profile.strategy === "Flow" ? "Following the warmest clue." : "Leaning forward for the first opening.";
    case "Battle":
    case "Cast":
      return profile.strategy === "Cozy" ? "Holding the line and waiting for a safe swing." : profile.strategy === "Flow" ? "Riding the thread without forcing it." : "Coiling up for a burst finish.";
    case "Hit":
      return profile.strategy === "Cozy" ? "Shaking it off. The stance still holds." : profile.strategy === "Flow" ? "Resetting rhythm after a rough exchange." : "Snarling and looking for a snap-back.";
    case "Victory":
      return "Let the reward breathe for a second.";
    case "Rest":
      return "Cooling down before the next prompt.";
    default:
      return "Hovering in the quiet between ideas.";
  }
}
function nextPopLine(profile) {
  if (profile.charge === 0) {
    return "Next pop: one quiet beat builds your first charge.";
  }
  if (profile.charge < 3) {
    return `Next pop: ${strategyHint(profile.strategy)}.`;
  }
  return `Next pop: ${profile.strategy} stance is primed for a clean hit.`;
}
function sessionHeadline(session) {
  if (!session) {
    return "No active quest. Tiny hero is waiting.";
  }
  return `${session.state} | ${session.enemyName} ${enemyGlyphByCategory[session.stats.currentEnemy]}`;
}
function summarizeEvent(event) {
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
function renderHeroArt(state) {
  return heroArtByState[state] ?? heroArtByState.Idle;
}
function renderOverview(profile, session) {
  const art = renderHeroArt(profile.state);
  const lines = [];
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
function renderVibeLoop(profile, session) {
  const lines = [];
  lines.push(border("Vibe Loop"));
  lines.push(row(waitingLine(profile, session)));
  lines.push(row(nextPopLine(profile)));
  lines.push(border());
  return lines;
}
function renderCompanionVoice(state) {
  const lines = [];
  lines.push(border("Companion"));
  lines.push(row(companionVoice(state.profile, state.currentSession, state)));
  lines.push(border());
  return lines;
}
function renderLatestCheckIn(recaps) {
  const lines = [];
  lines.push(border("Latest Check-In"));
  const latest = recaps[0];
  if (!latest) {
    lines.push(row("No burst recap yet. Bring back a fresh run."));
    lines.push(border());
    return lines;
  }
  lines.push(row(latest.title));
  lines.push(row(`${latest.grade} | ${latest.mode} | ${latest.effortTag}`));
  lines.push(row(`~${latest.estimatedTokens} tok${latest.loot ? ` | Loot ${latest.loot}` : ""}`));
  lines.push(row(latest.summary));
  lines.push(border());
  return lines;
}
function renderBurstCache(state) {
  const lines = [];
  lines.push(border("Burst Cache"));
  lines.push(row(`~${state.burstBank.estimatedTokens} tok | prompts ${state.burstBank.prompts} | edits ${state.burstBank.edits}`));
  lines.push(row(`reads ${state.burstBank.reads} | checks ${state.burstBank.validations} | wins ${state.burstBank.victories}`));
  lines.push(row(`Ready move: ${state.profile.strategy} burst`));
  lines.push(border());
  return lines;
}
function renderDuel(session) {
  const lines = [];
  lines.push(border("Current Duel"));
  if (!session) {
    lines.push(row("No live battle. Start Codex or Claude Code."));
    lines.push(border());
    return lines;
  }
  lines.push(row(`Enemy ${session.enemyName}`));
  lines.push(row(`Reads ${session.stats.scoutingCount} | Attacks ${session.stats.attackCount} | Hits ${session.stats.hitCount}`));
  lines.push(row(`Damage ${session.stats.damageCount} | Victories ${session.stats.victories}`));
  lines.push(row(`Session effort ~${session.stats.estimatedTokens} tok`));
  lines.push(border());
  return lines;
}
function renderRecentFeed(events) {
  const lines = [];
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
function renderSouvenirs(profile) {
  const lines = [];
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
function renderJournal(entries) {
  const lines = [];
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
function renderPersistedPanel(state) {
  const lines = [
    ...renderOverview(state.profile, state.currentSession),
    ...renderVibeLoop(state.profile, state.currentSession),
    ...renderCompanionVoice(state),
    ...renderLatestCheckIn(state.recentBursts),
    ...renderBurstCache(state),
    ...renderDuel(state.currentSession),
    ...renderRecentFeed(state.activityLog),
    ...renderSouvenirs(state.profile),
    ...renderJournal(state.monsterJournal)
  ];
  return lines.join("\n");
}
function renderBurstResult(result) {
  const lines = [];
  lines.push(border("Check-In Burst"));
  if (result.power === 0) {
    lines.push(row("No fresh vibe is stored yet."));
    lines.push(row("Go do a little vibecoding, then come back and burst."));
    lines.push(border());
    return lines.join("\n");
  }
  lines.push(row(`${result.grade} ${result.mode} release | ${result.effortTag}`));
  lines.push(row(`You bottled ~${result.estimatedTokens} tok and spent ${result.chargeSpent} charge.`));
  lines.push(row(`XP +${result.xpGain} | Focus +${result.focusGain} | Clues +${result.cluesGain}`));
  lines.push(row(`Combo +${result.comboGain}${result.chestItem ? ` | Loot ${result.chestItem}` : ""}`));
  lines.push(
    row(
      result.grade === "Blazing" ? "That was a real pop. Worth the tab switch." : result.grade === "Hot" ? "Solid release. The run had real heat in it." : result.grade === "Warm" ? "Nice little payout. Enough to keep the loop sweet." : "Quiet release, but it still moved the hero forward."
    )
  );
  if (result.recap) {
    lines.push(row());
    lines.push(row(result.recap.title));
    lines.push(row(result.recap.summary));
  }
  lines.push(border());
  return lines.join("\n");
}
var SIDECAR_WIDTH = 34;
function sidecarPad(input, width = SIDECAR_WIDTH - 4) {
  if (input.length >= width) {
    if (width <= 3) {
      return input.slice(0, width);
    }
    return `${input.slice(0, width - 3)}...`;
  }
  return input + " ".repeat(width - input.length);
}
function sidecarBorder(title) {
  if (!title) {
    return `+${"-".repeat(SIDECAR_WIDTH - 2)}+`;
  }
  const text = ` ${title} `;
  const remaining = Math.max(0, SIDECAR_WIDTH - 2 - text.length);
  return `+${text}${"-".repeat(remaining)}+`;
}
function sidecarRow(content = "") {
  return `| ${sidecarPad(content)} |`;
}
function worldLabel(state) {
  const totalWins = state.profile.totalVictories;
  const zone = Math.floor(totalWins / 5) + 1;
  const room = totalWins % 5 + 1;
  return `World ${zone}-${room}`;
}
function compactRecentLine(state) {
  const latest = state.activityLog.at(-1);
  if (!latest) {
    return "quiet march";
  }
  switch (latest.type) {
    case "enemy_spotted":
    case "elite_encounter":
      return `spotted ${latest.enemyName ?? "a foe"}`;
    case "attack":
    case "hit_landed":
      return `pressing ${latest.enemyName ?? "the enemy"}`;
    case "damage_taken":
      return `took a hit from ${latest.enemyName ?? "a foe"}`;
    case "victory":
      return `cleared ${latest.enemyName ?? "the room"}`;
    case "loot_collected":
      return latest.chestItem ? `loot ${latest.chestItem}` : "bag got heavier";
    default:
      return summarizeEvent(latest);
  }
}
function compactEnemyLabel(state) {
  if (state.currentSession) {
    return state.currentSession.enemyName;
  }
  if (state.burstBank.lastEnemyName) {
    return state.burstBank.lastEnemyName;
  }
  return "No foe yet";
}
function compactHeroGlyph(profile) {
  switch (profile.state) {
    case "Scout":
      return "^_^>";
    case "Battle":
      return "o_o/";
    case "Cast":
      return "*_*";
    case "Hit":
      return "x_x";
    case "Victory":
      return "\\o/";
    case "Rest":
      return "-_-";
    case "LevelUp":
      return "^o^";
    default:
      return "^_^";
  }
}
function renderSidecarPanel(state) {
  const lines = [];
  const latestRecap = state.recentBursts[0];
  lines.push(sidecarBorder("Coding Academy"));
  lines.push(sidecarRow(`${state.profile.name} Lv.${state.profile.level} ${state.profile.dominantProfession}`));
  lines.push(sidecarRow(`${worldLabel(state)} | ${state.profile.strategy} | x${state.profile.streak}`));
  lines.push(sidecarRow());
  lines.push(sidecarRow(`${compactHeroGlyph(state.profile)}  vs  ${compactEnemyLabel(state)}`));
  lines.push(
    sidecarRow(
      `HP ${state.profile.hp}/${state.profile.maxHp}  Charge ${state.profile.charge}  Combo ${state.profile.combo}`
    )
  );
  lines.push(sidecarRow(`now: ${compactRecentLine(state)}`));
  lines.push(sidecarRow());
  lines.push(
    sidecarRow(
      latestRecap ? `check-in: ${latestRecap.title}` : "check-in: bottling your effort"
    )
  );
  lines.push(
    sidecarRow(
      latestRecap ? `${latestRecap.grade} | ~${latestRecap.estimatedTokens} tok` : `cache ~${state.burstBank.estimatedTokens} tok`
    )
  );
  lines.push(
    sidecarRow(
      state.profile.lastChestItem ? `loot: ${state.profile.lastChestItem}` : "loot: bag still empty"
    )
  );
  lines.push(sidecarBorder());
  return lines.join("\n");
}

// ../runtime/src/hub.ts
import { createServer } from "http";
import { randomBytes } from "crypto";
import { existsSync as existsSync2 } from "fs";
import { mkdir as mkdir2, readFile as readFile2, rm as rm2, writeFile as writeFile2 } from "fs/promises";
import { dirname as dirname2, join as join2 } from "path";

// ../runtime/src/adapters/claude.ts
function nowIso2() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function bashCommand(input) {
  const command = input.tool_input?.command;
  return typeof command === "string" ? command : "";
}
function toolName(input) {
  return typeof input.tool_name === "string" ? input.tool_name : "";
}
function fileTarget(input) {
  const candidateKeys = ["file_path", "target_file", "filePath", "path"];
  for (const key of candidateKeys) {
    const value = input.tool_input?.[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return void 0;
}
function looksLikeTestCommand(command) {
  const normalized = command.toLowerCase();
  return [
    "test",
    "vitest",
    "jest",
    "pytest",
    "cargo test",
    "go test",
    "pnpm test",
    "npm test",
    "bun test",
    "uv run pytest"
  ].some((token) => normalized.includes(token));
}
function makeRawEvent(input, type, payload) {
  if (!input.session_id) {
    return null;
  }
  return {
    type,
    sessionId: input.session_id,
    timestamp: nowIso2(),
    payload
  };
}
function mapClaudeHookInputToRawEvents(input) {
  const eventName = input.hook_event_name;
  if (!eventName) {
    return [];
  }
  switch (eventName) {
    case "SessionStart": {
      const event = makeRawEvent(input, "session.started", {
        cwd: input.cwd
      });
      return event ? [event] : [];
    }
    case "UserPromptSubmit": {
      const event = makeRawEvent(input, "prompt.submitted", {
        prompt: input.prompt
      });
      return event ? [event] : [];
    }
    case "PreToolUse": {
      const currentTool = toolName(input);
      switch (currentTool) {
        case "Read": {
          const event = makeRawEvent(input, "file.read", {
            phase: "start",
            target: fileTarget(input),
            ...input.tool_input
          });
          return event ? [event] : [];
        }
        case "Grep":
        case "Glob":
        case "WebSearch":
        case "WebFetch": {
          const event = makeRawEvent(input, "search.performed", {
            phase: "start",
            toolName: currentTool,
            ...input.tool_input
          });
          return event ? [event] : [];
        }
        case "Edit":
        case "Write":
        case "MultiEdit": {
          const event = makeRawEvent(input, "file.edited", {
            phase: "start",
            toolName: currentTool,
            target: fileTarget(input),
            ...input.tool_input
          });
          return event ? [event] : [];
        }
        case "Bash": {
          const command = bashCommand(input);
          const event = makeRawEvent(input, "command.started", {
            command,
            majorCheck: looksLikeTestCommand(command)
          });
          return event ? [event] : [];
        }
        default:
          return [];
      }
    }
    case "PostToolUse": {
      switch (toolName(input)) {
        case "Read": {
          const event = makeRawEvent(input, "file.read", {
            phase: "finish",
            target: fileTarget(input),
            ...input.tool_input
          });
          return event ? [event] : [];
        }
        case "Grep":
        case "Glob":
        case "WebSearch":
        case "WebFetch": {
          const event = makeRawEvent(input, "search.performed", {
            phase: "finish",
            toolName: toolName(input),
            ...input.tool_input
          });
          return event ? [event] : [];
        }
        case "Edit":
        case "Write":
        case "MultiEdit": {
          const patchEvent = makeRawEvent(input, "patch.applied", {
            toolName: toolName(input),
            target: fileTarget(input),
            ...input.tool_input,
            ...input.tool_response
          });
          return patchEvent ? [patchEvent] : [];
        }
        case "Bash": {
          const command = bashCommand(input);
          const type = looksLikeTestCommand(command) ? "tests.passed" : "command.succeeded";
          const event = makeRawEvent(input, type, {
            command,
            majorCheck: looksLikeTestCommand(command)
          });
          return event ? [event] : [];
        }
        default:
          return [];
      }
    }
    case "PostToolUseFailure": {
      if (input.tool_name === "Bash") {
        const command = bashCommand(input);
        const type = looksLikeTestCommand(command) ? "tests.failed" : "command.failed";
        const event = makeRawEvent(input, type, {
          command,
          majorCheck: looksLikeTestCommand(command)
        });
        return event ? [event] : [];
      }
      return [];
    }
    case "Stop": {
      const events = [];
      const summaryEvent = makeRawEvent(input, "summary.written", {
        summary: input.last_assistant_message
      });
      if (summaryEvent) {
        events.push(summaryEvent);
      }
      const completionEvent = makeRawEvent(input, "task.completed", {
        summary: input.last_assistant_message
      });
      if (completionEvent) {
        events.push(completionEvent);
      }
      const endEvent = makeRawEvent(input, "session.ended");
      if (endEvent) {
        events.push(endEvent);
      }
      return events;
    }
    default:
      return [];
  }
}

// ../runtime/src/adapters/codex.ts
function nowIso3() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function make(sessionId, type, payload) {
  if (!sessionId) {
    return [];
  }
  return [{ type, sessionId, timestamp: nowIso3(), payload }];
}
function mapCodexInputToRawEvents(input) {
  switch (input.event) {
    case "session_start":
      return make(input.sessionId, "session.started", { cwd: input.cwd });
    case "prompt":
      return make(input.sessionId, "prompt.submitted", { prompt: input.prompt });
    case "read":
      return make(input.sessionId, "file.read", { target: input.file });
    case "search":
      return make(input.sessionId, "search.performed", { query: input.query });
    case "edit":
      return make(input.sessionId, "file.edited", { target: input.file });
    case "patch":
      return make(input.sessionId, "patch.applied", { target: input.file });
    case "command_start":
      return make(input.sessionId, "command.started", { command: input.command, majorCheck: input.majorCheck === true });
    case "command_ok":
      return make(input.sessionId, input.majorCheck === true ? "tests.passed" : "command.succeeded", {
        command: input.command,
        majorCheck: input.majorCheck === true
      });
    case "command_fail":
      return make(input.sessionId, input.majorCheck === true ? "tests.failed" : "command.failed", {
        command: input.command,
        majorCheck: input.majorCheck === true
      });
    case "summary":
      return make(input.sessionId, "summary.written", { summary: input.summary });
    case "stop":
      return make(input.sessionId, "session.ended");
    default:
      return [];
  }
}

// ../runtime/src/adapters/gemini.ts
function nowIso4() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function make2(sessionId, type, payload) {
  if (!sessionId) {
    return [];
  }
  return [{ type, sessionId, timestamp: nowIso4(), payload }];
}
function mapGeminiInputToRawEvents(input) {
  switch (input.phase) {
    case "start":
      return make2(input.session_id, "session.started");
    case "prompt":
      return make2(input.session_id, "prompt.submitted", { prompt: input.prompt });
    case "read":
      return make2(input.session_id, "file.read", { target: input.target });
    case "search":
      return make2(input.session_id, "search.performed", { query: input.query });
    case "edit":
      return make2(input.session_id, "file.edited", { target: input.target });
    case "patch":
      return make2(input.session_id, "patch.applied", { target: input.target });
    case "validate_ok":
      return make2(input.session_id, "tests.passed", { command: input.command, majorCheck: true });
    case "validate_fail":
      return make2(input.session_id, "tests.failed", { command: input.command, majorCheck: true });
    case "summary":
      return make2(input.session_id, "summary.written", { summary: input.summary });
    case "finish":
      return make2(input.session_id, "session.ended");
    default:
      return [];
  }
}

// ../runtime/src/adapters/generic.ts
function mapGenericInputToRawEvents(input) {
  return Array.isArray(input.events) ? input.events : [];
}

// ../runtime/src/adapters/openai.ts
function nowIso5() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function make3(sessionId, type, payload) {
  if (!sessionId) {
    return [];
  }
  return [{ type, sessionId, timestamp: nowIso5(), payload }];
}
function mapOpenAiCliInputToRawEvents(input) {
  switch (input.event) {
    case "session_start":
      return make3(input.session_id, "session.started");
    case "prompt":
      return make3(input.session_id, "prompt.submitted", { prompt: input.prompt });
    case "read":
      return make3(input.session_id, "file.read", { target: input.target });
    case "search":
      return make3(input.session_id, "search.performed", { query: input.query });
    case "edit":
      return make3(input.session_id, "file.edited", { target: input.target });
    case "patch":
      return make3(input.session_id, "patch.applied", { target: input.target });
    case "check_ok":
      return make3(input.session_id, input.majorCheck === true ? "tests.passed" : "command.succeeded", {
        command: input.command,
        majorCheck: input.majorCheck === true
      });
    case "check_fail":
      return make3(input.session_id, input.majorCheck === true ? "tests.failed" : "command.failed", {
        command: input.command,
        majorCheck: input.majorCheck === true
      });
    case "summary":
      return make3(input.session_id, "summary.written", { summary: input.summary });
    case "finish":
      return make3(input.session_id, "session.ended");
    default:
      return [];
  }
}

// ../runtime/src/adapters/qwen.ts
function nowIso6() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function make4(sessionId, type, payload) {
  if (!sessionId) {
    return [];
  }
  return [{ type, sessionId, timestamp: nowIso6(), payload }];
}
function mapQwenCodeInputToRawEvents(input) {
  switch (input.phase) {
    case "start":
      return make4(input.conversation_id, "session.started");
    case "prompt":
      return make4(input.conversation_id, "prompt.submitted", { prompt: input.prompt });
    case "search":
      return make4(input.conversation_id, "search.performed", { query: input.query });
    case "read":
      return make4(input.conversation_id, "file.read", { target: input.target });
    case "edit":
      return make4(input.conversation_id, "file.edited", { target: input.target });
    case "patch":
      return make4(input.conversation_id, "patch.applied", { target: input.target });
    case "validate_ok":
      return make4(input.conversation_id, "tests.passed", { command: input.command, majorCheck: true });
    case "validate_fail":
      return make4(input.conversation_id, "tests.failed", { command: input.command, majorCheck: true });
    case "summary":
      return make4(input.conversation_id, "summary.written", { summary: input.summary });
    case "finish":
      return make4(input.conversation_id, "session.ended");
    default:
      return [];
  }
}

// ../runtime/src/hub.ts
var HUB_MANIFEST_PATH = join2(resolveAcademyHomeDir(), "hub.json");
function nowIso7() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
async function readHubManifest() {
  try {
    const raw = await readFile2(HUB_MANIFEST_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function mapAdapterInputToRawEvents(adapter, payload) {
  switch (adapter) {
    case "claude-code":
      return mapClaudeHookInputToRawEvents(payload);
    case "codex-cli":
      return mapCodexInputToRawEvents(payload);
    case "gemini-cli":
      return mapGeminiInputToRawEvents(payload);
    case "openai-cli":
    case "openai-compatible":
      return mapOpenAiCliInputToRawEvents(payload);
    case "qwen-code":
      return mapQwenCodeInputToRawEvents(payload);
    case "generic-cli":
      return mapGenericInputToRawEvents(payload);
    default:
      return [];
  }
}
async function applyRawEventsLocally(rawEvents, target) {
  const storePath = resolveStateFilePath(target);
  const store = new FileStore(storePath);
  const transaction = await store.transact(async (persisted) => {
    const engine = new AcademyEngine(persisted);
    for (const rawEvent of rawEvents) {
      engine.process(rawEvent);
    }
    Object.assign(persisted, engine.snapshot);
    return null;
  });
  return {
    receipt: {
      accepted: true,
      via: "local",
      rawEventCount: rawEvents.length,
      storePath,
      sessionId: rawEvents[0]?.sessionId
    },
    snapshot: transaction.state
  };
}
async function dispatchBridgeEnvelopeLocally(envelope) {
  const rawEvents = Array.isArray(envelope.events) ? envelope.events : envelope.adapter ? mapAdapterInputToRawEvents(envelope.adapter, envelope.payload) : [];
  if (rawEvents.length === 0) {
    return null;
  }
  return applyRawEventsLocally(rawEvents, envelope.target);
}
async function sendBridgeEnvelopeToHub(envelope) {
  const manifest = await readHubManifest();
  if (!manifest) {
    return null;
  }
  try {
    const response = await fetch(`http://${manifest.host}:${manifest.port}/v1/ingest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${manifest.token}`
      },
      body: JSON.stringify({
        ...envelope,
        emittedAt: envelope.emittedAt ?? nowIso7()
      })
    });
    if (!response.ok) {
      return null;
    }
    const receipt = await response.json();
    return receipt;
  } catch {
    return null;
  }
}
async function dispatchBridgeEnvelope(envelope) {
  const viaHub = await sendBridgeEnvelopeToHub(envelope);
  if (viaHub) {
    return { receipt: viaHub };
  }
  const local = await dispatchBridgeEnvelopeLocally(envelope);
  if (!local) {
    const fallbackPath = resolveStateFilePath(envelope.target);
    return {
      receipt: {
        accepted: false,
        via: "local",
        rawEventCount: 0,
        storePath: fallbackPath
      }
    };
  }
  return local;
}

export {
  previewBurst,
  performBurst,
  resolveStateFilePath,
  FileStore,
  renderPersistedPanel,
  renderBurstResult,
  renderSidecarPanel,
  dispatchBridgeEnvelope
};
