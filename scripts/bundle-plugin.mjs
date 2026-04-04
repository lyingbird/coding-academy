import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const pluginDir = join(rootDir, "packages", "plugin-claude");
const distRoot = join(rootDir, "dist");
const bundledPluginDir = join(distRoot, "claude-plugin", "coding-academy");
const marketplaceDir = join(distRoot, "claude-marketplace");
const shareablePluginDir = join(rootDir, "plugins", "coding-academy");
const repoMarketplaceDir = join(rootDir, ".claude-plugin");

function run(command, args, cwd = rootDir) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`${command} ${args.join(" ")} failed with code ${code ?? -1}`));
    });
  });
}

async function copyIfExists(relativePath) {
  const source = join(pluginDir, relativePath);
  const target = join(bundledPluginDir, relativePath);
  await cp(source, target, { recursive: true, force: true });
}

async function main() {
  await run("pnpm", ["--filter", "@academy/plugin-claude", "build"]);

  await rm(bundledPluginDir, { recursive: true, force: true });
  await rm(marketplaceDir, { recursive: true, force: true });
  await rm(shareablePluginDir, { recursive: true, force: true });
  await mkdir(bundledPluginDir, { recursive: true });
  await mkdir(marketplaceDir, { recursive: true });
  await mkdir(shareablePluginDir, { recursive: true });
  await mkdir(repoMarketplaceDir, { recursive: true });

  for (const relativePath of [".claude-plugin", "bin", "commands", "hooks", "README.md"]) {
    await copyIfExists(relativePath);
    await cp(join(pluginDir, relativePath), join(shareablePluginDir, relativePath), {
      recursive: true,
      force: true,
    });
  }

  const distributedPluginPackage = {
    name: "coding-academy",
    private: true,
    type: "module",
  };

  await writeFile(join(bundledPluginDir, "package.json"), `${JSON.stringify(distributedPluginPackage, null, 2)}\n`, "utf8");
  await writeFile(join(shareablePluginDir, "package.json"), `${JSON.stringify(distributedPluginPackage, null, 2)}\n`, "utf8");

  const marketplace = {
    name: "coding-academy",
    owner: {
      name: "Coding Academy",
    },
    metadata: {
      description: "Lightweight hero companion plugins for Claude Code.",
      pluginRoot: ".",
    },
    plugins: [
      {
        name: "coding-academy",
        source: "./plugins/coding-academy",
        description: "A lightweight CLI hero companion for Claude Code.",
      },
    ],
  };

  await writeFile(join(marketplaceDir, "marketplace.json"), `${JSON.stringify(marketplace, null, 2)}\n`, "utf8");
  await writeFile(join(repoMarketplaceDir, "marketplace.json"), `${JSON.stringify(marketplace, null, 2)}\n`, "utf8");
  console.log(`Bundled plugin: ${bundledPluginDir}`);
  console.log(`Marketplace manifest: ${join(marketplaceDir, "marketplace.json")}`);
  console.log(`Shareable repo plugin: ${shareablePluginDir}`);
  console.log(`Repo marketplace manifest: ${join(repoMarketplaceDir, "marketplace.json")}`);
}

void main();
