import type { RawEvent } from "@academy/shared";

export interface CodexAdapterInput {
  sessionId?: string;
  event?: "session_start" | "prompt" | "read" | "search" | "edit" | "patch" | "command_start" | "command_ok" | "command_fail" | "summary" | "stop";
  cwd?: string;
  prompt?: string;
  file?: string;
  query?: string;
  command?: string;
  summary?: string;
  majorCheck?: boolean;
}

function nowIso() {
  return new Date().toISOString();
}

function make(sessionId: string | undefined, type: RawEvent["type"], payload?: Record<string, unknown>): RawEvent[] {
  if (!sessionId) {
    return [];
  }
  return [{ type, sessionId, timestamp: nowIso(), payload }];
}

export function mapCodexInputToRawEvents(input: CodexAdapterInput): RawEvent[] {
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
        majorCheck: input.majorCheck === true,
      });
    case "command_fail":
      return make(input.sessionId, input.majorCheck === true ? "tests.failed" : "command.failed", {
        command: input.command,
        majorCheck: input.majorCheck === true,
      });
    case "summary":
      return make(input.sessionId, "summary.written", { summary: input.summary });
    case "stop":
      return make(input.sessionId, "session.ended");
    default:
      return [];
  }
}
