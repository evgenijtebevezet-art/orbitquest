import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const web = resolve(root, "apps/web");

const manifest = JSON.parse(await readFile(resolve(web, "public/manifest.webmanifest"), "utf8"));
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "/");

const index = await readFile(resolve(web, "index.html"), "utf8");
assert.match(index, /manifest\.webmanifest/);
assert.match(index, /viewport-fit=cover/);

const bundle = await readFile(resolve(web, "dist/index.html"), "utf8");
assert.match(bundle, /<div id="root"><\/div>/);
await stat(resolve(web, "dist/sw.js"));

const sources = await Promise.all([
  readFile(resolve(web, "src/App.tsx"), "utf8"),
  readFile(resolve(root, "apps/api/src/server.ts"), "utf8"),
]);
assert.doesNotMatch(sources.join("\n"), /(AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9_-]{20,})/);

console.log("OrbitQuest PWA smoke checks passed");
