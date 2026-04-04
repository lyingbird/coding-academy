import { AcademyEngine } from "@academy/runtime";
import { FileStore } from "@academy/runtime";
import { adapterCatalog, findAdapterDescriptor } from "@academy/runtime";
import { mapCodexInputToRawEvents } from "@academy/runtime";
import { mapClaudeHookInputToRawEvents } from "@academy/runtime";
import { mapGeminiInputToRawEvents } from "@academy/runtime";
import { mapGenericInputToRawEvents } from "@academy/runtime";
import { mapOpenAiCliInputToRawEvents } from "@academy/runtime";
import { mapQwenCodeInputToRawEvents } from "@academy/runtime";
import { performBurst, previewBurst, renderBurstResult } from "@academy/runtime";
import type { AdapterPlatform, PersistedState, RawEvent, StrategyMode } from "@academy/shared";
import { renderLobby, renderPersistedPanel, renderUpdatePanel } from "./renderer.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

async function readStdinText(): Promise<string> {
  const chunks: string[] = [];
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return chunks.join("").replace(/^\uFEFF/, "").trim();
}

function findWorkspaceRoot(startDir: string): string {
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

function resolveInputFile(filePath: string): string {
  if (isAbsolute(filePath)) {
    return filePath;
  }

  const fromCwd = resolve(process.cwd(), filePath);
  if (existsSync(fromCwd)) {
    return fromCwd;
  }

  return resolve(findWorkspaceRoot(process.cwd()), filePath);
}

function createEvent(sessionId: string, type: RawEvent["type"], payload?: Record<string, unknown>): RawEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    sessionId,
    payload,
  };
}

function printUpdate(update: ReturnType<AcademyEngine["process"]>, state: PersistedState) {
  console.log(renderUpdatePanel(update, state));
}

function isCommandAvailable(command: string): boolean {
  const checker = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(checker, [command], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

function probeExecutable(command: string): { ok: boolean; reason?: string } {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 5000,
  });

  if (result.status === 0) {
    return { ok: true };
  }

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  const lowered = output.toLowerCase();

  if (
    lowered.includes("access is denied") ||
    lowered.includes("not recognized") ||
    lowered.includes("no such file") ||
    lowered.includes("cannot find") ||
    lowered.includes("permission denied")
  ) {
    return {
      ok: false,
      reason: output || `Could not launch ${command}.`,
    };
  }

  return { ok: true };
}

async function processRawEvents(rawEvents: RawEvent[], printPanel = false) {
  const store = new FileStore();
  const renderedUpdates: { update: ReturnType<AcademyEngine["process"]>; snapshot: PersistedState }[] = [];
  const transaction = await store.transact(async (persisted) => {
    const engine = new AcademyEngine(persisted);

    for (const rawEvent of rawEvents) {
      const update = engine.process(rawEvent);
      if (printPanel && update.gameplayEvents.length > 0) {
        renderedUpdates.push({
          update,
          snapshot: engine.snapshot,
        });
      }
    }

    Object.assign(persisted, engine.snapshot);
    return null;
  });

  for (const rendered of renderedUpdates) {
    printUpdate(rendered.update, rendered.snapshot);
  }

  return {
    store,
    snapshot: transaction.state,
  };
}

async function runDemo() {
  const sessionId = `demo-${Date.now()}`;

  const script: RawEvent[] = [
    createEvent(sessionId, "session.started"),
    createEvent(sessionId, "prompt.submitted"),
    createEvent(sessionId, "search.performed"),
    createEvent(sessionId, "file.read"),
    createEvent(sessionId, "command.started", { command: "pnpm test", majorCheck: true }),
    createEvent(sessionId, "tests.failed"),
    createEvent(sessionId, "file.edited"),
    createEvent(sessionId, "patch.applied"),
    createEvent(sessionId, "tests.passed", { majorCheck: true }),
    createEvent(sessionId, "summary.written"),
    createEvent(sessionId, "task.completed"),
    createEvent(sessionId, "session.ended"),
  ];

  const result = await processRawEvents(script, true);
  console.log(`saved=${result.store.path}`);
}

async function runStatus() {
  const store = new FileStore();
  const persisted = await store.load();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(persisted, null, 2));
    return;
  }
  console.log(renderPersistedPanel(persisted));
}

async function runLobby() {
  const store = new FileStore();
  const persisted = await store.load();
  console.log(renderLobby(persisted));
}

