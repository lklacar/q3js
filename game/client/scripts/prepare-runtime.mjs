import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [, , sourceDirectory, outputDirectory] = process.argv;
if (!sourceDirectory || !outputDirectory) {
  throw new Error("Usage: prepare-runtime.mjs <source-directory> <output-directory>");
}

const sourceJavaScript = path.join(sourceDirectory, "ioquake3.js");
const outputJavaScript = path.join(outputDirectory, "ioquake3.js");
const directoryProbe = 'new URL(".",_scriptName).href';
const bundlerSafeDirectoryProbe = '_scriptName.slice(0,_scriptName.lastIndexOf("/")+1)';

const generatedJavaScript = await readFile(sourceJavaScript, "utf8");
const occurrences = generatedJavaScript.split(directoryProbe).length - 1;
if (occurrences !== 1) {
  throw new Error(
    `Expected exactly one Emscripten script-directory probe, found ${occurrences}.`,
  );
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(
  outputJavaScript,
  generatedJavaScript.replace(directoryProbe, bundlerSafeDirectoryProbe),
);
await copyFile(
  path.join(sourceDirectory, "ioquake3.wasm"),
  path.join(outputDirectory, "ioquake3.wasm"),
);
