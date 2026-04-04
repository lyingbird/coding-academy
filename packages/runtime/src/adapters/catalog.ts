import type { AdapterPlatform } from "@academy/shared";

export interface AdapterDescriptor {
  platform: AdapterPlatform;
  label: string;
  aliases: string[];
  description: string;
  sampleFile?: string;
  recommendedHooks: string[];
}

export const adapterCatalog: AdapterDescriptor[] = [
  {
    platform: "claude-code",
    label: "Claude Code",
    aliases: ["claude", "claude-code"],
    description: "Maps Claude Code hook payloads into academy raw events.",
    sampleFile: undefined,
    recommendedHooks: ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop"],
  },
  {
    platform: "codex-cli",
    label: "Codex CLI",
    aliases: ["codex", "codex-cli"],
    description: "Starter bridge for Codex-style prompt, edit, patch, and command lifecycle payloads.",
    sampleFile: "integrations/codex.sample.json",
    recommendedHooks: ["prompt", "read", "edit", "patch", "command_ok", "command_fail"],
  },
  {
    platform: "gemini-cli",
    label: "Gemini CLI",
    aliases: ["gemini", "gemini-cli"],
    description: "Starter bridge for Gemini-style validate and summary payloads.",
    sampleFile: "integrations/gemini.sample.json",
    recommendedHooks: ["prompt", "read", "edit", "validate_ok", "validate_fail", "summary"],
  },
  {
    platform: "openai-cli",
    label: "OpenAI-Compatible CLI",
    aliases: ["openai", "openai-cli"],
    description: "Generic wrapper for OpenAI-compatible shells that can emit simple lifecycle JSON.",
    sampleFile: "integrations/openai.sample.json",
    recommendedHooks: ["prompt", "read", "edit", "check_ok", "check_fail", "summary"],
  },
  {
    platform: "qwen-code",
    label: "Qwen / Domestic Coding CLI",
    aliases: ["qwen", "qwen-code"],
    description: "Bridge starter for Qwen-style coding CLIs or domestic wrappers that expose phase events.",
    sampleFile: "integrations/qwen.sample.json",
    recommendedHooks: ["prompt", "search", "read", "edit", "validate_ok", "validate_fail"],
  },
  {
    platform: "generic-cli",
    label: "Generic JSON Bridge",
    aliases: ["generic", "generic-cli"],
    description: "Lowest-friction path: emit normalized RawEvent arrays directly.",
    sampleFile: "integrations/generic.sample.json",
    recommendedHooks: ["events[]"],
  },
];

export function findAdapterDescriptor(input: string): AdapterDescriptor | undefined {
  const normalized = input.trim().toLowerCase();
  return adapterCatalog.find((descriptor) => descriptor.aliases.includes(normalized));
}
