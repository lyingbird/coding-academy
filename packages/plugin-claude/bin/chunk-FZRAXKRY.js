// ../runtime/src/engine.ts
var LEVEL_XP = 100;
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
    mood: "Calm"
  };
}
function createSession(sessionId) {
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
      currentEnemy: "Unknown"
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
function normalizeRawEvent(rawEvent) {
  const events = [];
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
        professionSignals: { Debugger: 1 }
      });
      break;
    case "file.edited":
      pushEvent(events, rawEvent, "attack", {
        enemyCategory: classifyEnemy(rawEvent),
        professionSignals: { Builder: 1, Refactorer: 1 },
        xpReward: 2
      });
      break;
    case "patch.applied":
      pushEvent(events, rawEvent, "hit_landed", {
        enemyCategory: classifyEnemy(rawEvent),
        professionSignals: { Builder: 1, Refactorer: 2 },
        xpReward: 3
      });
      break;
    case "command.started":
      pushEvent(events, rawEvent, "attack", {
        professionSignals: { Debugger: 1 }
      });
      break;
    case "command.failed":
    case "tests.failed":
      pushEvent(events, rawEvent, "damage_taken", {
        enemyCategory: classifyEnemy(rawEvent),
        professionSignals: { Debugger: 1 }
      });
      break;
    case "command.succeeded":
    case "tests.passed":
      pushEvent(events, rawEvent, "enemy_weakened", {
        enemyCategory: classifyEnemy(rawEvent),
        professionSignals: { Debugger: 1 },
        xpReward: 4
      });
      if (payload.majorCheck === true) {
        pushEvent(events, rawEvent, "victory", {
          enemyCategory: classifyEnemy(rawEvent),
          professionSignals: { Debugger: 1 },
          xpReward: 6,
          note: "Major validation passed"
        });
      }
      break;
    case "summary.written":
      pushEvent(events, rawEvent, "loot_collected", {
        professionSignals: { Archivist: 2 },
        xpReward: 3
      });
      break;
    case "task.completed":
      pushEvent(events, rawEvent, "victory", {
        enemyCategory: classifyEnemy(rawEvent),
        professionSignals: { Builder: 1, Archivist: 1 },
        xpReward: 10
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
function applyEvent(profile, session, event) {
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
var AcademyEngine = class {
  state;
  constructor(state) {
    this.state = {
      profile: state?.profile ?? createDefaultProfile(),
      currentSession: state?.currentSession,
      activityLog: state?.activityLog ?? []
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
      return {
        profile: parsed.profile ?? createDefaultProfile(),
        currentSession: parsed.currentSession,
        activityLog: parsed.activityLog ?? []
      };
    } catch {
      return { profile: createDefaultProfile(), activityLog: [] };
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
function sessionHeadline(session) {
  if (!session) {
    return "No active quest. Tiny hero is waiting.";
  }
  const shortSessionId = session.id.length > 16 ? session.id.slice(-16) : session.id;
  return `Quest ${shortSessionId} | ${session.state} | ${enemyGlyphByCategory[session.stats.currentEnemy]}`;
}
function summarizeEvent(event) {
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
function renderHeroArt(state) {
  return heroArtByState[state] ?? heroArtByState.Idle;
}
function renderOverview(profile, session) {
  const art = renderHeroArt(profile.state);
  const lines = [];
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
function renderSessionStats(session) {
  const lines = [];
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
function renderPersistedPanel(state) {
  const lines = [
    ...renderOverview(state.profile, state.currentSession),
    ...renderSessionStats(state.currentSession),
    ...renderRecentFeed(state.activityLog),
    ...renderSouvenirs(state.profile)
  ];
  return lines.join("\n");
}

export {
  AcademyEngine,
  FileStore,
  mapClaudeHookInputToRawEvents,
  renderPersistedPanel
};
