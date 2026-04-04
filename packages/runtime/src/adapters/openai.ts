import type { RawEvent } from "@academy/shared";

export interface OpenAiCliAdapterInput {
  session_id?: string;
  event?: "session_start" | "prompt" | "read" | "search" | "edit" | "patch" | "check_ok" | "check_fail" | "summary" | "finish";
  prompt?: string;
  target?: string;
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

export function mapOpenAiCliInputToRawEvents(input: OpenAiCliAdapterInput): RawEvent[] {
  switch (input.event) {
    case "session_start":
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
    case "check_ok":
      return make(input.session_id, input.majorCheck === true ? "tests.passed" : "command.succeeded", {
        command: input.command,
        majorCheck: input.majorCheck === true,
      });
    case "check_fail":
      return make(input.session_id, input.majorCheck === true ? "tests.failed" : "command.failed", {
        command: input.command,
        majorCheck: input.majorCheck === true,
      });
    case "summary":
      return make(input.session_id, "summary.written", { summary: input.summary });
    case "finish":
      return make(input.session_id, "session.ended");
    default:
      return [];
  }
}
