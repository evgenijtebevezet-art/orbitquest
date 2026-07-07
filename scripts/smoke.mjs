import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const web = resolve(root, "apps/web");

const manifest = JSON.parse(await readFile(resolve(web, "public/manifest.webmanifest"), "utf8"));
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "./");
assert.ok(manifest.icons.every((icon) => icon.src.startsWith("./")), "icons must be relative");

const index = await readFile(resolve(web, "index.html"), "utf8");
assert.match(index, /manifest\.webmanifest/);
assert.match(index, /viewport-fit=cover/);
assert.doesNotMatch(index, /(href|src)="\/(?!\/)/, "no root-absolute paths in index.html");

const sw = await readFile(resolve(web, "public/sw.js"), "utf8");
const shellMatch = sw.match(/const SHELL = \[([^\]]+)\]/);
assert.ok(shellMatch, "SHELL list present in sw.js");
const shellEntries = [...shellMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
assert.ok(
  shellEntries.length >= 3 && shellEntries.every((entry) => entry.startsWith("./")),
  "SHELL entries must be relative",
);
assert.doesNotMatch(sw, /caches\.match\("\/"\)/, "offline fallback must be relative");

const viteConfig = await readFile(resolve(web, "vite.config.ts"), "utf8");
assert.match(viteConfig, /base:\s*"\.\/"/);

const bundle = await readFile(resolve(web, "dist/index.html"), "utf8");
assert.match(bundle, /<div id="root"><\/div>/);
await stat(resolve(web, "dist/sw.js"));

const precache = JSON.parse(await readFile(resolve(web, "dist/precache.json"), "utf8"));
assert.ok(Array.isArray(precache) && precache.includes("./index.html"), "precache.json lists index.html");
assert.ok(precache.every((entry) => entry.startsWith("./")), "precache entries must be relative");

const contentIndex = JSON.parse(await readFile(resolve(root, "content/index.json"), "utf8"));
const storageSource = await readFile(resolve(web, "src/profile/storage.ts"), "utf8");
const versionMatch = storageSource.match(/APP_CONTENT_VERSION = "([^"]+)"/);
assert.ok(versionMatch, "APP_CONTENT_VERSION present in storage.ts");
assert.equal(versionMatch[1], contentIndex.contentVersion, "APP_CONTENT_VERSION must match content/index.json");

const sources = await Promise.all([
  readFile(resolve(web, "src/App.tsx"), "utf8"),
  readFile(resolve(root, "apps/api/src/server.ts"), "utf8"),
]);
assert.doesNotMatch(sources.join("\n"), /(AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9_-]{20,})/);

console.log("OrbitQuest PWA smoke checks passed");