async function runWatch() {
  const store = new FileStore();
  let lastRendered = "";

  while (true) {
    const persisted = await store.load();
    const panel = renderPersistedPanel(persisted);
    if (panel !== lastRendered) {
      console.clear();
      console.log(panel);
      console.log(`\nWatching ${store.path}`);
      lastRendered = panel;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

function parseStrategy(input?: string): StrategyMode | null {
  const normalized = input?.trim().toLowerCase();
  switch (normalized) {
    case "cozy":
      return "Cozy";
    case "flow":
      return "Flow";
    case "rush":
      return "Rush";
    default:
      return null;
  }
}

async function runStrategy() {
  const store = new FileStore();
  const persisted = await store.load();
  const selected = parseStrategy(process.argv[3]);

  if (!selected) {
    console.log(`Current strategy: ${persisted.profile.strategy}`);
    console.log("Available strategies: cozy, flow, rush");
    console.log("Use: pnpm strategy cozy|flow|rush");
    return;
  }

  persisted.profile.strategy = selected;
  await store.save(persisted);
  console.log(`Strategy set to ${selected}.`);
  console.log(renderPersistedPanel(persisted));
}

async function runBurst() {
  const store = new FileStore();
  const persisted = await store.load();
  const selected = parseStrategy(process.argv[3]);

  if (selected) {
    persisted.profile.strategy = selected;
  }

  const preview = previewBurst(persisted);
  const result = performBurst(persisted);
  await store.save(persisted);

  console.log(renderPersistedPanel(persisted));
  console.log();
  console.log(renderBurstResult(result));
  if (result.power > 0) {
    console.log(`Spent effort tag: ${preview.effortTag}`);
  }
}

async function runHook() {
  const input = await readStdinText();
  const hookPayload = JSON.parse(input);
  const rawEvents = mapClaudeHookInputToRawEvents(hookPayload);
  if (rawEvents.length === 0) {
    return;
  }
  await processRawEvents(rawEvents);
}

function parseAdapter(input?: string): AdapterPlatform | null {
  const normalized = input?.trim().toLowerCase();
  switch (normalized) {
    case "claude":
    case "claude-code":
      return "claude-code";
    case "codex":
    case "codex-cli":
      return "codex-cli";
    case "gemini":
    case "gemini-cli":
      return "gemini-cli";
    case "openai":
    case "openai-cli":
      return "openai-cli";
    case "qwen":
    case "qwen-code":
      return "qwen-code";
    case "generic":
    case "generic-cli":
      return "generic-cli";
    default:
      return null;
  }
}

function mapAdapterPayload(adapter: AdapterPlatform, payload: unknown): RawEvent[] {
  switch (adapter) {
    case "claude-code":
      return mapClaudeHookInputToRawEvents(payload as Record<string, unknown>);
    case "codex-cli":
      return mapCodexInputToRawEvents(payload as Record<string, unknown>);
    case "gemini-cli":
      return mapGeminiInputToRawEvents(payload as Record<string, unknown>);
    case "openai-cli":
      return mapOpenAiCliInputToRawEvents(payload as Record<string, unknown>);
    case "qwen-code":
      return mapQwenCodeInputToRawEvents(payload as Record<string, unknown>);
    case "generic-cli":
      return mapGenericInputToRawEvents(payload as Record<string, unknown>);
    default:
      return [];
  }
}

async function runIngest() {
  const adapter = parseAdapter(process.argv[3]);
  if (!adapter) {
    console.error("Use: pnpm ingest claude|codex|gemini|openai|qwen|generic");
    process.exitCode = 1;
    return;
  }

  const input = await readStdinText();
  const payload = JSON.parse(input);
  const rawEvents = mapAdapterPayload(adapter, payload);
  if (rawEvents.length === 0) {
    console.log(`No raw events mapped for ${adapter}.`);
    return;
  }

  const result = await processRawEvents(rawEvents);
  console.log(renderPersistedPanel(result.snapshot));
}

async function runRelayFile() {
  const adapter = parseAdapter(process.argv[3]);
  const filePath = process.argv[4];

  if (!adapter || !filePath) {
    console.error("Use: pnpm relay:file <claude|codex|gemini|openai|qwen|generic> <json-file>");
    process.exitCode = 1;
    return;
  }

  const resolvedPath = resolveInputFile(filePath);
  const raw = await readFile(resolvedPath, "utf8");
  const payload = JSON.parse(raw.replace(/^\uFEFF/, "").trim());
  const rawEvents = mapAdapterPayload(adapter, payload);
  if (rawEvents.length === 0) {
    console.log(`No raw events mapped for ${adapter}.`);
    return;
  }

  const result = await processRawEvents(rawEvents);
  console.log(renderPersistedPanel(result.snapshot));
}

async function runAdapters() {
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(adapterCatalog, null, 2));
    return;
  }
  console.log("Supported adapters:");
  for (const descriptor of adapterCatalog) {
    console.log(`- ${descriptor.aliases[0]} => ${descriptor.label}`);
  }
  console.log();
  console.log("Pipe JSON into one:");
  console.log("- pnpm relay codex");
  console.log("- pnpm relay gemini");
  console.log("- pnpm relay openai");
  console.log("- pnpm relay qwen");
  console.log();
  console.log("Or relay from a file:");
  console.log("- pnpm relay:file codex integrations/codex.sample.json");
}

async function runAdapterInfo() {
  const input = process.argv[3];
  if (!input) {
    console.error("Use: pnpm adapter <claude|codex|gemini|openai|qwen|generic>");
    process.exitCode = 1;
    return;
  }

  const descriptor = findAdapterDescriptor(input);
  if (!descriptor) {
    console.error(`Unknown adapter: ${input}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Adapter: ${descriptor.label}`);
  console.log(`Platform key: ${descriptor.platform}`);
  console.log(`Aliases: ${descriptor.aliases.join(", ")}`);
  console.log(`Description: ${descriptor.description}`);
  console.log(`Recommended hooks: ${descriptor.recommendedHooks.join(", ")}`);
  if (descriptor.sampleFile) {
    console.log(`Sample file: ${descriptor.sampleFile}`);
    console.log(`Try: pnpm relay:file ${descriptor.aliases[0]} ${descriptor.sampleFile}`);
  }
}

async function runScaffold() {
  const input = process.argv[3];
  const outputPath = process.argv[4];
  if (!input) {
    console.error("Use: pnpm scaffold <claude|codex|gemini|openai|qwen|generic> [output-file]");
    process.exitCode = 1;
    return;
  }

  const descriptor = findAdapterDescriptor(input);
  if (!descriptor || !descriptor.sampleFile) {
    console.error(`No scaffold sample available for ${input}.`);
    process.exitCode = 1;
    return;
  }

  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const sourcePath = resolve(workspaceRoot, descriptor.sampleFile);
  const targetPath = outputPath ? resolveInputFile(outputPath) : resolve(workspaceRoot, `${descriptor.aliases[0]}.bridge.json`);
  const raw = await readFile(sourcePath, "utf8");
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, raw, "utf8");
  console.log(`Scaffolded ${descriptor.label} sample to ${targetPath}`);
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildBridgePackageJson(descriptor: NonNullable<ReturnType<typeof findAdapterDescriptor>>) {
  const packageName = `coding-academy-${toSlug(descriptor.aliases[0])}-bridge`;
  return JSON.stringify(
    {
      name: packageName,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        sample: `node ./bridge.mjs ./sample-event.json`,
      },
    },
    null,
    2,
  );
}

function buildBridgeReadme(descriptor: NonNullable<ReturnType<typeof findAdapterDescriptor>>) {
  const sampleFile = descriptor.sampleFile ? descriptor.sampleFile.replace(/\\/g, "/") : "integrations/generic.sample.json";
  return `# ${descriptor.label} Bridge Starter

This folder is a lightweight starter wrapper for ${descriptor.label}.

## What It Does

- reads one payload JSON file
- pipes it into \`academy relay ${descriptor.aliases[0]}\`
- lets you swap the sample payload for real events from your target CLI

## Quick Start

\`\`\`bash
npm install
node ./bridge.mjs ./sample-event.json
\`\`\`

If you generated this starter inside the Coding Academy repo, it will automatically fall back to:

\`\`\`bash
pnpm --dir <repo-root> relay ${descriptor.aliases[0]}
\`\`\`

when a global \`academy\` binary is not installed yet.

## Replace The Sample

1. Inspect \`${sampleFile}\` in the main Coding Academy repo
2. Change \`bridge.mjs\` so it collects real events from your target CLI
3. Keep the final relay step the same:

\`\`\`bash
academy relay ${descriptor.aliases[0]}
\`\`\`

## Recommended Hook Shapes

${descriptor.recommendedHooks.map((hook) => `- \`${hook}\``).join("\n")}
`;
}

function buildBridgeScript(descriptor: NonNullable<ReturnType<typeof findAdapterDescriptor>>) {
  return `import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";

