// Собирает список файлов dist в precache.json для service worker (офлайн-прекеш по спеке)
// и штампует sw.js версией сборки — иначе браузер не видит обновлений и офлайн-кеш залипает.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";

const dist = resolve(import.meta.dirname, "../apps/web/dist");
const entries = await readdir(dist, { recursive: true, withFileTypes: true });
const files = entries
  .filter((entry) => entry.isFile())
  .map((entry) => "./" + relative(dist, resolve(entry.parentPath, entry.name)).replaceAll("\\", "/"))
  .filter((path) => path !== "./precache.json");

files.unshift("./");
await writeFile(resolve(dist, "precache.json"), JSON.stringify(files, null, 2) + "\n", "utf8");
console.log(`precache.json: ${files.length} entries`);

const swPath = resolve(dist, "sw.js");
const buildId = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const sw = await readFile(swPath, "utf8");
await writeFile(swPath, sw.replace('"orbitquest-shell-v2"', `"orbitquest-shell-${buildId}"`), "utf8");
console.log(`sw.js stamped: orbitquest-shell-${buildId}`);
