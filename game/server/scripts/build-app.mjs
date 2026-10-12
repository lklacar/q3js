import { build } from "esbuild";
import { fileURLToPath } from "node:url";

await build({
  entryPoints: [
    "src/ban-list.ts",
    "src/config.ts",
    "src/main.ts",
    "src/native-control.ts",
    "src/master-heartbeat.ts",
    "src/player-connection-reporter.ts",
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  outdir: "dist/app",
  outExtension: { ".js": ".mjs" },
  absWorkingDir: fileURLToPath(new URL("..", import.meta.url)),
});
