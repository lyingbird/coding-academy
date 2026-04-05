import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/academy-hook.ts", "src/academy-status.ts", "src/academy-check-in.ts"],
  format: ["esm"],
  outDir: "bin",
  clean: true,
  noExternal: [/@academy\/runtime/, /@academy\/shared/],
});
