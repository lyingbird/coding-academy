import type { RawEvent } from "@academy/shared";

export interface QwenCodeAdapterInput {
  conversation_id?: string;
  phase?: "start" | "prompt" | "search" | "read" | "edit" | "patch" | "validate_ok" | "validate_fail" | "summary" | "finish";
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

export function mapQwenCodeInputToRawEvents(input: QwenCodeAdapterInput): RawEvent[] {
  switch (input.phase) {
    case "start":
      return make(input.conversation_id, "session.started");
    case "prompt":
      return make(input.conversation_id, "prompt.submitted", { prompt: input.prompt });
    case "search":
      return make(input.conversation_id, "search.performed", { query: input.query });
    case "read":
      return make(input.conversation_id, "file.read", { target: input.target });
    case "edit":
      return make(input.conversation_id, "file.edited", { target: input.target });
    case "patch":
      return make(input.conversation_id, "patch.applied", { target: input.target });
    case "validate_ok":
      return make(input.conversation_id, "tests.passed", { command: input.command, majorCheck: true });
    case "validate_fail":
      return make(input.conversation_id, "tests.failed", { command: input.command, majorCheck: true });
    case "summary":
      return make(input.conversation_id, "summary.written", { summary: input.summary });
    case "finish":
      return make(input.conversation_id, "session.ended");
    default:
      return [];
  }
}
