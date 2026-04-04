import type { RawEvent } from "@academy/shared";

export interface GeminiAdapterInput {
  session_id?: string;
  phase?: "start" | "prompt" | "read" | "search" | "edit" | "patch" | "validate_ok" | "validate_fail" | "summary" | "finish";
  prompt?: string;
  target?: string;
  query?: string;
  command?: string;
  summary?: string;
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

export function mapGeminiInputToRawEvents(input: GeminiAdapterInput): RawEvent[] {
  switch (input.phase) {
    case "start":
      return make(input.session_id, "session.started");
    case "prompt":
      return make(input.session_id, "prompt.submitted", { prompt: input.prompt });
    case "read":
      return make(input.session_id, "file.read", { target: input.target });
    case "search":
      return make(input.session_id, "search.performed", { query: input.query });
    case "edit":
      return make(input.session_id, "file.edited", { target: input.target });
    case "patch":
      return make(input.session_id, "patch.applied", { target: input.target });
    case "validate_ok":
      return make(input.session_id, "tests.passed", { command: input.command, majorCheck: true });
    case "validate_fail":
      return make(input.session_id, "tests.failed", { command: input.command, majorCheck: true });
    case "summary":
      return make(input.session_id, "summary.written", { summary: input.summary });
    case "finish":
      return make(input.session_id, "session.ended");
    default:
      return [];
  }
}
