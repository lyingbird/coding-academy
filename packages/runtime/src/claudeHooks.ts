import type { RawEvent } from "@academy/shared";

interface ClaudeHookInput {
  session_id?: string;
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
  prompt?: string;
  cwd?: string;
  last_assistant_message?: string;
}

function nowIso() {
  return new Date().toISOString();
}

function bashCommand(input: ClaudeHookInput): string {
  const command = input.tool_input?.command;
  return typeof command === "string" ? command : "";
}

function toolName(input: ClaudeHookInput): string {
  return typeof input.tool_name === "string" ? input.tool_name : "";
}

function fileTarget(input: ClaudeHookInput): string | undefined {
  const candidateKeys = ["file_path", "target_file", "filePath", "path"];
  for (const key of candidateKeys) {
    const value = input.tool_input?.[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function looksLikeTestCommand(command: string): boolean {
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
    "uv run pytest",
  ].some((token) => normalized.includes(token));
}

function makeRawEvent(
  input: ClaudeHookInput,
  type: RawEvent["type"],
  payload?: Record<string, unknown>,
): RawEvent | null {
  if (!input.session_id) {
    return null;
  }

  return {
    type,
    sessionId: input.session_id,
    timestamp: nowIso(),
    payload,
  };
}

export function mapClaudeHookInputToRawEvents(input: ClaudeHookInput): RawEvent[] {
  const eventName = input.hook_event_name;
  if (!eventName) {
    return [];
  }

  switch (eventName) {
    case "SessionStart": {
      const event = makeRawEvent(input, "session.started", {
        cwd: input.cwd,
      });
      return event ? [event] : [];
    }
    case "UserPromptSubmit": {
      const event = makeRawEvent(input, "prompt.submitted", {
        prompt: input.prompt,
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
            ...input.tool_input,
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
            ...input.tool_input,
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
            ...input.tool_input,
          });
          return event ? [event] : [];
        }
        case "Bash": {
          const command = bashCommand(input);
          const event = makeRawEvent(input, "command.started", {
            command,
            majorCheck: looksLikeTestCommand(command),
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
            ...input.tool_input,
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
            ...input.tool_input,
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
            ...input.tool_response,
          });
          return patchEvent ? [patchEvent] : [];
        }
        case "Bash": {
          const command = bashCommand(input);
          const type = looksLikeTestCommand(command) ? "tests.passed" : "command.succeeded";
          const event = makeRawEvent(input, type, {
            command,
            majorCheck: looksLikeTestCommand(command),
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
          majorCheck: looksLikeTestCommand(command),
        });
        return event ? [event] : [];
      }
      return [];
    }
    case "Stop": {
      const events: RawEvent[] = [];
      const summaryEvent = makeRawEvent(input, "summary.written", {
        summary: input.last_assistant_message,
      });
      if (summaryEvent) {
        events.push(summaryEvent);
      }
      const completionEvent = makeRawEvent(input, "task.completed", {
        summary: input.last_assistant_message,
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
