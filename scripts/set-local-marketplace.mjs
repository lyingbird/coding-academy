import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const settingsPath = join(rootDir, ".claude", "settings.json");

async function main() {
  const settings = {
    extraKnownMarketplaces: {
      "coding-academy": {
        source: "directory",
        path: ".",
      },
    },
    enabledPlugins: {
      "coding-academy@coding-academy": true,
    },
  };

  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  console.log(`Updated ${settingsPath} to use local directory marketplace`);
}

void main();
