import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  AcademyBridgeEnvelope,
  AcademyBridgeTarget,
  AcademyDispatchReceipt,
  AcademyHubManifest,
  AdapterPlatform,
  PersistedState,
  RawEvent,
} from "@academy/shared";
import { AcademyEngine } from "./engine.js";
import { mapClaudeHookInputToRawEvents } from "./adapters/claude.js";
import { mapCodexInputToRawEvents } from "./adapters/codex.js";
import { mapGeminiInputToRawEvents } from "./adapters/gemini.js";
import { mapGenericInputToRawEvents } from "./adapters/generic.js";
import { mapOpenAiCliInputToRawEvents } from "./adapters/openai.js";
import { mapQwenCodeInputToRawEvents } from "./adapters/qwen.js";
import { FileStore, resolveAcademyHomeDir, resolveStateFilePath } from "./store.js";

const HUB_MANIFEST_PATH = join(resolveAcademyHomeDir(), "hub.json");

function nowIso() {
  return new Date().toISOString();
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: string[] = [];
  request.setEncoding("utf8");
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return chunks.join("").replace(/^\uFEFF/, "");
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

export async function readHubManifest(): Promise<AcademyHubManifest | null> {
  try {
    const raw = await readFile(HUB_MANIFEST_PATH, "utf8");
    return JSON.parse(raw) as AcademyHubManifest;
  } catch {
    return null;
  }
}

async function writeHubManifest(manifest: AcademyHubManifest) {
  await mkdir(dirname(HUB_MANIFEST_PATH), { recursive: true });
  await writeFile(HUB_MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
}

export async function clearHubManifest() {
  await rm(HUB_MANIFEST_PATH, { force: true });
}

export function mapAdapterInputToRawEvents(adapter: AdapterPlatform, payload: unknown): RawEvent[] {
  switch (adapter) {
    case "claude-code":
      return mapClaudeHookInputToRawEvents(payload as Record<string, unknown>);
    case "codex-cli":
      return mapCodexInputToRawEvents(payload as Record<string, unknown>);
    case "gemini-cli":
      return mapGeminiInputToRawEvents(payload as Record<string, unknown>);
    case "openai-cli":
    case "openai-compatible":
      return mapOpenAiCliInputToRawEvents(payload as Record<string, unknown>);
    case "qwen-code":
      return mapQwenCodeInputToRawEvents(payload as Record<string, unknown>);
    case "generic-cli":
      return mapGenericInputToRawEvents(payload as Record<string, unknown>);
    default:
      return [];
  }
}

export async function applyRawEventsLocally(
  rawEvents: RawEvent[],
  target?: AcademyBridgeTarget,
): Promise<{ receipt: AcademyDispatchReceipt; snapshot: PersistedState }> {
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
      sessionId: rawEvents[0]?.sessionId,
    },
    snapshot: transaction.state,
  };
}

export async function dispatchBridgeEnvelopeLocally(
  envelope: AcademyBridgeEnvelope,
): Promise<{ receipt: AcademyDispatchReceipt; snapshot: PersistedState } | null> {
  const rawEvents = Array.isArray(envelope.events)
    ? envelope.events
    : envelope.adapter
      ? mapAdapterInputToRawEvents(envelope.adapter, envelope.payload)
      : [];

  if (rawEvents.length === 0) {
    return null;
  }

  return applyRawEventsLocally(rawEvents, envelope.target);
}

export async function sendBridgeEnvelopeToHub(
  envelope: AcademyBridgeEnvelope,
): Promise<AcademyDispatchReceipt | null> {
  const manifest = await readHubManifest();
  if (!manifest) {
    return null;
  }

  try {
    const response = await fetch(`http://${manifest.host}:${manifest.port}/v1/ingest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${manifest.token}`,
      },
      body: JSON.stringify({
        ...envelope,
        emittedAt: envelope.emittedAt ?? nowIso(),
      }),
    });

    if (!response.ok) {
      return null;
    }

    const receipt = (await response.json()) as AcademyDispatchReceipt;
    return receipt;
  } catch {
    return null;
  }
}

export async function dispatchBridgeEnvelope(
  envelope: AcademyBridgeEnvelope,
): Promise<{ receipt: AcademyDispatchReceipt; snapshot?: PersistedState }> {
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
        storePath: fallbackPath,
      },
    };
  }

  return local;
}

export interface AcademyHubServerHandle {
  manifest: AcademyHubManifest;
  close(): Promise<void>;
}

export async function startAcademyHub(options?: {
  host?: string;
  port?: number;
}): Promise<AcademyHubServerHandle> {
  const host = options?.host ?? "127.0.0.1";
  const port = options?.port ?? 0;
  const token = randomBytes(24).toString("hex");

  const server = createServer(async (request, response) => {
    const url = request.url ? new URL(request.url, `http://${host}`) : null;

    if (!url) {
      writeJson(response, 400, { error: "Missing URL" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      writeJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/state") {
      const workspace = url.searchParams.get("workspace") ?? undefined;
      const stateFile = url.searchParams.get("stateFile") ?? undefined;
      const store = new FileStore(resolveStateFilePath({ workspace, stateFile }));
      const state = await store.load();
      writeJson(response, 200, state);
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/ingest") {
      const authorization = request.headers.authorization ?? "";
      if (authorization !== `Bearer ${token}`) {
        writeJson(response, 401, { error: "Unauthorized" });
        return;
      }

      try {
        const raw = await readRequestBody(request);
        const envelope = JSON.parse(raw) as AcademyBridgeEnvelope;
        const result = await dispatchBridgeEnvelopeLocally(envelope);
        if (!result) {
          writeJson(response, 422, {
            accepted: false,
            via: "hub",
            rawEventCount: 0,
            storePath: resolveStateFilePath(envelope.target),
          } satisfies AcademyDispatchReceipt);
          return;
        }

        writeJson(response, 200, {
          ...result.receipt,
          via: "hub",
        } satisfies AcademyDispatchReceipt);
        return;
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "Invalid request body",
        });
        return;
      }
    }

    writeJson(response, 404, { error: "Not found" });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Academy Hub could not resolve its listening port.");
  }

  const manifest: AcademyHubManifest = {
    host,
    port: address.port,
    token,
    pid: process.pid,
    startedAt: nowIso(),
    version: 1,
  };

  await writeHubManifest(manifest);

  const close = async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    const current = await readHubManifest();
    if (current && current.pid === manifest.pid && current.port === manifest.port) {
      await clearHubManifest();
    }
  };

  return { manifest, close };
}

export function academyHubManifestPath(): string {
  return HUB_MANIFEST_PATH;
}

export function academyHubInstalled(): boolean {
  return existsSync(HUB_MANIFEST_PATH);
}
