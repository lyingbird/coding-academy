import { dispatchBridgeEnvelope } from "../../runtime/src/index.js";

async function readStdinText(): Promise<string> {
  const chunks: string[] = [];
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return chunks.join("");
}

async function main() {
  const input = await readStdinText();
  const payload = JSON.parse(input);
  await dispatchBridgeEnvelope({
    adapter: "claude-code",
    payload,
    source: "claude-hook",
    target: {
      workspace: typeof payload.cwd === "string" ? payload.cwd : process.cwd(),
    },
  });
}

void main();
