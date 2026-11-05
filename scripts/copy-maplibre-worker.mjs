import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = resolve(root, "node_modules/maplibre-gl/dist");
const targetDir = resolve(root, "public/maplibre");

await mkdir(targetDir, { recursive: true });

for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(resolve(sourceDir, file), resolve(targetDir, file));
}

console.log("Prepared MapLibre worker assets.");
