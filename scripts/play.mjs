import { spawnSync } from "node:child_process";

const rootCwd = process.cwd();

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: rootCwd,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    shell: process.platform === "win32",
    timeout: options.timeout ?? 15000,
  });
}

function printSection(title, lines = []) {
  const width = 58;
  const bar = "=".repeat(Math.max(0, width - title.length - 2));
  console.log(`\n[${title}]${bar}`);
  for (const line of lines) {
    console.log(line);
  }
}

function commandExists() {
  const result = run("claude", ["--version"]);
  return result.status === 0;
}

function checkClaudeHealth() {
  if (!commandExists()) {
    return {
      ok: false,
      reason: "Claude CLI is not installed or not on PATH.",
      nextStep: "Install Claude Code first, then run `pnpm play` again.",
    };
  }

  const authStatus = run("claude", ["auth", "status"]);
  if (authStatus.status !== 0) {
    const message = `${authStatus.stdout ?? ""}${authStatus.stderr ?? ""}`.trim();
    return {
      ok: false,
      reason: message || "Claude auth status check failed.",
      nextStep: "Run `claude auth login` and try again.",
    };
  }

  const probe = run("claude", ["-p", "Reply with exactly OK."], { timeout: 20000 });
  if (probe.status !== 0) {
    const message = `${probe.stdout ?? ""}${probe.stderr ?? ""}`.trim();
    if (message.includes("does not have access to Claude")) {
      return {
        ok: false,
        reason: "Claude is logged in, but the current organization cannot start sessions.",
        nextStep: "Run `claude auth logout` and `claude auth login`, then switch to an org with Claude access.",
      };
    }

    return {
      ok: false,
      reason: message || "Claude session probe failed.",
      nextStep: "Fix the Claude CLI session first, then rerun `pnpm play`.",
    };
  }

  return {
    ok: true,
  };
}

function startClaude() {
  printSection("Coding Academy", [
    "Claude session looks healthy.",
    "Launching real adventure mode now...",
    "Tip: once Claude opens, use `/academy:status` to inspect your hero.",
  ]);

  const session = spawnSync("claude", [], {
    cwd: rootCwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  process.exit(session.status ?? 0);
}

function startDemo(fallbackReason, nextStep) {
  printSection("Coding Academy", [
    "Real Claude mode is unavailable, so the game is dropping into demo mode.",
    `Reason: ${fallbackReason}`,
    `Fix later: ${nextStep}`,
  ]);

  const demo = spawnSync("pnpm", ["demo"], {
    cwd: rootCwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  process.exit(demo.status ?? 0);
}

const health = checkClaudeHealth();

if (health.ok) {
  startClaude();
} else {
  startDemo(health.reason, health.nextStep);
}
