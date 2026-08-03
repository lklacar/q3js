import { build } from "esbuild";
import { fileURLToPath } from "node:url";

await build({
  entryPoints: ["src/config.ts", "src/main.ts", "src/gateway.ts", "src/master-heartbeat.ts"],
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
