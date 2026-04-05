import type { CompanionState, PersistedState } from "@academy/shared";

type ShellMode = "auto" | "narrow" | "full";

const FULL_WIDTH = 34;
const BUBBLE_WIDTH = 30;

function worldLabel(state: PersistedState): string {
  const totalWins = state.profile.totalVictories;
  const zone = Math.floor(totalWins / 5) + 1;
  const room = (totalWins % 5) + 1;
  return `World ${zone}-${room}`;
}

function lastEnemy(state: PersistedState): string {
  return state.currentSession?.enemyName ?? state.burstBank.lastEnemyName ?? "No foe yet";
}

function compact(input: string, width: number): string {
  if (input.length <= width) {
    return input;
  }
  if (width <= 3) {
    return input.slice(0, width);
  }
  return `${input.slice(0, width - 3)}...`;
}

function wrapWords(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (`${current} ${word}`.length > width) {
      lines.push(compact(current, width));
      current = word;
      continue;
    }
    current = `${current} ${word}`;
  }
  if (current) {
    lines.push(compact(current, width));
  }
  return lines;
}

function shellMoodText(state: PersistedState): string {
  const { profile, currentSession, recentBursts } = state;
  const recent = recentBursts[0];

  if (currentSession?.state === "Battle" || currentSession?.state === "Cast") {
    if (profile.strategy === "Rush") {
      return `${lastEnemy(state)} is wobbling. One more clean swing.`;
    }
    if (profile.strategy === "Cozy") {
      return `${lastEnemy(state)} is in sight. Soft hands, no panic.`;
    }
    return `Good thread. ${lastEnemy(state)} will crack if we keep rhythm.`;
  }

  if (profile.mood === "Proud" && recent?.loot) {
    return `Still thinking about that ${recent.loot}. That chest felt nice.`;
  }

  if (profile.mood === "Hurt") {
    return "Bit scruffy, not broken. Give me one clean pass and I reset.";
  }

  if (profile.charge >= 4) {
    if (profile.strategy === "Rush") {
      return "Battery is hot. Pull me over when you want the burst.";
    }
    if (profile.strategy === "Cozy") {
      return "We have enough charge. Cash it in gently when you're ready.";
    }
    return "Charge is ripe. One check-in turns this into momentum.";
  }

  return "Keep coding. I will keep the map moving quietly on the side.";
}

function shellNowLine(state: PersistedState): string {
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
      return `pressing ${latest.enemyName ?? "the line"}`;
    case "damage_taken":
      return `took a hit from ${latest.enemyName ?? "a foe"}`;
    case "victory":
      return `cleared ${latest.enemyName ?? "the room"}`;
    case "loot_collected":
      return latest.chestItem ? `bagged ${latest.chestItem}` : "bag got heavier";
    case "rest":
      return "cooling down";
    default:
      return latest.note ? compact(latest.note, 24) : latest.type.replaceAll("_", " ");
  }
}

function spriteForState(state: CompanionState): string[] {
  switch (state) {
    case "Scout":
      return ["  /\\_/\\\\ ", " ( o.o?)", "  > ^ < "];
    case "Battle":
      return ["  /\\_/\\\\ ", " ( >o< )", "  / ^ \\\\ "];
    case "Cast":
      return ["  /\\_/\\\\ ", " ( 0.0 )", "  / * \\\\ "];
    case "Hit":
      return ["  /\\_/\\\\ ", " ( x.x )", "  / ~ \\\\ "];
    case "Victory":
      return ["  /\\_/\\\\ ", " ( ^o^ )", "  \\_^_/ "];
    case "Rest":
      return ["  /\\_/\\\\ ", " ( -.- )", "  zZ zZ "];
    case "LevelUp":
      return ["  /\\_/\\\\ ", " ( *o* )", "  \\_^_/ "];
    case "Idle":
    default:
      return ["  /\\_/\\\\ ", " ( o.o )", "  > ^ < "];
  }
}

function border(width: number, left = "+", right = "+", fill = "-"): string {
  return `${left}${fill.repeat(width - 2)}${right}`;
}

function row(content: string, width: number): string {
  return `| ${content.padEnd(width - 4)} |`;
}

function bubble(text: string): string[] {
  const lines = wrapWords(text, BUBBLE_WIDTH);
  const width = Math.max(
    BUBBLE_WIDTH,
    ...lines.map((line) => line.length),
  ) + 4;

  return [
    `  .${"-".repeat(width - 2)}.`,
    ...lines.map((line) => ` / ${line.padEnd(width - 4)} \\`),
    ` '${"-".repeat(width - 2)}'`,
    "         \\",
  ];
}

function renderFull(state: PersistedState): string {
  const lines: string[] = [];
  const sprite = spriteForState(state.profile.state);
  const speech = bubble(shellMoodText(state));
  const recap = state.recentBursts[0];

  lines.push(...speech);
  lines.push(...sprite.map((line, index) => {
    const right =
      index === 0
        ? `${state.profile.name}`
        : index === 1
          ? `Lv.${state.profile.level} ${state.profile.dominantProfession}`
          : `${worldLabel(state)} • ${state.profile.strategy}`;
    return `${line.padEnd(12)}   ${right}`;
  }));
  lines.push("");
  lines.push(border(FULL_WIDTH));
  lines.push(row(`foe: ${compact(lastEnemy(state), FULL_WIDTH - 9)}`, FULL_WIDTH));
  lines.push(
    row(
      compact(
        `hp ${state.profile.hp}/${state.profile.maxHp}  charge ${state.profile.charge}  combo ${state.profile.combo}`,
        FULL_WIDTH - 4,
      ),
      FULL_WIDTH,
    ),
  );
  lines.push(row(`now: ${compact(shellNowLine(state), FULL_WIDTH - 9)}`, FULL_WIDTH));
  lines.push(
    row(
      recap
        ? compact(`burst: ${recap.grade} • ~${recap.estimatedTokens} tok`, FULL_WIDTH - 4)
        : compact(`burst: cache ~${state.burstBank.estimatedTokens} tok`, FULL_WIDTH - 4),
      FULL_WIDTH,
    ),
  );
  lines.push(
    row(
      compact(
        state.profile.lastChestItem ? `loot: ${state.profile.lastChestItem}` : "loot: bag still empty",
        FULL_WIDTH - 4,
      ),
      FULL_WIDTH,
    ),
  );
  lines.push(border(FULL_WIDTH));
  return lines.join("\n");
}

function renderNarrow(state: PersistedState): string {
  const glyph =
    state.profile.state === "Victory"
      ? "(^o^)"
      : state.profile.state === "Hit"
        ? "(x.x)"
        : state.profile.state === "Rest"
          ? "(-.-)"
          : "(o.o)";
  const summary = compact(shellNowLine(state), 18);
  const enemy = compact(lastEnemy(state), 16);
  return `${glyph} ${state.profile.name} Lv.${state.profile.level} | ${summary} | ${enemy}`;
}

export function renderBuddyShell(state: PersistedState, mode: ShellMode = "auto", columns?: number): string {
  const resolvedColumns = columns ?? process.stdout.columns ?? 80;
  const resolvedMode = mode === "auto" ? (resolvedColumns < 72 ? "narrow" : "full") : mode;
  return resolvedMode === "narrow" ? renderNarrow(state) : renderFull(state);
}