function findWorkspaceRoot(startDir) {
  let current = startDir;
  while (true) {
    if (existsSync(join(current, "pnpm-workspace.yaml")) || existsSync(join(current, ".git"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

async function main() {
  const inputFile = process.argv[2] ?? "./sample-event.json";
  const resolved = resolve(process.cwd(), inputFile);
  const raw = await readFile(resolved, "utf8");
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const command = workspaceRoot ? "pnpm" : "academy";
  const args = workspaceRoot
    ? ["--dir", workspaceRoot, "relay", "${descriptor.aliases[0]}"]
    : ["relay", "${descriptor.aliases[0]}"];

  const relay = spawn(command, args, {
    stdio: ["pipe", "inherit", "inherit"],
    shell: true,
  });

  relay.stdin.write(raw);
  relay.stdin.end();

  relay.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
}

void main();
`;
}

async function runBridgeInit() {
  const input = process.argv[3];
  const outputDir = process.argv[4];
  if (!input) {
    console.error("Use: pnpm bridge:init <claude|codex|gemini|openai|qwen|generic> [output-dir]");
    process.exitCode = 1;
    return;
  }

  const descriptor = findAdapterDescriptor(input);
  if (!descriptor) {
    console.error(`Unknown adapter: ${input}`);
    process.exitCode = 1;
    return;
  }

  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const targetDir = outputDir
    ? resolveInputFile(outputDir)
    : resolve(workspaceRoot, ".bridges", descriptor.aliases[0]);
  const sampleSource = descriptor.sampleFile
    ? resolve(workspaceRoot, descriptor.sampleFile)
    : resolve(workspaceRoot, "integrations", "generic.sample.json");

  await mkdir(targetDir, { recursive: true });
  await writeFile(resolve(targetDir, "package.json"), `${buildBridgePackageJson(descriptor)}\n`, "utf8");
  await writeFile(resolve(targetDir, "README.md"), buildBridgeReadme(descriptor), "utf8");
  await writeFile(resolve(targetDir, "bridge.mjs"), buildBridgeScript(descriptor), "utf8");

  const sampleRaw = await readFile(sampleSource, "utf8");
  await writeFile(resolve(targetDir, "sample-event.json"), sampleRaw, "utf8");

  console.log(`Initialized ${descriptor.label} bridge starter at ${targetDir}`);
  console.log(`Try: node ${resolve(targetDir, "bridge.mjs")} ${resolve(targetDir, "sample-event.json")}`);
}

function defaultExecutableForAdapter(adapter: AdapterPlatform): string | null {
  switch (adapter) {
    case "claude-code":
      return "claude";
    case "codex-cli":
      return "codex";
    case "gemini-cli":
      return "gemini";
    case "openai-cli":
      return "openai";
    case "qwen-code":
      return "qwen";
    default:
      return null;
  }
}

function inferPromptFromCommandArgs(args: string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    const next = args[index + 1];
    if (!current) {
      continue;
    }

    if (current === "-p" || current === "--prompt" || current === "--message" || current === "--query") {
      return next;
    }

    if (current.startsWith("--prompt=") || current.startsWith("--message=") || current.startsWith("--query=")) {
      return current.split("=").slice(1).join("=");
    }
  }

  return undefined;
}

function commandLooksLikeMajorCheck(commandText: string, args: string[]): boolean {
  const joined = `${commandText} ${args.join(" ")}`.toLowerCase();
  return ["test", "lint", "typecheck", "build", "check", "verify"].some((keyword) => joined.includes(keyword));
}

async function runWrap(providerOverride?: string) {
  const providerInput = providerOverride ?? process.argv[3];
  const adapter = parseAdapter(providerInput);
  if (!adapter || adapter === "generic-cli") {
    console.error("Use: pnpm wrap <claude|codex|gemini|openai|qwen> [--prompt <text>] [--summary <text>] [--cmd <command>] -- [args]");
    process.exitCode = 1;
    return;
  }

  let command = process.env[`ACADEMY_${adapter.replace(/-/g, "_").toUpperCase()}_CMD`] ?? defaultExecutableForAdapter(adapter);
  let prompt = "";
  let summary = "";
  let usedCustomCommand = false;

  const tailArgs = process.argv.slice(4);
  const childArgs: string[] = [];
  let passthrough = false;

  for (let index = 0; index < tailArgs.length; index += 1) {
    const current = tailArgs[index];
    const next = tailArgs[index + 1];
    if (passthrough) {
      childArgs.push(current);
      continue;
    }
    if (current === "--") {
      passthrough = true;
      continue;
    }
    if (current === "--cmd" && next) {
      command = next;
      usedCustomCommand = true;
      index += 1;
      continue;
    }
    if (current === "--prompt" && next) {
      prompt = next;
      index += 1;
      continue;
    }
    if (current === "--summary" && next) {
      summary = next;
      index += 1;
      continue;
    }

    childArgs.push(current);
  }

  prompt = prompt || inferPromptFromCommandArgs(childArgs) || "";
  if (!command) {
    console.error(`No default executable configured for ${adapter}. Pass --cmd <command>.`);
    process.exitCode = 1;
    return;
  }
  if (!isCommandAvailable(command)) {
    console.error(`Coding Academy could not find \`${command}\` on PATH for ${adapter}.`);
    console.error(`Install that CLI first, or test the wrapper with: pnpm wrap ${providerInput} --cmd node -- --version`);
    process.exitCode = 1;
    return;
  }
  if (!usedCustomCommand) {
    const probe = probeExecutable(command);
    if (!probe.ok) {
      console.error(`Coding Academy found \`${command}\`, but it is not ready to launch cleanly.`);
      console.error(probe.reason);
      console.error(`Try again after fixing ${command}, or test the game loop with: pnpm wrap ${providerInput} --cmd node -- --version`);
      process.exitCode = 1;
      return;
    }
  }

  const sessionId = `${adapter}-${Date.now()}`;
  const commandText = `${command} ${childArgs.join(" ")}`.trim();
  const majorCheck = commandLooksLikeMajorCheck(command, childArgs);

  await processRawEvents([
    createEvent(sessionId, "session.started", { platform: adapter }),
    ...(prompt ? [createEvent(sessionId, "prompt.submitted", { prompt, platform: adapter })] : []),
    createEvent(sessionId, "command.started", {
      command: commandText,
      platform: adapter,
      majorCheck,
    }),
  ]);

  const child = spawn(command, childArgs, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  const exitCode: number = await new Promise((resolve) => {
    child.on("exit", (code) => resolve(code ?? 0));
    child.on("error", () => resolve(1));
  });

  const endingEvents: RawEvent[] = [
    createEvent(
      sessionId,
      exitCode === 0 ? "command.succeeded" : "command.failed",
      {
        command: commandText,
        platform: adapter,
        majorCheck,
        exitCode,
      },
    ),
  ];

  if (exitCode === 0) {
    if (summary) {
      endingEvents.push(createEvent(sessionId, "summary.written", { summary, platform: adapter }));
    }
    endingEvents.push(createEvent(sessionId, "task.completed", { platform: adapter }));
  }

  endingEvents.push(createEvent(sessionId, "session.ended", { platform: adapter }));

  const result = await processRawEvents(endingEvents);
  console.log(renderPersistedPanel(result.snapshot));
  process.exitCode = exitCode;
}

async function main() {
  const command = process.argv[2] ?? "demo";
  switch (command) {
    case "start":
    case "lobby":
      await runLobby();
      return;
    case "demo":
      await runDemo();
      return;
    case "status":
    case "panel":
      await runStatus();
      return;
    case "watch":
      await runWatch();
      return;
    case "strategy":
      await runStrategy();
      return;
    case "burst":
    case "check-in":
    case "checkin":
      await runBurst();
      return;
    case "hook":
      await runHook();
      return;
    case "ingest":
    case "relay":
      await runIngest();
      return;
    case "relay-file":
      await runRelayFile();
      return;
    case "adapters":
      await runAdapters();
      return;
    case "adapter":
      await runAdapterInfo();
      return;
    case "scaffold":
      await runScaffold();
      return;
    case "bridge:init":
      await runBridgeInit();
      return;
    case "wrap":
      await runWrap();
      return;
    case "wrap-provider":
      await runWrap(process.argv[3]);
      return;
    default:
      console.error(`Unknown command: ${command}`);
      process.exitCode = 1;
  }
}

void main();
