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
      currentEnemyName: "Fog Mimic"
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
      monsterJournal: state?.monsterJournal ?? []
    };
  }
  get snapshot() {
    return structuredClone(this.state);
  }
  process(rawEvent) {
    const session = this.state.currentSession && this.state.currentSession.id === rawEvent.sessionId ? this.state.currentSession : createSession(rawEvent.sessionId);
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
import { mkdir, readFile, writeFile } from "fs/promises";
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
function resolveStorageDir() {
  const pluginData = process.env.CLAUDE_PLUGIN_DATA;
  if (pluginData) {
    return join(pluginData, "academy-state");
  }
  return join(findWorkspaceRoot(process.cwd()), ".academy");
}
var DEFAULT_STORAGE_DIR = resolveStorageDir();
var DEFAULT_STATE_FILE = join(DEFAULT_STORAGE_DIR, "state.json");
var FileStore = class {
  constructor(filePath = DEFAULT_STATE_FILE) {
    this.filePath = filePath;
  }
  filePath;
  async load() {
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
        monsterJournal: parsed.monsterJournal ?? []
      };
    } catch {
      return { profile: createDefaultProfile(), activityLog: [], monsterJournal: [] };
    }
  }
  async save(state) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }
  get path() {
    return this.filePath;
  }
};

// ../runtime/src/claudeHooks.ts
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
    return input.slice(0, width);
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
    ...renderDuel(state.currentSession),
    ...renderRecentFeed(state.activityLog),
    ...renderSouvenirs(state.profile),
    ...renderJournal(state.monsterJournal)
  ];
  return lines.join("\n");
}

export {
  AcademyEngine,
  FileStore,
  mapClaudeHookInputToRawEvents,
  renderPersistedPanel
};
