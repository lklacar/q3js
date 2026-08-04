import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [, , serverBuildDirectory, qvmBuildDirectory, outputDirectory, configFile] = process.argv;
if (!serverBuildDirectory || !qvmBuildDirectory || !outputDirectory || !configFile) {
  throw new Error(
    "Usage: package-release.mjs <server-build-directory> <qvm-build-directory> <output-directory> <config-file>",
  );
}

const qvmNames = ["cgame.qvm", "qagame.qvm", "ui.qvm"];
const stagingDirectory = path.join(outputDirectory, ".package");
const stagingVmDirectory = path.join(stagingDirectory, "vm");
const gameDirectory = path.join(outputDirectory, "game", "q3js");
const temporaryPackage = path.join(gameDirectory, "q3js-game.pk3");

await rm(stagingDirectory, { recursive: true, force: true });
await mkdir(stagingVmDirectory, { recursive: true });
await mkdir(path.join(outputDirectory, "bin"), { recursive: true });
await mkdir(path.join(outputDirectory, "config"), { recursive: true });
await mkdir(gameDirectory, { recursive: true });

await copyFile(
  path.join(serverBuildDirectory, "ioq3ded.js"),
  path.join(outputDirectory, "bin", "ioq3ded.cjs"),
);
await copyFile(
  path.join(serverBuildDirectory, "ioq3ded.wasm"),
  path.join(outputDirectory, "bin", "ioq3ded.wasm"),
);
await copyFile(configFile, path.join(outputDirectory, "config", "q3js-defaults.cfg"));

const stableTimestamp = new Date("1980-01-01T00:00:00.000Z");
for (const qvmName of qvmNames) {
  const target = path.join(stagingVmDirectory, qvmName);
  await copyFile(path.join(qvmBuildDirectory, "baseq3", "vm", qvmName), target);
  await utimes(target, stableTimestamp, stableTimestamp);
}

const zip = spawnSync(
  "zip",
  ["-q", "-9", "-X", temporaryPackage, ...qvmNames.map((name) => `vm/${name}`)],
  {
    cwd: stagingDirectory,
    stdio: "inherit",
    env: { ...process.env, TZ: "UTC" },
  },
);
if (zip.status !== 0) {
  throw new Error(`zip exited with status ${zip.status ?? "unknown"}.`);
}

const packageBytes = await readFile(temporaryPackage);
const sha256 = createHash("sha256").update(packageBytes).digest("hex");
const filename = `q3js-game-${sha256.slice(0, 16)}.pk3`;
await rename(temporaryPackage, path.join(gameDirectory, filename));
await rm(stagingDirectory, { recursive: true, force: true });

await writeFile(
  path.join(outputDirectory, "manifest.json"),
  `${JSON.stringify({
    gamePackage: {
      filename,
      sha256,
      qvms: qvmNames,
    },
  }, null, 2)}\n`,
);
