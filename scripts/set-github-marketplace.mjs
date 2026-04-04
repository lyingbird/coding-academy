import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const settingsPath = join(rootDir, ".claude", "settings.json");

async function main() {
  const repo = process.argv[2];

  if (!repo || !repo.includes("/")) {
    console.error("Usage: node ./scripts/set-github-marketplace.mjs OWNER/REPO");
    process.exit(1);
  }

  const existing = JSON.parse(await readFile(settingsPath, "utf8"));
  existing.extraKnownMarketplaces = {
    ...(existing.extraKnownMarketplaces ?? {}),
    "coding-academy": {
      source: "github",
      repo,
    },
  };
  existing.enabledPlugins = {
    ...(existing.enabledPlugins ?? {}),
    "coding-academy@coding-academy": true,
  };

  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
  console.log(`Updated ${settingsPath} to use GitHub marketplace ${repo}`);
}

void main();
